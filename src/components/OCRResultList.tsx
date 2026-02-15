import { useEffect, useRef, useMemo, useCallback } from 'react'
import type { OCRResult, SlideGroup as SlideGroupType } from '../types'
import { SlideGroup } from './SlideGroup'
import { SlideTimeline } from './SlideTimeline'
import { mergeEntities } from '../services/entityExtractor'

interface OCRResultListProps {
  results: OCRResult[]
  isProcessing: boolean
  confidenceThreshold: number
}

function groupBySlide(results: OCRResult[]): SlideGroupType[] {
  const groupMap = new Map<number, OCRResult[]>()

  for (const result of results) {
    if (!groupMap.has(result.slideNumber)) {
      groupMap.set(result.slideNumber, [])
    }
    groupMap.get(result.slideNumber)!.push(result)
  }

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([slideNumber, slideResults]) => {
      const avgConfidence = slideResults.reduce((sum, r) => sum + r.confidence, 0) / slideResults.length
      return {
        slideNumber,
        results: slideResults,
        startTime: Math.min(...slideResults.map(r => r.timestamp)),
        endTime: Math.max(...slideResults.map(r => r.timestamp)),
        avgConfidence,
        allEntities: mergeEntities(slideResults.map(r => r.entities)),
      }
    })
}

export function OCRResultList({ results, isProcessing, confidenceThreshold }: OCRResultListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const groups = useMemo(() => groupBySlide(results), [results])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [results])

  const handleSlideClick = useCallback((slideNumber: number) => {
    const element = slideRefs.current.get(slideNumber)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const setSlideRef = useCallback((slideNumber: number, element: HTMLDivElement | null) => {
    if (element) {
      slideRefs.current.set(slideNumber, element)
    } else {
      slideRefs.current.delete(slideNumber)
    }
  }, [])

  if (results.length === 0 && !isProcessing) {
    return (
      <div className="ocr-result-list empty">
        <p>OCR results will appear here when screen sharing starts</p>
      </div>
    )
  }

  return (
    <div className="ocr-result-container">
      {groups.length > 1 && (
        <SlideTimeline groups={groups} onSlideClick={handleSlideClick} />
      )}
      <div className="ocr-result-list" ref={containerRef}>
        {groups.map(group => (
          <div
            key={group.slideNumber}
            ref={(el) => setSlideRef(group.slideNumber, el)}
          >
            <SlideGroup
              group={group}
              confidenceThreshold={confidenceThreshold}
            />
          </div>
        ))}
        {isProcessing && (
          <div className="processing-indicator">Processing...</div>
        )}
      </div>
    </div>
  )
}
