import type { SavedSession } from '../types'

const DB_NAME = 'screenshare-transcribe'
const DB_VERSION = 1
const STORE_NAME = 'sessions'

// Max results per session to avoid hitting storage limits
const MAX_RESULTS_PER_SESSION = 200

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

export async function saveSession(session: SavedSession): Promise<void> {
  const db = await openDB()

  // Trim results to avoid blowing up storage
  const trimmed: SavedSession = {
    ...session,
    results: session.results.slice(-MAX_RESULTS_PER_SESSION),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(trimmed)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function loadAllSessions(): Promise<SavedSession[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('createdAt')
    const req = index.getAll()
    req.onsuccess = () => {
      const sessions = (req.result as SavedSession[]).sort(
        (a, b) => b.createdAt - a.createdAt
      )
      resolve(sessions)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function loadSession(id: string): Promise<SavedSession | undefined> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result as SavedSession | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function renameSession(id: string, newTitle: string): Promise<void> {
  const session = await loadSession(id)
  if (!session) throw new Error(`Session ${id} not found`)
  await saveSession({ ...session, title: newTitle.trim(), updatedAt: Date.now() })
}
