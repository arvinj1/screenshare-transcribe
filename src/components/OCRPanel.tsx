import type { OCRResult, AudioSegment } from '../types'
import { OCRResultList } from './OCRResultList'

interface OCRPanelProps {
  results: OCRResult[]
  audioSegments: AudioSegment[]
  isProcessing: boolean
}

export function OCRPanel({ results, audioSegments, isProcessing }: OCRPanelProps) {
  return (
    <div className="ocr-panel">
      <h2>Extracted Text</h2>
      <OCRResultList results={results} audioSegments={audioSegments} isProcessing={isProcessing} />
    </div>
  )
}
