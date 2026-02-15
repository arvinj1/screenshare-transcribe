import type { OCRResult } from '../types'
import { OCRResultList } from './OCRResultList'

interface OCRPanelProps {
  results: OCRResult[]
  isProcessing: boolean
}

export function OCRPanel({ results, isProcessing }: OCRPanelProps) {
  return (
    <div className="ocr-panel">
      <h2>Extracted Text</h2>
      <OCRResultList results={results} isProcessing={isProcessing} />
    </div>
  )
}
