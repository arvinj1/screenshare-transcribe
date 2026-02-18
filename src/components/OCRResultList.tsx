import { useEffect, useRef, useMemo } from 'react'
import type { OCRResult, AudioSegment } from '../types'

interface SlideGroup {
  slideNumber: number
  bestText: string
  audioSegments: AudioSegment[]
}

interface OCRResultListProps {
  results: OCRResult[]
  audioSegments: AudioSegment[]
  isProcessing: boolean
}

export function OCRResultList({ results, audioSegments, isProcessing }: OCRResultListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { preAudio, slideGroups } = useMemo(() => {
    const finalAudio = audioSegments.filter(s => s.isFinal)

    if (results.length === 0) {
      return {
        preAudio: finalAudio,
        slideGroups: [] as SlideGroup[],
      }
    }

    // Group OCR results by slide
    const slideMap = new Map<number, OCRResult[]>()
    for (const r of results) {
      const existing = slideMap.get(r.slideNumber) || []
      existing.push(r)
      slideMap.set(r.slideNumber, existing)
    }

    const slideNumbers = [...slideMap.keys()].sort((a, b) => a - b)

    // Audio before first OCR frame
    const firstOcrTime = Math.min(...results.map(r => r.timestamp))
    const pre = finalAudio.filter(s => s.timestamp < firstOcrTime)

    const groups: SlideGroup[] = slideNumbers.map((slideNumber, i) => {
      const slideResults = slideMap.get(slideNumber)!
      const bestCapture = slideResults.reduce((best, r) =>
        r.text.length > best.text.length ? r : best
      )

      const slideStart = Math.min(...slideResults.map(r => r.timestamp))
      const slideEnd = i < slideNumbers.length - 1
        ? Math.min(...slideMap.get(slideNumbers[i + 1])!.map(r => r.timestamp))
        : Infinity

      const slideAudio = finalAudio.filter(
        s => s.timestamp >= slideStart && s.timestamp < slideEnd
      )

      return {
        slideNumber,
        bestText: bestCapture.text,
        audioSegments: slideAudio,
      }
    })

    return { preAudio: pre, slideGroups: groups }
  }, [results, audioSegments])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [slideGroups, audioSegments])

  if (results.length === 0 && audioSegments.length === 0 && !isProcessing) {
    return (
      <div className="ocr-result-list empty">
        <p>OCR and audio results will appear here when screen sharing starts</p>
      </div>
    )
  }

  return (
    <div className="ocr-result-list" ref={containerRef}>
      {/* Audio before first capture */}
      {preAudio.length > 0 && (
        <div className="slide-card slide-card-pre">
          <div className="slide-card-header">
            <span className="slide-card-label">Before first capture</span>
          </div>
          <div className="slide-card-audio">
            {preAudio.map(seg => (
              <div key={seg.id} className="slide-card-audio-line">
                <span className="audio-badge">Audio</span>
                <span className="slide-card-audio-text">{seg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide-grouped cards */}
      {slideGroups.map(group => (
        <div key={group.slideNumber} className="slide-card">
          <div className="slide-card-header">
            <span className="slide-card-label">Slide {group.slideNumber}</span>
          </div>
          <div className="slide-card-ocr">{group.bestText}</div>
          {group.audioSegments.length > 0 && (
            <div className="slide-card-audio">
              <div className="slide-card-audio-heading">What was said</div>
              {group.audioSegments.map(seg => (
                <div key={seg.id} className="slide-card-audio-line">
                  <span className="audio-badge">Audio</span>
                  <span className="slide-card-audio-text">{seg.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Show inline audio that hasn't been grouped yet (non-final / live) */}
      {audioSegments.filter(s => !s.isFinal).map(seg => (
        <div key={seg.id} className="slide-card slide-card-live">
          <div className="slide-card-audio-line">
            <span className="audio-badge live-audio-indicator">Live</span>
            <span className="slide-card-audio-text">{seg.text}</span>
          </div>
        </div>
      ))}

      {isProcessing && (
        <div className="processing-indicator">Processing...</div>
      )}
    </div>
  )
}
