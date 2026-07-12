import { useState } from 'react'
import type { SessionSummary, AIStatus, SavedSession } from '../types'
import { downloadMarkdown, downloadJSON, copyToClipboard } from '../services/exportService'
import { generateId } from '../services/sessionStorage'

interface SummaryViewProps {
  summary: SessionSummary | null
  aiStatus: AIStatus
  onDismiss: () => void
}

function aiStatusBadge(status: AIStatus): { label: string; className: string } {
  switch (status) {
    case 'loading':
      return { label: 'Generating AI summary…', className: 'summary-badge summary-badge-loading' }
    case 'done':
      return { label: 'AI summary', className: 'summary-badge summary-badge-ai' }
    case 'failed':
      return { label: 'Local summary — AI unavailable', className: 'summary-badge summary-badge-local' }
    default:
      return { label: 'Local summary', className: 'summary-badge summary-badge-local' }
  }
}

export function SummaryView({ summary, aiStatus, onDismiss }: SummaryViewProps) {
  const [copied, setCopied] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)

  if (!summary) return null

  const { inference } = summary
  const totalWords = summary.wordCount + summary.audioWordCount

  const handleCopy = async () => {
    const ok = await copyToClipboard(summary)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Merge key sentences and action items into one insights list
  const insights: { text: string; kind: 'point' | 'action' }[] = [
    ...inference.keySentences.map(s => ({ text: s, kind: 'point' as const })),
    ...inference.actionItems.map(a => ({ text: a, kind: 'action' as const })),
  ]

  const badge = aiStatusBadge(aiStatus)

  const handleExportJSON = () => {
    const now = Date.now()
    const session: SavedSession = {
      id: generateId(),
      title: summary.aiTitle || 'Session Summary',
      createdAt: now,
      updatedAt: now,
      summary,
    }
    downloadJSON(session)
  }

  return (
    <div className="summary-overlay">
      <div className="summary-modal">
        {/* Header with export actions */}
        <div className="summary-header">
          <h2>{summary.aiTitle || 'Session Summary'}</h2>
          <div className="summary-header-actions">
            <button className="btn btn-export" onClick={() => downloadMarkdown(summary)}>
              Export .md
            </button>
            <button className="btn btn-export" onClick={handleExportJSON}>
              Export .json
            </button>
            <button className="btn btn-copy" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-dismiss" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </div>

        <div className="summary-content">
          {/* Compact stats bar */}
          <div className="summary-stats-bar">
            <span className={badge.className}>{badge.label}</span>
            <span className="stats-bar-sep">&middot;</span>
            <span>{summary.duration}</span>
            <span className="stats-bar-sep">&middot;</span>
            <span>{summary.slideCount} slide{summary.slideCount !== 1 ? 's' : ''}</span>
            <span className="stats-bar-sep">&middot;</span>
            <span>{totalWords} words</span>
            {summary.audioSegmentCount > 0 && (
              <>
                <span className="stats-bar-sep">&middot;</span>
                <span>{summary.audioSegmentCount} audio segments</span>
              </>
            )}
          </div>

          {/* AI narrative — hero element */}
          {inference.narrative && (
            <section className="summary-section narrative-section">
              <div className="narrative-box">{inference.narrative}</div>
            </section>
          )}

          {/* Key Insights */}
          {insights.length > 0 && (
            <section className="summary-section">
              <h3>Key Insights</h3>
              <ul className="insights-list">
                {insights.map((item, i) => (
                  <li key={i} className={item.kind === 'action' ? 'insight-action' : 'insight-point'}>
                    {item.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Slide Timeline */}
          {summary.slides.length > 0 && (
            <section className="summary-section">
              <h3>Slide Timeline</h3>
              <div className="summary-timeline">
                {summary.slides.map(slide => (
                  <div key={slide.slideNumber} className="summary-timeline-card">
                    <div className="summary-timeline-card-header">
                      <strong>Slide {slide.slideNumber}</strong>
                      <span className="slide-meta">
                        {slide.captureCount} capture{slide.captureCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <pre className="slide-text">{slide.text}</pre>
                    {slide.audioText && (
                      <div className="summary-timeline-audio">
                        <span className="audio-badge">Audio</span>
                        <span>{slide.audioText}</span>
                      </div>
                    )}
                    {slide.urls.length > 0 && (
                      <div className="slide-urls">
                        {slide.urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Collapsible Raw Data */}
          <section className="summary-section raw-data-section">
            <button
              className="raw-data-toggle"
              onClick={() => setRawOpen(o => !o)}
            >
              {rawOpen ? 'Hide' : 'Show'} Raw Data
            </button>
            {rawOpen && (
              <div className="raw-data-content">
                {summary.urls.length > 0 && (
                  <div className="raw-data-block">
                    <h4>URLs ({summary.urls.length})</h4>
                    <ul className="url-list">
                      {summary.urls.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.audioTranscript && (
                  <div className="raw-data-block">
                    <h4>Full Audio Transcript</h4>
                    <pre className="full-text">{summary.audioTranscript}</pre>
                  </div>
                )}
                <div className="raw-data-block">
                  <h4>Full Captured Text</h4>
                  <pre className="full-text">{summary.fullText}</pre>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
