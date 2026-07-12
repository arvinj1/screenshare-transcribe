import type { SavedSession, SessionSummary } from '../types'

const DB_NAME = 'screenshare-transcribe'
const DB_VERSION = 1
const STORE = 'sessions'
const MAX_SLIDES_PER_SESSION = 200

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
      })
  )
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older Safari
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function defaultTitle(summary: SessionSummary): string {
  if (summary.aiTitle && summary.aiTitle.trim().length > 0) return summary.aiTitle.trim().slice(0, 80)
  const keywords = summary.keywords.slice(0, 3).join(', ')
  const date = new Date().toLocaleDateString()
  return keywords.length > 0 ? `${keywords} — ${date}` : `Session — ${date}`
}

/** Trim heavyweight fields so long sessions respect browser storage limits. */
function trimSummary(summary: SessionSummary): SessionSummary {
  return {
    ...summary,
    slides: summary.slides.slice(-MAX_SLIDES_PER_SESSION),
  }
}

export async function saveSession(summary: SessionSummary): Promise<SavedSession> {
  const now = Date.now()
  const session: SavedSession = {
    id: generateId(),
    title: defaultTitle(summary),
    createdAt: now,
    updatedAt: now,
    summary: trimSummary(summary),
  }
  await tx('readwrite', store => store.put(session))
  return session
}

export async function updateSession(session: SavedSession): Promise<void> {
  await tx('readwrite', store => store.put({ ...session, updatedAt: Date.now() }))
}

export async function listSessions(): Promise<SavedSession[]> {
  const all = await tx<SavedSession[]>('readonly', store => store.getAll())
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteSession(id: string): Promise<void> {
  await tx('readwrite', store => store.delete(id))
}

export function searchSessions(sessions: SavedSession[], query: string): SavedSession[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return sessions
  return sessions.filter(s => {
    const { summary } = s
    return (
      s.title.toLowerCase().includes(q) ||
      summary.fullText.toLowerCase().includes(q) ||
      summary.keywords.some(k => k.toLowerCase().includes(q)) ||
      summary.inference.narrative.toLowerCase().includes(q) ||
      summary.inference.topicClusters.some(cluster => cluster.some(t => t.toLowerCase().includes(q)))
    )
  })
}
