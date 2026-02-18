import { useRef, useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import { MainLayout } from './components/MainLayout'
import { SummaryView } from './components/SummaryView'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useOCR } from './hooks/useOCR'
import { useFrameExtractor } from './hooks/useFrameExtractor'
import { useSummary } from './hooks/useSummary'
import { useAudioCapture } from './hooks/useAudioCapture'
import type { AppMode, AudioSegment } from './types'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([])
  const [mode, setMode] = useState<AppMode>('screen-ocr')
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const audioOnlyStartRef = useRef<number | null>(null)
  const { mediaStream, isSharing, error, startCapture, stopCapture } = useScreenCapture()
  const { results, isProcessing, slideCount, sessionStart, processFrame, clearResults } = useOCR()
  const { summary, generateSummary, clearSummary } = useSummary()
  const { isListening, audioError, startAudio, stopAudio } = useAudioCapture()

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

  // Audio-only mode: start recording
  const handleStartAudioOnly = useCallback(() => {
    audioOnlyStartRef.current = Date.now()
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

  // Screen-ocr mode: stop sharing
  const handleStop = useCallback(() => {
    generateSummary(results, sessionStart, audioSegments)
    stopAudio()
    stopCapture()
  }, [generateSummary, results, sessionStart, audioSegments, stopAudio, stopCapture])

  const handleDismissSummary = useCallback(() => {
    clearSummary()
    clearResults()
    setAudioSegments([])
  }, [clearSummary, clearResults])

  // Dispatch start/stop based on mode
  const handleStart = mode === 'audio-only' ? handleStartAudioOnly : startCapture
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
        onStart={handleStart}
        onStop={handleStopDispatch}
      />

      {error && (
        <div className="error-banner">
          {error}
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

      <SummaryView summary={summary} onDismiss={handleDismissSummary} />
    </div>
  )
}

export default App
