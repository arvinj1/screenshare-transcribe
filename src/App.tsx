import { useRef, useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import { MainLayout } from './components/MainLayout'
import { SummaryView } from './components/SummaryView'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useOCR } from './hooks/useOCR'
import { useFrameExtractor } from './hooks/useFrameExtractor'
import { useSummary } from './hooks/useSummary'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const { mediaStream, isSharing, error, startCapture, stopCapture } = useScreenCapture()
  const { results, isProcessing, slideCount, sessionStart, processFrame, clearResults } = useOCR()
  const { summary, generateSummary, clearSummary } = useSummary()

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

  const handleStop = useCallback(() => {
    generateSummary(results, sessionStart)
    stopCapture()
  }, [generateSummary, results, sessionStart, stopCapture])

  const handleDismissSummary = useCallback(() => {
    clearSummary()
    clearResults()
  }, [clearSummary, clearResults])

  return (
    <div className="app">
      <Header
        isSharing={isSharing}
        slideCount={slideCount}
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
        isProcessing={isProcessing}
      />

      <SummaryView summary={summary} results={results} onDismiss={handleDismissSummary} />
    </div>
  )
}

export default App
