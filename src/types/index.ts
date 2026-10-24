export type AppMode = 'screen-ocr' | 'audio-only'

export interface AudioSegment {
  id: string
  timestamp: number
  text: string
  isFinal: boolean
  confidence: number
}

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
  keywords: string[]
  slides: SlideSummary[]
  audioSegmentCount: number
  audioWordCount: number
  audioTranscript: string
  fullText: string
  summarySource?: SummarySource
  aiTitle?: string
  /** Claude model that produced the AI summary, when summarySource is 'ai' */
  aiModel?: string
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
  audioText: string
  keywords: string[]
  urls: string[]
}

export type SummarySource = 'local' | 'ai'
export type AIStatus = 'off' | 'loading' | 'done' | 'failed'

export interface AISummary {
  title: string
  narrative: string
  keyPoints: string[]
  actionItems: string[]
  topics: string[]
  /** Model that wrote the summary (may differ from the one chosen if a fallback ran) */
  model: string
}

export interface SavedSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  summary: SessionSummary
}

export interface AppState {
  isSharing: boolean
  mediaStream: MediaStream | null
  ocrResults: OCRResult[]
  isProcessing: boolean
  summary: SessionSummary | null
  error: string | null
}
