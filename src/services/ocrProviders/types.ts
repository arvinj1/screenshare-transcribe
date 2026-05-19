export interface OCRRecognitionResult {
  text: string
  confidence: number
  rawText?: string
}

export type OCRInput = ImageData | HTMLCanvasElement | string

export interface OCRProvider {
  initialize(): Promise<void>
  recognizeImage(imageData: OCRInput): Promise<OCRRecognitionResult>
  terminate(): Promise<void>
}

