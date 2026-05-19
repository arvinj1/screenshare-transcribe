import { createWorker, Worker } from 'tesseract.js'
import type { OCRInput, OCRProvider, OCRRecognitionResult } from './types'

export class LocalTesseractProvider implements OCRProvider {
  private worker: Worker | null = null

  async initialize(): Promise<void> {
    if (this.worker) return

    this.worker = await createWorker('eng', 1, {
      logger: () => {},
    })
  }

  async recognizeImage(imageData: OCRInput): Promise<OCRRecognitionResult> {
    if (!this.worker) {
      await this.initialize()
    }

    const result = await this.worker!.recognize(imageData)

    return {
      text: result.data.text.trim(),
      rawText: result.data.text,
      confidence: result.data.confidence,
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}
