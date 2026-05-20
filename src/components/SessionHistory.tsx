import { useState, useMemo, useRef, useEffect } from 'react'
import type { SavedSession } from '../types'
import { downloadMarkdown, downloadJSON, copyMarkdownToClipboard } from '../services/sessionExport'

interface SessionHistoryProps {
  sessions: SavedSession[]
  onClose: () => void
  onOpen: (session: SavedSession) => void
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, newTitle: string) => Promise<void>
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function confidenceColor(avg: number): string {
  if (avg >= 70) return 'var(--success)'
  if (avg >= 40) return 'var(--warning)'
  return 'var(--danger)'
}

interface SessionCardProps {
  session: SavedSession
  onOpen: (session: SavedSession) => void
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, newTitle: string) => Promise<void>
}

function SessionCard({ session, onOpen, onDelete, onRename }: SessionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleRename = async () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== session.title) {
      await onRename(session.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleCopy = async () => {
    try {
      await copyMarkdownToClipboard(session)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="session-card">
      <div className="session-card-header">
        {isEditing ? (
          <input
            ref={inputRef}
            className="session-title-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleRename()
              if (e.key === 'Escape') { setEditTitle(session.title); setIsEditing(false) }
            }}
          />
        ) : (
          <button
            className="session-title-btn"
            onClick={() => onOpen(session)}
            title="Open session"
          >
            {session.title}
          </button>
        )}
        <div className="session-card-actions">
          <button
            className="icon-btn"
            onClick={() => setIsEditing(true)}
            title="Rename"
          >
            ✏️
          </button>
          {confirmDelete ? (
            <>
              <button
                className="icon-btn icon-btn-danger"
                onClick={() => onDelete(session.id)}
                title="Confirm delete"
              >
                ✓
              </button>
              <button
                className="icon-btn"
                onClick={() => setConfirmDelete(false)}
                title="Cancel"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              className="icon-btn"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="session-card-meta">
        <span className="session-meta-item">🕐 {formatRelativeTime(session.createdAt)}</span>
        <span className="session-meta-item">⏱ {session.duration}</span>
        <span className="session-meta-item">📄 {session.slideCount} slides</span>
        <span className="session-meta-item">📸 {session.totalCaptures} captures</span>
        <span
          className="session-meta-item"
          style={{ color: confidenceColor(session.avgConfidence) }}
        >
          ◎ {session.avgConfidence.toFixed(0)}% conf.
        </span>
      </div>

      {session.keywords.length > 0 && (
        <div className="session-card-keywords">
          {session.keywords.slice(0, 6).map((kw, i) => (
            <span key={i} className="keyword-tag session-keyword-tag">{kw}</span>
          ))}
        </div>
      )}

      <div className="session-card-footer">
        <button className="btn btn-sm btn-primary" onClick={() => onOpen(session)}>
          Open
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => downloadMarkdown(session)}>
          ⬇ MD
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => downloadJSON(session)}>
          ⬇ JSON
        </button>
        <button className="btn btn-sm btn-secondary" onClick={handleCopy}>
          {copyStatus === 'copied' ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  )
}

export function SessionHistory({
  sessions,
  onClose,
  onOpen,
  onDelete,
  onRename,
}: SessionHistoryProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(s => {
      if (s.title.toLowerCase().includes(q)) return true
      if (s.keywords.some(k => k.toLowerCase().includes(q))) return true
      if (s.summary.fullText.toLowerCase().includes(q)) return true
      if (s.summary.properNouns.some(n => n.toLowerCase().includes(q))) return true
      return false
    })
  }, [sessions, query])

  return (
    <div className="history-overlay">
      <div className="history-modal">
        <div className="history-header">
          <h2>📂 Session History</h2>
          <button className="btn btn-dismiss" onClick={onClose}>✕ Close</button>
        </div>

        <div className="history-search">
          <input
            className="history-search-input"
            type="search"
            placeholder="🔍 Search sessions, keywords, entities…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <span className="history-search-count">
              {filtered.length} / {sessions.length} results
            </span>
          )}
        </div>

        <div className="history-body">
          {sessions.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">🗂️</div>
              <p className="history-empty-title">No sessions saved yet</p>
              <p className="history-empty-hint">
                Complete a screen-sharing session and it will automatically appear here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="history-empty">
              <p className="history-empty-title">No sessions match "{query}"</p>
            </div>
          ) : (
            <div className="session-list">
              {filtered.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onRename={onRename}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
