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
            placeholder="Search sessions — title, text, keywords…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />

          {storageError && <div className="error-banner">{storageError}</div>}

          {filtered.length === 0 && (
            <p className="history-empty">
              {sessions.length === 0
                ? 'No saved sessions yet. Sessions are saved automatically when you stop a capture.'
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
                    {s.summarySource === 'ai' && <span className="ai-badge">AI</span>}
                  </div>
                  {s.keywords.length > 0 && (
                    <div className="history-keywords">{s.keywords.slice(0, 6).join(' · ')}</div>
                  )}
                  <div className="history-actions">
                    <button className="btn btn-export" onClick={() => downloadMarkdown(s, session.title)}>MD</button>
                    <button className="btn btn-export" onClick={() => downloadJSON(session)}>JSON</button>
                    <button className="btn btn-copy" onClick={() => startRename(session)}>Rename</button>
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
                      <button className="btn btn-dismiss" onClick={() => setConfirmDeleteId(session.id)}>Delete</button>
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
