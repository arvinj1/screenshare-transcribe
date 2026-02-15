import type { SlideGroup } from '../types'

interface SlideTimelineProps {
  groups: SlideGroup[]
  onSlideClick: (slideNumber: number) => void
}

export function SlideTimeline({ groups, onSlideClick }: SlideTimelineProps) {
  if (groups.length === 0) return null

  const minTime = Math.min(...groups.map(g => g.startTime))
  const maxTime = Math.max(...groups.map(g => g.endTime))
  const totalDuration = maxTime - minTime

  return (
    <div className="slide-timeline">
      <div className="slide-timeline-track">
        {groups.map(group => {
          const left = totalDuration > 0
            ? ((group.startTime - minTime) / totalDuration) * 100
            : 0
          const width = totalDuration > 0
            ? ((group.endTime - group.startTime) / totalDuration) * 100
            : 100 / groups.length

          const confidenceHue = Math.round((group.avgConfidence / 100) * 120) // 0 = red, 120 = green

          return (
            <button
              key={group.slideNumber}
              className="slide-timeline-segment"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 2)}%`,
                backgroundColor: `hsl(${confidenceHue}, 70%, 45%)`,
              }}
              onClick={() => onSlideClick(group.slideNumber)}
              title={`Slide ${group.slideNumber} - ${group.avgConfidence.toFixed(0)}% confidence`}
            >
              <span className="slide-timeline-label">{group.slideNumber}</span>
            </button>
          )
        })}
      </div>
      <div className="slide-timeline-legend">
        <span className="slide-timeline-time">{new Date(minTime).toLocaleTimeString()}</span>
        <span className="slide-timeline-info">{groups.length} slide{groups.length !== 1 ? 's' : ''}</span>
        <span className="slide-timeline-time">{new Date(maxTime).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
