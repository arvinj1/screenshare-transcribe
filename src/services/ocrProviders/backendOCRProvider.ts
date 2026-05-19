import { runtimeConfig } from '../../config/runtime'
import type { OCRInput, OCRProvider, OCRRecognitionResult } from './types'

interface OCRSessionResponse {
  sessionId: string
  eventsUrl?: string
}

interface OCRFrameResult {
  frameId?: string
  text: string
  rawText?: string
  confidence: number
}

interface PendingResult {
  resolve: (value: OCRRecognitionResult) => void
  reject: (reason?: unknown) => void
}

function apiUrl(path: string): string {
  if (!runtimeConfig.ocr.apiBaseUrl) return path
  return `${runtimeConfig.ocr.apiBaseUrl.replace(/\/+$/, '')}${path}`
}

function createAuthHeaders(): Record<string, string> {
  if (!runtimeConfig.ocr.authToken) return {}
  return { Authorization: `Bearer ${runtimeConfig.ocr.authToken}` }
}

async function toCanvas(input: OCRInput): Promise<HTMLCanvasElement> {
  if (typeof input !== 'string' && 'getContext' in input) {
    return input
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context unavailable')
  }

  if (typeof input === 'string') {
    const img = new Image()
    img.src = input
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image input'))
    })
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    return canvas
  }

  canvas.width = input.width
  canvas.height = input.height
  ctx.putImageData(input, 0, 0)
  return canvas
}

async function toJpegBase64(input: OCRInput): Promise<string> {
  const canvas = await toCanvas(input)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
  return dataUrl.split(',')[1] ?? ''
}

export class BackendOCRProvider implements OCRProvider {
  private sessionId: string | null = null
  private eventSource: EventSource | null = null
  private pendingResults = new Map<string, PendingResult>()
  private disposed = false

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    retries = runtimeConfig.ocr.maxRetries
  ): Promise<Response> {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), runtimeConfig.ocr.requestTimeoutMs)

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        })
        window.clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Backend OCR request failed (${response.status})`)
        }

        return response
      } catch (error) {
        window.clearTimeout(timeoutId)
        lastError = error
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Backend OCR request failed')
  }

  private openEventStream(eventsUrl: string): void {
    if (runtimeConfig.ocr.realtimeTransport !== 'sse') return

    const url = new URL(eventsUrl, window.location.origin)
    if (runtimeConfig.ocr.authToken) {
      url.searchParams.set('token', runtimeConfig.ocr.authToken)
    }

    this.eventSource = new EventSource(url.toString())
    this.eventSource.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as OCRFrameResult
        const frameId = data.frameId
        if (!frameId) return

        const pending = this.pendingResults.get(frameId)
        if (!pending) return

        this.pendingResults.delete(frameId)
        pending.resolve({
          text: (data.text || '').trim(),
          rawText: data.rawText ?? data.text ?? '',
          confidence: data.confidence ?? 0,
        })
      } catch {
        // Ignore malformed events from backend streams.
      }
    }
  }

  private waitForRealtimeResult(frameId: string): Promise<OCRRecognitionResult> {
    return new Promise<OCRRecognitionResult>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingResults.delete(frameId)
        reject(new Error('Timed out waiting for OCR realtime event'))
      }, runtimeConfig.ocr.requestTimeoutMs)

      this.pendingResults.set(frameId, {
        resolve: (value) => {
          window.clearTimeout(timeoutId)
          resolve(value)
        },
        reject: (reason) => {
          window.clearTimeout(timeoutId)
          reject(reason)
        },
      })
    })
  }

  async initialize(): Promise<void> {
    if (this.sessionId || this.disposed) return

    const response = await this.fetchWithTimeout(apiUrl('/api/ocr/sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders(),
      },
      body: JSON.stringify({
        sfuProvider: runtimeConfig.sfu.provider,
        sfuDeployment: runtimeConfig.sfu.deployment,
        roomPrefix: runtimeConfig.sfu.roomPrefix,
        realtimeTransport: runtimeConfig.ocr.realtimeTransport,
        privacy: {
          redactLogs: runtimeConfig.privacy.redactLogs,
        },
      }),
    })

    const session = (await response.json()) as OCRSessionResponse
    this.sessionId = session.sessionId
    this.openEventStream(session.eventsUrl || apiUrl(`/api/ocr/sessions/${session.sessionId}/events`))
  }

  async recognizeImage(imageData: OCRInput): Promise<OCRRecognitionResult> {
    if (!this.sessionId) {
      await this.initialize()
    }
    if (!this.sessionId) {
      throw new Error('Unable to initialize backend OCR session')
    }

    const frameId = crypto.randomUUID()
    const encodedFrame = await toJpegBase64(imageData)

    const realtimePromise = runtimeConfig.ocr.realtimeTransport === 'sse'
      ? this.waitForRealtimeResult(frameId)
      : null

    const response = await this.fetchWithTimeout(apiUrl(`/api/ocr/sessions/${this.sessionId}/frames`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders(),
      },
      body: JSON.stringify({
        frameId,
        imageBase64: encodedFrame,
        timestamp: Date.now(),
      }),
    })

    if (realtimePromise) {
      try {
        return await realtimePromise
      } catch {
        // Fallback to direct response body if realtime event was delayed.
      }
    }

    const body = (await response.json()) as OCRFrameResult
    return {
      text: (body.text || '').trim(),
      rawText: body.rawText ?? body.text ?? '',
      confidence: body.confidence ?? 0,
    }
  }

  async terminate(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    for (const pending of this.pendingResults.values()) {
      pending.reject(new Error('OCR session terminated'))
    }
    this.pendingResults.clear()

    if (this.sessionId) {
      try {
        await this.fetchWithTimeout(apiUrl(`/api/ocr/sessions/${this.sessionId}`), {
          method: 'DELETE',
          headers: createAuthHeaders(),
        }, 0)
      } catch {
        // Best effort cleanup.
      }
    }

    this.sessionId = null
    this.disposed = false
  }
}

