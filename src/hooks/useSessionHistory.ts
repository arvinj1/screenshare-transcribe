import { useState, useCallback, useEffect } from 'react'
import type { SavedSession } from '../types'
import {
  saveSession,
  loadAllSessions,
  deleteSession,
  renameSession,
} from '../services/sessionStorage'

interface UseSessionHistoryReturn {
  sessions: SavedSession[]
  isLoading: boolean
  save: (session: SavedSession) => Promise<void>
  remove: (id: string) => Promise<void>
  rename: (id: string, newTitle: string) => Promise<void>
  reload: () => Promise<void>
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const all = await loadAllSessions()
      setSessions(all)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (session: SavedSession) => {
      await saveSession(session)
      await reload()
    },
    [reload]
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteSession(id)
      await reload()
    },
    [reload]
  )

  const rename = useCallback(
    async (id: string, newTitle: string) => {
      await renameSession(id, newTitle)
      await reload()
    },
    [reload]
  )

  return { sessions, isLoading, save, remove, rename, reload }
}
