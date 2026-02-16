import { useRef, useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import { MainLayout } from './components/MainLayout'
import { SummaryView } from './components/SummaryView'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useOCR } from './hooks/useOCR'
import { useFrameExtractor } from './hooks/useFrameExtractor'
import { useSummary } from './hooks/useSummary'
import { useAudioCapture } from './hooks/useAudioCapture'
import type { AudioSegment } from './types'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([])
  const { mediaStream, isSharing, error, startCapture, stopCapture } = useScreenCapture()
  const { results, isProcessing, slideCount, sessionStart, processFrame, clearResults } = useOCR()
  const { summary, generateSummary, clearSummary } = useSummary()
  const { isListening, audioError, startAudio, stopAudio } = useAudioCapture()

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

  // Start audio capture when screen sharing starts
  useEffect(() => {
    if (isSharing) {
      startAudio((segment) => {
        if (segment.isFinal) {
          setAudioSegments(prev => [...prev.slice(-199), segment])
        }
      })
    }
    return () => {
      stopAudio()
    }
  }, [isSharing, startAudio, stopAudio])

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

  return (
    <div className="app">
      <Header
        isSharing={isSharing}
        slideCount={slideCount}
        isListening={isListening}
        audioError={audioError}
        onStart={startCapture}
        onStop={handleStop}
      />

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <MainLayout
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
