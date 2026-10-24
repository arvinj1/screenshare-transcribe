import { useState } from 'react'
import type { SessionSummary, AIStatus, SavedSession } from '../types'
import { downloadMarkdown, downloadJSON, copyToClipboard } from '../services/exportService'
import { generateId } from '../services/sessionStorage'
import { CLAUDE_MODELS } from '../services/aiSettings'
import { paragraphs, slideLabel } from '../services/notesFormat'

interface SummaryViewProps {
  summary: SessionSummary | null
  aiStatus: AIStatus
  aiError: string | null
  onOpenSettings: () => void
  onDismiss: () => void
}

function modelName(id: string | undefined): string {
  if (!id) return 'Claude'
  // Responses can name a dated or fallback model; match on the family prefix
  return CLAUDE_MODELS.find(m => id.startsWith(m.id))?.label ?? id
}

function aiStatusBadge(status: AIStatus, aiError: string | null, aiModel: string | undefined): { label: string; className: string } {
  switch (status) {
    case 'loading':
      return { label: 'Writing a clearer summary with Claude…', className: 'summary-badge summary-badge-loading' }
    case 'done':
      return { label: `Summary by ${modelName(aiModel)}`, className: 'summary-badge summary-badge-ai' }
    case 'failed':
      return { label: `On-device summary — ${aiError ?? 'Claude unavailable'}`, className: 'summary-badge summary-badge-error' }
    default:
      return { label: 'On-device summary', className: 'summary-badge summary-badge-local' }
  }
}

export function SummaryView({ summary, aiStatus, aiError, onOpenSettings, onDismiss }: SummaryViewProps) {
  const [copied, setCopied] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)

  if (!summary) return null

  const { inference } = summary
  const notes = summary.aiNotes
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

  const badge = aiStatusBadge(aiStatus, aiError, summary.aiModel)

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
            {aiStatus === 'failed' && (
              <button className="settings-link" onClick={onOpenSettings}>Open settings</button>
            )}
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
              <div className="narrative-box">
                {paragraphs(inference.narrative).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}

          {notes && <DetailedNotes notes={notes} keyPoints={inference.keySentences} />}

          {/* Key Insights */}
          {!notes && insights.length > 0 && (
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

          {/* Slide Timeline (the raw capture, tucked away when Claude notes exist) */}
          {summary.slides.length > 0 && (
            <section className="summary-section">
              {notes ? (
                <button className="raw-data-toggle" onClick={() => setCaptureOpen(o => !o)}>
                  {captureOpen ? 'Hide' : 'Show'} raw slide text and transcript
                </button>
              ) : (
                <h3>Slide Timeline</h3>
              )}
              {(!notes || captureOpen) && (
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
              )}
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

function DetailedNotes({ notes, keyPoints }: { notes: NonNullable<SessionSummary['aiNotes']>; keyPoints: string[] }) {
  return (
    <>
      {keyPoints.length > 0 && (
        <section className="summary-section">
          <h3>Key points</h3>
          <ul className="insights-list">
            {keyPoints.map((p, i) => <li key={i} className="insight-point">{p}</li>)}
          </ul>
        </section>
      )}

      {notes.themes.length > 0 && (
        <section className="summary-section">
          <h3>Themes</h3>
          <div className="notes-themes">
            {notes.themes.map((t, i) => (
              <div key={i} className="notes-card">
                <div className="notes-card-header">
                  <strong>{t.name}</strong>
                  {t.slides.length > 0 && <span className="notes-chip">{slideLabel(t.slides)}</span>}
                </div>
                <p>{t.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {notes.decisions.length > 0 && (
        <section className="summary-section">
          <h3>Decisions</h3>
          <ul className="insights-list">
            {notes.decisions.map((d, i) => <li key={i} className="insight-point">{d}</li>)}
          </ul>
        </section>
      )}

      {notes.actionItems.length > 0 && (
        <section className="summary-section">
          <h3>Action items</h3>
          <ul className="insights-list">
            {notes.actionItems.map((a, i) => (
              <li key={i} className="insight-action">
                {a.task}
                {a.owner.trim() && <span className="notes-chip">{a.owner}</span>}
                {a.due.trim() && <span className="notes-chip">by {a.due}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.openQuestions.length > 0 && (
        <section className="summary-section">
          <h3>Open questions and risks</h3>
          <ul className="insights-list">
            {notes.openQuestions.map((q, i) => <li key={i} className="insight-point">{q}</li>)}
          </ul>
        </section>
      )}

      {notes.keyNumbers.length > 0 && (
        <section className="summary-section">
          <h3>Key numbers</h3>
          <dl className="notes-numbers">
            {notes.keyNumbers.map((n, i) => (
              <div key={i}>
                <dt>{n.value}</dt>
                <dd>{n.context}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {notes.slideNotes.length > 0 && (
        <section className="summary-section">
          <h3>Slide-by-slide notes</h3>
          <div className="notes-slides">
            {notes.slideNotes.map((n, i) => (
              <div key={i} className="notes-card">
                <div className="notes-card-header">
                  <strong>{n.title}</strong>
                  <span className="notes-chip">{slideLabel(n.slides)}</span>
                </div>
                {n.shown && <p><span className="notes-label">Shown</span>{n.shown}</p>}
                {n.said && <p><span className="notes-label">Said</span>{n.said}</p>}
                {n.takeaway && <p className="notes-takeaway"><span className="notes-label">Takeaway</span>{n.takeaway}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
