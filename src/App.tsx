import { useRef, useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import { MainLayout } from './components/MainLayout'
import { SummaryView } from './components/SummaryView'
import { SessionHistory } from './components/SessionHistory'
import { OnboardingModal, shouldShowOnboarding, dismissOnboarding } from './components/OnboardingModal'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useOCR } from './hooks/useOCR'
import { useFrameExtractor } from './hooks/useFrameExtractor'
import { useSummary } from './hooks/useSummary'
import { useAudioCapture } from './hooks/useAudioCapture'
import { useSessionHistory } from './hooks/useSessionHistory'
import { isAIEnabled, setAIEnabled } from './services/aiSummarizer'
import type { AppMode, AudioSegment, SavedSession } from './types'

const LONG_SESSION_WARNING_MS = 30 * 60 * 1000

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([])
  const [mode, setMode] = useState<AppMode>('screen-ocr')
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding)
  const [aiEnabled, setAiEnabledState] = useState(isAIEnabled)
  const [longSession, setLongSession] = useState(false)
  const [viewingSaved, setViewingSaved] = useState<SavedSession | null>(null)
  const audioOnlyStartRef = useRef<number | null>(null)
  const summaryHandledRef = useRef(false)
  const prevSharingRef = useRef(false)
  const sessionSavedRef = useRef(false)

  const { mediaStream, isSharing, error, startCapture, stopCapture } = useScreenCapture()
  const { results, isProcessing, slideCount, sessionStart, processFrame, clearResults } = useOCR()
  const { summary, aiStatus, generateSummary, loadSummary, clearSummary } = useSummary()
  const { isListening, audioError, startAudio, stopAudio } = useAudioCapture()
  const { sessions, storageError, saveSession, renameSession, deleteSession } = useSessionHistory()

  const isActive = isSharing || isRecordingAudio

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
    onFrame: processFrame,
    isBusy: isProcessing,
  })

  // Start audio capture when screen sharing starts (screen-ocr mode only)
  useEffect(() => {
    if (isSharing && mode === 'screen-ocr') {
      startAudio((segment) => {
        if (segment.isFinal) {
          setAudioSegments(prev => [...prev.slice(-199), segment])
        }
      })
    }
    return () => {
      if (mode === 'screen-ocr') {
        stopAudio()
      }
    }
  }, [isSharing, mode, startAudio, stopAudio])

  // If sharing ends from the browser's own "Stop sharing" control (not our
  // button), still finish the session: stop audio and generate the summary.
  useEffect(() => {
    if (prevSharingRef.current && !isSharing && mode === 'screen-ocr' && !summaryHandledRef.current) {
      summaryHandledRef.current = true
      stopAudio()
      if (results.length > 0 || audioSegments.some(s => s.isFinal)) {
        generateSummary(results, sessionStart, audioSegments)
      }
    }
    prevSharingRef.current = isSharing
  }, [isSharing, mode, results, sessionStart, audioSegments, generateSummary, stopAudio])

  // Long-session warning (client-side OCR gets heavy over time)
  useEffect(() => {
    if (!isActive) {
      setLongSession(false)
      return
    }
    const timer = window.setTimeout(() => setLongSession(true), LONG_SESSION_WARNING_MS)
    return () => window.clearTimeout(timer)
  }, [isActive])

  // Auto-save the session once the summary has settled (AI done/failed/off)
  useEffect(() => {
    if (!summary || viewingSaved || sessionSavedRef.current) return
    if (summary.totalCaptures === 0 && summary.audioSegmentCount === 0) return
    if (aiStatus === 'loading') return
    sessionSavedRef.current = true
    void saveSession(summary)
  }, [summary, aiStatus, viewingSaved, saveSession])

  // Audio-only mode: start recording
  const handleStartAudioOnly = useCallback(() => {
    audioOnlyStartRef.current = Date.now()
    sessionSavedRef.current = false
    setIsRecordingAudio(true)
    startAudio((segment) => {
      if (segment.isFinal) {
        setAudioSegments(prev => [...prev.slice(-199), segment])
      }
    })
  }, [startAudio])

  // Audio-only mode: stop recording
  const handleStopAudioOnly = useCallback(() => {
    generateSummary([], audioOnlyStartRef.current, audioSegments)
    stopAudio()
    setIsRecordingAudio(false)
    audioOnlyStartRef.current = null
  }, [generateSummary, audioSegments, stopAudio])

  // Screen-ocr mode: start sharing
  const handleStartSharing = useCallback(() => {
    summaryHandledRef.current = false
    sessionSavedRef.current = false
    void startCapture()
  }, [startCapture])

  // Screen-ocr mode: stop sharing
  const handleStop = useCallback(() => {
    summaryHandledRef.current = true
    generateSummary(results, sessionStart, audioSegments)
    stopAudio()
    stopCapture()
  }, [generateSummary, results, sessionStart, audioSegments, stopAudio, stopCapture])

  const handleDismissSummary = useCallback(() => {
    clearSummary()
    if (viewingSaved) {
      setViewingSaved(null)
    } else {
      clearResults()
      setAudioSegments([])
    }
  }, [clearSummary, clearResults, viewingSaved])

  const handleOpenSession = useCallback((session: SavedSession) => {
    setViewingSaved(session)
    loadSummary(session.summary)
    setHistoryOpen(false)
  }, [loadSummary])

  const handleToggleAI = useCallback(() => {
    setAiEnabledState(prev => {
      setAIEnabled(!prev)
      return !prev
    })
  }, [])

  const handleDismissOnboarding = useCallback(() => {
    dismissOnboarding()
    setShowOnboarding(false)
  }, [])

  // Dispatch start/stop based on mode
  const handleStart = mode === 'audio-only' ? handleStartAudioOnly : handleStartSharing
  const handleStopDispatch = mode === 'audio-only' ? handleStopAudioOnly : handleStop

  return (
    <div className="app">
      <Header
        mode={mode}
        onModeChange={setMode}
        isActive={isActive}
        isSharing={isSharing}
        slideCount={slideCount}
        isListening={isListening}
        audioError={audioError}
        isProcessing={isProcessing}
        aiEnabled={aiEnabled}
        onToggleAI={handleToggleAI}
        onOpenHistory={() => setHistoryOpen(true)}
        onStart={handleStart}
        onStop={handleStopDispatch}
      />

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {longSession && (
        <div className="warning-banner">
          This session has been running for over 30 minutes — client-side OCR can get heavy. Consider stopping to generate a summary, then starting a fresh session.
        </div>
      )}

      <MainLayout
        mode={mode}
        isActive={isActive}
        mediaStream={mediaStream}
        ocrResults={results}
        audioSegments={audioSegments}
        isProcessing={isProcessing}
      />

      <SummaryView summary={summary} aiStatus={aiStatus} onDismiss={handleDismissSummary} />

      {historyOpen && (
        <SessionHistory
          sessions={sessions}
          storageError={storageError}
          onClose={() => setHistoryOpen(false)}
          onOpenSession={handleOpenSession}
          onRename={renameSession}
          onDelete={deleteSession}
        />
      )}

      {showOnboarding && <OnboardingModal onDismiss={handleDismissOnboarding} />}
    </div>
  )
}

export default App
