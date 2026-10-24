import { createWorker, Worker } from 'tesseract.js'

// Lines Tesseract is less sure about than this are dropped. Clear slide text
// usually scores 85+; small, low-contrast UI text (browser tab strips, address
// and bookmark bars, menu bars) is where most misreads come from.
export const MIN_LINE_CONFIDENCE = 60

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

  // Only ask for what we use: per-line results (blocks), not hOCR/TSV.
  const result = await worker!.recognize(imageData, {}, { text: true, blocks: true, hocr: false, tsv: false })
  const lines = result.data.lines ?? []

  if (lines.length === 0) {
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    }
  }

  const kept = lines.filter(line => line.confidence >= MIN_LINE_CONFIDENCE && line.text.trim().length > 0)
  if (kept.length === 0) {
    return { text: '', confidence: 0 }
  }

  return {
    text: kept.map(line => line.text.trim()).join('\n'),
    confidence: kept.reduce((sum, line) => sum + line.confidence, 0) / kept.length,
  }
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
