import { useState } from 'react'
import type { SlideGroup as SlideGroupType } from '../types'
import { OCRResultItem } from './OCRResultItem'

interface SlideGroupProps {
  group: SlideGroupType
  confidenceThreshold: number
}

export function SlideGroup({ group, confidenceThreshold }: SlideGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const filteredResults = group.results.filter(r => r.confidence >= confidenceThreshold)
  const duration = group.endTime - group.startTime
  const durationStr = duration < 60000
    ? `${Math.round(duration / 1000)}s`
    : `${Math.floor(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`

  const confidenceClass = group.avgConfidence >= 80
    ? 'confidence-high'
    : group.avgConfidence >= 50
      ? 'confidence-medium'
      : 'confidence-low'

  if (filteredResults.length === 0) return null

  return (
    <div className="slide-group">
      <button
        className="slide-group-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="slide-group-toggle">{isExpanded ? '▼' : '▶'}</span>
        <span className="slide-group-title">Slide {group.slideNumber}</span>
        <span className="slide-group-meta">
          <span className="slide-group-count">{filteredResults.length} capture{filteredResults.length !== 1 ? 's' : ''}</span>
          <span className="slide-group-duration">{durationStr}</span>
          <span className={`slide-group-confidence ${confidenceClass}`}>
            {group.avgConfidence.toFixed(0)}%
          </span>
        </span>
        <span className="slide-group-time">
          {new Date(group.startTime).toLocaleTimeString()} - {new Date(group.endTime).toLocaleTimeString()}
        </span>
      </button>
      {isExpanded && (
        <div className="slide-group-content">
          {filteredResults.map(result => (
            <OCRResultItem key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}
