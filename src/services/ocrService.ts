import { createWorker, Worker } from 'tesseract.js'

let worker: Worker | null = null

export async function initializeOCR(): Promise<void> {
  if (worker) return

  worker = await createWorker('eng', 1, {
    logger: () => {},
  })
}

export async function recognizeImage(
  imageData: ImageData | HTMLCanvasElement | string
): Promise<{ text: string; confidence: number }> {
  if (!worker) {
    await initializeOCR()
  }

  const result = await worker!.recognize(imageData)

  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  }
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
