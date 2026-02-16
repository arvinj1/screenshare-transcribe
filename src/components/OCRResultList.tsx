import { useEffect, useRef, useMemo } from 'react'
import type { OCRResult, AudioSegment } from '../types'
import { OCRResultItem } from './OCRResultItem'
import { AudioSegmentItem } from './AudioSegmentItem'

type TimelineEntry =
  | { type: 'ocr'; data: OCRResult }
  | { type: 'audio'; data: AudioSegment }

interface OCRResultListProps {
  results: OCRResult[]
  audioSegments: AudioSegment[]
  isProcessing: boolean
}

export function OCRResultList({ results, audioSegments, isProcessing }: OCRResultListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...results.map(r => ({ type: 'ocr' as const, data: r })),
      ...audioSegments.map(s => ({ type: 'audio' as const, data: s })),
    ]
    entries.sort((a, b) => a.data.timestamp - b.data.timestamp)
    return entries
  }, [results, audioSegments])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [timeline])

  if (timeline.length === 0 && !isProcessing) {
    return (
      <div className="ocr-result-list empty">
        <p>OCR and audio results will appear here when screen sharing starts</p>
      </div>
    )
  }

  return (
    <div className="ocr-result-list" ref={containerRef}>
      {timeline.map(entry =>
        entry.type === 'ocr' ? (
          <OCRResultItem key={entry.data.id} result={entry.data} />
        ) : (
          <AudioSegmentItem key={entry.data.id} segment={entry.data} />
        )
      )}
      {isProcessing && (
        <div className="processing-indicator">Processing...</div>
      )}
    </div>
  )
}
