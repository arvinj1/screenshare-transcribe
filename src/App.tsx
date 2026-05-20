import { useRef, useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import { MainLayout } from './components/MainLayout'
import { SummaryView } from './components/SummaryView'
import { SessionHistory } from './components/SessionHistory'
import { OnboardingModal, hasSeenOnboarding } from './components/OnboardingModal'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useOCR } from './hooks/useOCR'
import { useFrameExtractor } from './hooks/useFrameExtractor'
import { useSummary } from './hooks/useSummary'
import { useSessionHistory } from './hooks/useSessionHistory'
import type { SavedSession } from './types'

// Max session duration warning (30 minutes)
const SESSION_DURATION_WARN_MS = 30 * 60 * 1000

function buildSessionTitle(keywords: string[], timestamp: number): string {
  if (keywords.length > 0) {
    return keywords.slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' · ')
  }
  return `Session ${new Date(timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })}`
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding())
  const [currentSavedSession, setCurrentSavedSession] = useState<SavedSession | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [durationWarning, setDurationWarning] = useState(false)
  const sessionStartRef = useRef<number | null>(null)
  const durationTimerRef = useRef<number | null>(null)
  // Capture results and sessionStart at stop-time so the summary effect has stable data
  const pendingResultsRef = useRef<typeof results>([])
  const pendingSessionStartRef = useRef<number | null>(null)

  const { mediaStream, isSharing, error, startCapture, stopCapture } = useScreenCapture()
  const { results, isProcessing, slideCount, sessionStart, startSession, stopSession, processFrame, clearResults } = useOCR()
  const { summary, generateSummary, clearSummary } = useSummary()
  const { sessions, save: saveSession, remove: removeSession, rename: renameSession } = useSessionHistory()

  // Get video element reference from DOM after render and wait for it to be ready
  useEffect(() => {
    if (mediaStream && isSharing) {
      const video = document.querySelector('.video-preview') as HTMLVideoElement
      if (video) {
        videoRef.current = video
        
        const handleCanPlay = () => {
          setVideoReady(true)
        }
        
        video.addEventListener('canplay', handleCanPlay)
        
        return () => {
          video.removeEventListener('canplay', handleCanPlay)
        }
      }
    } else {
      videoRef.current = null
      setVideoReady(false)
    }
  }, [mediaStream, isSharing])

  useFrameExtractor(videoReady ? videoRef.current : null, isSharing, {
    intervalMs: 3000,
    isProcessing,
    onFrame: processFrame,
  })

  // Session duration warning
  useEffect(() => {
    if (isSharing) {
      sessionStartRef.current = Date.now()
      durationTimerRef.current = window.setInterval(() => {
        if (sessionStartRef.current && Date.now() - sessionStartRef.current > SESSION_DURATION_WARN_MS) {
          setDurationWarning(true)
        }
      }, 60_000)
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
      setDurationWarning(false)
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
    }
  }, [isSharing])

  const handleStart = useCallback(async () => {
    setIsSaved(false)
    setCurrentSavedSession(null)
    clearResults()
    await startCapture()
    await startSession()
  }, [startCapture, startSession, clearResults])

  const handleStop = useCallback(() => {
    // Snapshot the current results and sessionStart into refs before async state
    // changes occur, so the summary effect below has consistent data.
    pendingResultsRef.current = results
    pendingSessionStartRef.current = sessionStart
    generateSummary(results, sessionStart)
    // Session stop is best-effort cleanup and should not block UI stop flow.
    void stopSession()
    stopCapture()
  }, [generateSummary, results, sessionStart, stopCapture, stopSession])

  useEffect(() => {
    if (!isSharing) {
      // Browser-level share end can happen outside our stop handler.
      void stopSession()
    }
  }, [isSharing, stopSession])

  // Build SavedSession when summary is generated, using the snapshotted stop-time data
  useEffect(() => {
    if (!summary) return
    const snapshotResults = pendingResultsRef.current
    const snapshotStart = pendingSessionStartRef.current
    if (snapshotResults.length === 0) return
    const ts = snapshotStart ?? Date.now()
    const durationMs = snapshotStart ? Date.now() - snapshotStart : 0
    const session: SavedSession = {
      id: crypto.randomUUID(),
      title: buildSessionTitle(summary.keywords, ts),
      createdAt: ts,
      updatedAt: Date.now(),
      duration: summary.duration,
      durationMs,
      slideCount: summary.slideCount,
      totalCaptures: summary.totalCaptures,
      avgConfidence: summary.avgConfidence,
      keywords: summary.keywords,
      summary,
      results: snapshotResults,
    }
    setCurrentSavedSession(session)
  }, [summary])

  const handleAutoSave = useCallback(async () => {
    if (!currentSavedSession) return
    await saveSession(currentSavedSession)
    setIsSaved(true)
  }, [currentSavedSession, saveSession])

  // Auto-save whenever a new session is ready
  useEffect(() => {
    if (currentSavedSession && !isSaved) {
      void handleAutoSave()
    }
  }, [currentSavedSession, isSaved, handleAutoSave])

  const handleDismissSummary = useCallback(() => {
    clearSummary()
    clearResults()
    setCurrentSavedSession(null)
    setIsSaved(false)
  }, [clearSummary, clearResults])

  const handleOpenSession = useCallback((session: SavedSession) => {
    setCurrentSavedSession(session)
    setIsSaved(true)
    setShowHistory(false)
  }, [])

  return (
    <div className="app">
      <Header
        isSharing={isSharing}
        slideCount={slideCount}
        sessionCount={sessions.length}
        isProcessing={isProcessing}
        onStart={handleStart}
        onStop={handleStop}
        onOpenHistory={() => setShowHistory(true)}
        onOpenHelp={() => setShowOnboarding(true)}
      />

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {durationWarning && isSharing && (
        <div className="warning-banner">
          ⚠️ Long session detected (30+ min). Consider stopping soon to keep memory usage manageable.
          <button className="banner-dismiss" onClick={() => setDurationWarning(false)}>✕</button>
        </div>
      )}

      <MainLayout
        mediaStream={mediaStream}
        ocrResults={results}
        isProcessing={isProcessing}
      />

      {(summary || currentSavedSession?.summary) && (
        <SummaryView
          summary={summary ?? (currentSavedSession?.summary ?? null)}
          results={results.length > 0 ? results : (currentSavedSession?.results ?? [])}
          savedSession={currentSavedSession}
          onDismiss={handleDismissSummary}
          onSave={!isSaved ? handleAutoSave : undefined}
          isSaved={isSaved}
        />
      )}

      {showHistory && (
        <SessionHistory
          sessions={sessions}
          onClose={() => setShowHistory(false)}
          onOpen={handleOpenSession}
          onDelete={removeSession}
          onRename={renameSession}
        />
      )}

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}

export default App
