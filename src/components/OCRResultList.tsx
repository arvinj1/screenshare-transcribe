import { useEffect, useRef } from 'react'
import type { OCRResult } from '../types'
import { OCRResultItem } from './OCRResultItem'

interface OCRResultListProps {
  results: OCRResult[]
  isProcessing: boolean
}

export function OCRResultList({ results, isProcessing }: OCRResultListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [results])

  if (results.length === 0 && !isProcessing) {
    return (
      <div className="ocr-result-list empty">
        <p>OCR results will appear here when screen sharing starts</p>
      </div>
    )
  }

  return (
    <div className="ocr-result-list" ref={containerRef}>
      {results.map(result => (
        <OCRResultItem key={result.id} result={result} />
      ))}
      {isProcessing && (
        <div className="processing-indicator">Processing...</div>
      )}
    </div>
  )
}
