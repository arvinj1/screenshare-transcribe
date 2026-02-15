import type { SessionSummary } from '../types'

interface SummaryViewProps {
  summary: SessionSummary | null
  onDismiss: () => void
}

export function SummaryView({ summary, onDismiss }: SummaryViewProps) {
  if (!summary) return null

  const { inference } = summary

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

          {/* AI Narrative */}
          {inference.narrative && (
            <section className="summary-section narrative-section">
              <h3>🧠 Inferred Summary</h3>
              <div className="narrative-box">
                {inference.narrative}
              </div>
            </section>
          )}

          {/* Statistics */}
          <section className="summary-section">
            <h3>📊 Statistics</h3>
            <div className="summary-stats">
              <div className="stat-item">
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
                <span className="stat-value">{summary.wordCount}</span>
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
            </div>
          </section>

          {/* Headings / Structure detected */}
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

          {/* Action Items */}
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

          {/* Key Sentences */}
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

          {/* Keywords / Topics */}
          {summary.keywords.length > 0 && (
            <section className="summary-section">
              <h3>🏷️ Key Topics</h3>
              {inference.topicClusters.length > 1 ? (
                <div className="topic-clusters">
                  {inference.topicClusters.map((cluster, i) => (
                    <div key={i} className="topic-cluster">
                      {cluster.map((kw, j) => (
                        <span key={j} className="keyword-tag">{kw}</span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="keyword-tags">
                  {summary.keywords.map((kw, i) => (
                    <span key={i} className="keyword-tag">{kw}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* URLs */}
          {summary.urls.length > 0 && (
            <section className="summary-section">
              <h3>🔗 URLs Found ({summary.urls.length})</h3>
              <ul className="url-list">
                {summary.urls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Per-slide breakdown */}
          {summary.slides.length > 0 && (
            <section className="summary-section">
              <h3>📄 Slide Breakdown</h3>
              <div className="slide-breakdown">
                {summary.slides.map(slide => (
                  <details key={slide.slideNumber} className="slide-detail">
                    <summary>
                      <strong>Slide {slide.slideNumber}</strong>
                      <span className="slide-meta">
                        {slide.captureCount} capture{slide.captureCount !== 1 ? 's' : ''}
                        {slide.keywords.length > 0 && ` · ${slide.keywords.slice(0, 3).join(', ')}`}
                        {slide.urls.length > 0 && ` · ${slide.urls.length} URL${slide.urls.length !== 1 ? 's' : ''}`}
                      </span>
                    </summary>
                    <pre className="slide-text">{slide.text}</pre>
                    {slide.urls.length > 0 && (
                      <div className="slide-urls">
                        {slide.urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        ))}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Full captured text */}
          <section className="summary-section">
            <h3>📝 Full Captured Text</h3>
            <pre className="full-text">{summary.fullText}</pre>
          </section>
        </div>
      </div>
    </div>
  )
}
