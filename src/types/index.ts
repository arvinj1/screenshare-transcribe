export interface ExtractedEntities {
  emails: string[]
  dates: Array<{ value: string; normalized?: string }>
  phones: string[]
  numbers: Array<{ value: string; context: string }>
  properNouns: string[]
}

export interface OCRResult {
  id: string
  timestamp: number
  text: string
  rawText: string
  confidence: number
  language: string
  urls: string[]
  slideNumber: number
  entities: ExtractedEntities
}

export interface SlideGroup {
  slideNumber: number
  results: OCRResult[]
  startTime: number
  endTime: number
  avgConfidence: number
  allEntities: ExtractedEntities
}

export interface SessionSummary {
  totalCaptures: number
  slideCount: number
  duration: string
  wordCount: number
  charCount: number
  avgConfidence: number
  languages: string[]
  urls: string[]
  emails: string[]
  phones: string[]
  dates: Array<{ value: string; normalized?: string }>
  properNouns: string[]
  keywords: string[]
  slides: SlideSummary[]
  fullText: string
  inference: {
    contentType: string
    contentTypeLabel: string
    contentConfidence: number
    headings: string[]
    actionItems: string[]
    keySentences: string[]
    topicClusters: string[][]
    narrative: string
  }
}

export interface SlideSummary {
  slideNumber: number
  captureCount: number
  text: string
  keywords: string[]
  urls: string[]
  emails: string[]
  entities: ExtractedEntities
}

export interface AppState {
  isSharing: boolean
  mediaStream: MediaStream | null
  ocrResults: OCRResult[]
  isProcessing: boolean
  summary: SessionSummary | null
  error: string | null
}
