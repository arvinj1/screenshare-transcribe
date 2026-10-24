import type { AppMode } from '../types'

export interface BrowserSupport {
  screenCapture: boolean
  speech: boolean
}

let cached: BrowserSupport | null = null

export function detectSupport(): BrowserSupport {
  if (!cached) {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    cached = {
      screenCapture: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
      speech: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
    }
  }
  return cached
}

/** Why a mode can't start in this browser, or null when it can. */
export function startBlockedReason(mode: AppMode, support: BrowserSupport = detectSupport()): string | null {
  if (mode === 'audio-only' && !support.speech) {
    return 'This browser has no speech recognition, so Audio Only can’t record anything. Use Chrome or Edge.'
  }
  if (mode === 'screen-ocr' && !support.screenCapture) {
    return 'This browser can’t share its screen. Use Chrome or Edge on a computer.'
  }
  return null
}
