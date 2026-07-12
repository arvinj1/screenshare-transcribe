import { useState, useCallback, useEffect } from 'react'
import type { SavedSession, SessionSummary } from '../types'
import {
  saveSession as storageSave,
  updateSession as storageUpdate,
  deleteSession as storageDelete,
  listSessions,
} from '../services/sessionStorage'

interface UseSessionHistoryReturn {
  sessions: SavedSession[]
  storageError: string | null
  saveSession: (summary: SessionSummary) => Promise<SavedSession | null>
  renameSession: (id: string, title: string) => Promise<boolean>
  deleteSession: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [storageError, setStorageError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setSessions(await listSessions())
      setStorageError(null)
    } catch {
      setStorageError('Session history is unavailable in this browser')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveSession = useCallback(
    async (summary: SessionSummary): Promise<SavedSession | null> => {
      try {
        const saved = await storageSave(summary)
        await refresh()
        return saved
      } catch {
        setStorageError('Could not save session (storage may be full)')
        return null
      }
    },
    [refresh]
  )

  const renameSession = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      const trimmed = title.trim().slice(0, 120)
      if (trimmed.length === 0) return false
      const session = sessions.find(s => s.id === id)
      if (!session) return false
      try {
        await storageUpdate({ ...session, title: trimmed })
        await refresh()
        return true
      } catch {
        setStorageError('Could not rename session')
        return false
      }
    },
    [sessions, refresh]
  )

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        await storageDelete(id)
        await refresh()
      } catch {
        setStorageError('Could not delete session')
      }
    },
    [refresh]
  )

  return { sessions, storageError, saveSession, renameSession, deleteSession, refresh }
}
