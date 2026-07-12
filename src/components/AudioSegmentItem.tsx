import type { AudioSegment } from '../types'

interface AudioSegmentItemProps {
  segment: AudioSegment
}

export function AudioSegmentItem({ segment }: AudioSegmentItemProps) {
  return (
    <div className="ocr-result-item audio-segment-item">
      <div className="ocr-result-header">
        <span className="slide-badge audio-badge">Audio</span>
        {segment.confidence > 0 && (
          <span className={`confidence-badge ${segment.confidence >= 0.8 ? 'confidence-high' : segment.confidence >= 0.5 ? 'confidence-medium' : 'confidence-low'}`}>
            {(segment.confidence * 100).toFixed(0)}%
          </span>
        )}
        <span className="timestamp">
          {new Date(segment.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="ocr-result-text">{segment.text}</div>
    </div>
  )
}
