import { useState, useMemo } from 'react'
import type { SavedSession } from '../types'
import { searchSessions } from '../services/sessionStorage'
import { downloadMarkdown, downloadJSON } from '../services/exportService'

interface SessionHistoryProps {
  sessions: SavedSession[]
  storageError: string | null
  onClose: () => void
  onOpenSession: (session: SavedSession) => void
  onRename: (id: string, title: string) => Promise<boolean>
  onDelete: (id: string) => Promise<void>
}

export function SessionHistory({ sessions, storageError, onClose, onOpenSession, onRename, onDelete }: SessionHistoryProps) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => searchSessions(sessions, query), [sessions, query])

  const startRename = (session: SavedSession) => {
    setEditingId(session.id)
    setEditTitle(session.title)
  }

  const commitRename = async (id: string) => {
    const ok = await onRename(id, editTitle)
    if (ok) setEditingId(null)
  }

  return (
    <div className="summary-overlay" onClick={onClose}>
      <div className="summary-modal history-modal" onClick={e => e.stopPropagation()}>
        <div className="summary-header">
          <h2>Session History</h2>
          <div className="summary-header-actions">
            <button className="btn btn-dismiss" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="summary-content">
          <input
            className="history-search"
            type="search"
            placeholder="Search titles, slide text, transcripts, keywords and summaries…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />

          <details className="settings-details history-about" open={sessions.length === 0}>
            <summary>
              {sessions.length === 0
                ? 'How history works'
                : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} saved in this browser · How history works`}
            </summary>
            <ul>
              <li><strong>Saved automatically</strong> when you stop a session, including the summary, every slide, and the full transcript.</li>
              <li><strong>Open</strong> a session by clicking its title to see its summary again.</li>
              <li><strong>Search</strong> looks through titles, slide text, transcripts, keywords, summaries and topics.</li>
              <li><strong>Rename</strong> to give a session a clearer title. Claude summaries suggest one automatically.</li>
              <li>
                <strong>Export</strong>: <em>MD</em> downloads a readable Markdown summary with a slide-by-slide timeline and the transcript;
                {' '}<em>JSON</em> downloads all the data, for backups or other tools.
              </li>
              <li><strong>Delete</strong> removes a session from this browser permanently, after you confirm.</li>
              <li>
                <strong>Where it’s kept:</strong> only in this browser on this device. It isn’t uploaded or synced, and no one else can see it.
              </li>
              <li>
                <strong>How long:</strong> until you delete it or clear this site’s data. Private windows lose it when they close, and
                Safari may remove it after 7 days without a visit, so export anything you want to keep.
              </li>
            </ul>
          </details>

          {storageError && <div className="error-banner">{storageError}</div>}

          {filtered.length === 0 && (
            <p className="history-empty">
              {sessions.length === 0
                ? 'No saved sessions yet. Your first one appears here when you stop a session.'
                : 'No sessions match your search.'}
            </p>
          )}

          <div className="history-list">
            {filtered.map(session => {
              const s = session.summary
              return (
                <div key={session.id} className="history-card">
                  <div className="history-card-top">
                    {editingId === session.id ? (
                      <div className="history-rename">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitRename(session.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                        />
                        <button className="btn btn-copy" onClick={() => commitRename(session.id)}>Save</button>
                        <button className="btn btn-dismiss" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="history-title" onClick={() => onOpenSession(session)} title="Open session">
                        {session.title}
                      </button>
                    )}
                  </div>
                  <div className="history-meta">
                    <span>{new Date(session.createdAt).toLocaleString()}</span>
                    <span>&middot; {s.duration}</span>
                    <span>&middot; {s.slideCount} slide{s.slideCount !== 1 ? 's' : ''}</span>
                    <span>&middot; {s.totalCaptures} captures</span>
                    {s.avgConfidence > 0 && <span>&middot; {Math.round(s.avgConfidence)}% conf</span>}
                    {s.summarySource === 'ai' && <span className="ai-badge" title="Summary written by Claude">Claude</span>}
                  </div>
                  {s.keywords.length > 0 && (
                    <div className="history-keywords">{s.keywords.slice(0, 6).join(' · ')}</div>
                  )}
                  <div className="history-actions">
                    <button className="btn btn-export" onClick={() => downloadMarkdown(s, session.title)} title="Download a readable Markdown summary">MD</button>
                    <button className="btn btn-export" onClick={() => downloadJSON(session)} title="Download all session data as JSON">JSON</button>
                    <button className="btn btn-copy" onClick={() => startRename(session)} title="Change this session’s title">Rename</button>
                    {confirmDeleteId === session.id ? (
                      <>
                        <button
                          className="btn btn-stop"
                          onClick={() => { onDelete(session.id); setConfirmDeleteId(null) }}
                        >
                          Confirm delete
                        </button>
                        <button className="btn btn-dismiss" onClick={() => setConfirmDeleteId(null)}>Keep</button>
                      </>
                    ) : (
                      <button className="btn btn-dismiss" onClick={() => setConfirmDeleteId(session.id)} title="Remove from this browser">Delete</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
