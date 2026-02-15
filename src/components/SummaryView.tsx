import type { SessionSummary, OCRResult } from '../types'
import { TopicClusterView } from './TopicClusterView'

interface SummaryViewProps {
  summary: SessionSummary | null
  results: OCRResult[]
  onDismiss: () => void
}

function ConfidenceHistogram({ results }: { results: OCRResult[] }) {
  if (results.length === 0) return null

  const buckets = [0, 0, 0, 0, 0]
  for (const r of results) {
    const idx = Math.min(Math.floor(r.confidence / 20), 4)
    buckets[idx]++
  }

  const maxCount = Math.max(...buckets, 1)
  const labels = ['0-20', '20-40', '40-60', '60-80', '80-100']
  const colors = ['#f44336', '#ff9800', '#ffeb3b', '#8bc34a', '#4caf50']

  return (
    <div className="confidence-histogram">
      <div className="histogram-bars">
        {buckets.map((count, i) => (
          <div key={i} className="histogram-bar-container">
            <div
              className="histogram-bar"
              style={{
                height: `${(count / maxCount) * 100}%`,
                backgroundColor: colors[i],
              }}
            >
              {count > 0 && <span className="histogram-count">{count}</span>}
            </div>
            <span className="histogram-label">{labels[i]}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EntityCount({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <div className="stat-item">
      <span className="stat-value">{count}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export function SummaryView({ summary, results, onDismiss }: SummaryViewProps) {
  if (!summary) return null

  const { inference } = summary
  const hasEmails = summary.emails.length > 0
  const hasUrls = summary.urls.length > 0
  const hasPhones = summary.phones.length > 0
  const hasDates = summary.dates.length > 0
  const hasProperNouns = summary.properNouns.length > 0
  const hasExtractedItems = hasEmails || hasUrls || hasPhones || hasDates

  return (
    <div className="summary-overlay">
      <div className="summary-modal">
        <div className="summary-header">
          <h2>Session Summary</h2>
          <button className="btn btn-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
        <div className="summary-content">

          {/* ── Inferred Narrative ── */}
          {inference.narrative && (
            <section className="summary-section narrative-section">
              <h3>🧠 Inferred Summary</h3>
              <div className="narrative-box">
                {inference.narrative}
              </div>
            </section>
          )}

          {/* ── Stats Grid ── */}
          <section className="summary-section">
            <h3>📊 Overview</h3>
            <div className="summary-stats">
              <div className="stat-item stat-highlight">
                <span className="stat-value">{inference.contentTypeLabel.split(' ')[0]}</span>
                <span className="stat-label">{inference.contentTypeLabel.split(' ').slice(1).join(' ')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{summary.slideCount}</span>
                <span className="stat-label">Slides / Screens</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{summary.totalCaptures}</span>
                <span className="stat-label">Captures</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{summary.wordCount.toLocaleString()}</span>
                <span className="stat-label">Words</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{summary.duration}</span>
                <span className="stat-label">Duration</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{summary.avgConfidence.toFixed(0)}%</span>
                <span className="stat-label">Avg Confidence</span>
              </div>
              {summary.languages.length > 0 && (
                <div className="stat-item">
                  <span className="stat-value">{summary.languages.join(', ')}</span>
                  <span className="stat-label">Languages</span>
                </div>
              )}
              <EntityCount label="Emails" count={summary.emails.length} />
              <EntityCount label="URLs" count={summary.urls.length} />
              <EntityCount label="Phone Numbers" count={summary.phones.length} />
              <EntityCount label="Dates" count={summary.dates.length} />
            </div>
          </section>

          {/* ── Confidence Distribution ── */}
          {results.length > 0 && (
            <section className="summary-section">
              <h3>Confidence Distribution</h3>
              <ConfidenceHistogram results={results} />
            </section>
          )}

          {/* ── Extracted Emails & URLs ── */}
          {hasExtractedItems && (
            <section className="summary-section">
              <h3>📋 Extracted Contact Info & Links</h3>
              <div className="extracted-items-grid">

                {hasEmails && (
                  <div className="extracted-group">
                    <h4 className="extracted-group-title">
                      <span className="extracted-icon">📧</span>
                      Emails ({summary.emails.length})
                    </h4>
                    <ul className="extracted-list">
                      {summary.emails.map((email, i) => (
                        <li key={i} className="extracted-item extracted-email">
                          <a href={`mailto:${email}`}>{email}</a>
                          <button
                            className="copy-btn"
                            onClick={() => navigator.clipboard.writeText(email)}
                            title="Copy"
                          >
                            📋
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasUrls && (
                  <div className="extracted-group">
                    <h4 className="extracted-group-title">
                      <span className="extracted-icon">🔗</span>
                      URLs ({summary.urls.length})
                    </h4>
                    <ul className="extracted-list">
                      {summary.urls.map((url, i) => (
                        <li key={i} className="extracted-item extracted-url">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            {url}
                          </a>
                          <button
                            className="copy-btn"
                            onClick={() => navigator.clipboard.writeText(url)}
                            title="Copy"
                          >
                            📋
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasPhones && (
                  <div className="extracted-group">
                    <h4 className="extracted-group-title">
                      <span className="extracted-icon">📞</span>
                      Phone Numbers ({summary.phones.length})
                    </h4>
                    <ul className="extracted-list">
                      {summary.phones.map((phone, i) => (
                        <li key={i} className="extracted-item extracted-phone">
                          <a href={`tel:${phone.replace(/[\s()-]/g, '')}`}>{phone}</a>
                          <button
                            className="copy-btn"
                            onClick={() => navigator.clipboard.writeText(phone)}
                            title="Copy"
                          >
                            📋
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasDates && (
                  <div className="extracted-group">
                    <h4 className="extracted-group-title">
                      <span className="extracted-icon">📅</span>
                      Dates ({summary.dates.length})
                    </h4>
                    <ul className="extracted-list">
                      {summary.dates.map((date, i) => (
                        <li key={i} className="extracted-item extracted-date">
                          <span>{date.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Headings ── */}
          {inference.headings.length > 0 && (
            <section className="summary-section">
              <h3>📑 Headings Detected</h3>
              <ol className="headings-list">
                {inference.headings.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </section>
          )}

          {/* ── Action Items ── */}
          {inference.actionItems.length > 0 && (
            <section className="summary-section">
              <h3>✅ Action Items</h3>
              <ul className="action-items-list">
                {inference.actionItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Key Points ── */}
          {inference.keySentences.length > 0 && (
            <section className="summary-section">
              <h3>💡 Key Points</h3>
              <ul className="key-sentences-list">
                {inference.keySentences.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Proper Nouns / Named Entities ── */}
          {hasProperNouns && (
            <section className="summary-section">
              <h3>👤 Names & Entities Mentioned</h3>
              <div className="keyword-tags">
                {summary.properNouns.map((noun, i) => (
                  <span key={i} className="keyword-tag entity-tag">{noun}</span>
                ))}
              </div>
            </section>
          )}

          {/* ── Key Topics ── */}
          {summary.keywords.length > 0 && (
            <section className="summary-section">
              <h3>🏷️ Key Topics</h3>
              {inference.topicClusters.length > 1 ? (
                <TopicClusterView
                  clusters={inference.topicClusters}
                  slides={summary.slides}
                />
              ) : (
                <div className="keyword-tags">
                  {summary.keywords.map((kw, i) => (
                    <span key={i} className="keyword-tag">{kw}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Slide Breakdown ── */}
          {summary.slides.length > 0 && (
            <section className="summary-section">
              <h3>📄 Slide Breakdown</h3>
              <div className="slide-breakdown">
                {summary.slides.map(slide => {
                  const slideHasExtras = slide.urls.length > 0 || slide.emails.length > 0
                  return (
                    <details key={slide.slideNumber} className="slide-detail">
                      <summary>
                        <strong>Slide {slide.slideNumber}</strong>
                        <span className="slide-meta">
                          {slide.captureCount} capture{slide.captureCount !== 1 ? 's' : ''}
                          {slide.keywords.length > 0 && ` · ${slide.keywords.slice(0, 3).join(', ')}`}
                          {slide.urls.length > 0 && ` · ${slide.urls.length} URL${slide.urls.length !== 1 ? 's' : ''}`}
                          {slide.emails.length > 0 && ` · ${slide.emails.length} email${slide.emails.length !== 1 ? 's' : ''}`}
                        </span>
                      </summary>
                      <pre className="slide-text">{slide.text}</pre>
                      {slideHasExtras && (
                        <div className="slide-extras">
                          {slide.urls.length > 0 && (
                            <div className="slide-urls">
                              <span className="slide-extras-label">URLs:</span>
                              {slide.urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                              ))}
                            </div>
                          )}
                          {slide.emails.length > 0 && (
                            <div className="slide-emails">
                              <span className="slide-extras-label">Emails:</span>
                              {slide.emails.map((email, i) => (
                                <a key={i} href={`mailto:${email}`}>{email}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </details>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Full Captured Text ── */}
          <section className="summary-section">
            <details className="full-text-details">
              <summary className="full-text-toggle">
                <h3>📝 Full Captured Text</h3>
                <span className="full-text-chars">{summary.charCount.toLocaleString()} chars</span>
              </summary>
              <pre className="full-text">{summary.fullText}</pre>
            </details>
          </section>
        </div>
      </div>
    </div>
  )
}
