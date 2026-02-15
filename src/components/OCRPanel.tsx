import { useState } from 'react'
import type { OCRResult } from '../types'
import { OCRResultList } from './OCRResultList'
import { EntityPanel } from './EntityPanel'

interface OCRPanelProps {
  results: OCRResult[]
  isProcessing: boolean
}

export function OCRPanel({ results, isProcessing }: OCRPanelProps) {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0)

  const filteredCount = results.filter(r => r.confidence >= confidenceThreshold).length

  return (
    <div className="ocr-panel">
      <div className="ocr-panel-header">
        <h2>Extracted Text</h2>
        <div className="confidence-filter">
          <label htmlFor="confidence-slider">
            Min confidence: {confidenceThreshold}%
          </label>
          <input
            id="confidence-slider"
            type="range"
            min="0"
            max="90"
            step="10"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="confidence-slider"
          />
          <span className="filter-count">
            {filteredCount}/{results.length}
          </span>
        </div>
      </div>
      {results.length > 0 && (
        <EntityPanel results={results} />
      )}
      <OCRResultList
        results={results}
        isProcessing={isProcessing}
        confidenceThreshold={confidenceThreshold}
      />
    </div>
  )
}
