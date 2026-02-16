export interface AudioSegment {
  id: string
  timestamp: number
  text: string
  isFinal: boolean
  confidence: number
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
  keywords: string[]
  slides: SlideSummary[]
  audioSegmentCount: number
  audioWordCount: number
  audioTranscript: string
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
}

export interface AppState {
  isSharing: boolean
  mediaStream: MediaStream | null
  ocrResults: OCRResult[]
  isProcessing: boolean
  summary: SessionSummary | null
  error: string | null
}
