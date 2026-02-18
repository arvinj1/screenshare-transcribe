import type { AppMode, OCRResult, AudioSegment } from '../types'
import { ScreenPanel } from './ScreenPanel'
import { AudioOnlyPanel } from './AudioOnlyPanel'
import { OCRPanel } from './OCRPanel'

interface MainLayoutProps {
  mode: AppMode
  isActive: boolean
  mediaStream: MediaStream | null
  ocrResults: OCRResult[]
  audioSegments: AudioSegment[]
  isProcessing: boolean
}

export function MainLayout({ mode, isActive, mediaStream, ocrResults, audioSegments, isProcessing }: MainLayoutProps) {
  return (
    <main className="main-layout">
      {mode === 'audio-only' ? (
        <AudioOnlyPanel isActive={isActive} />
      ) : (
        <ScreenPanel mediaStream={mediaStream} />
      )}
      <OCRPanel results={ocrResults} audioSegments={audioSegments} isProcessing={isProcessing} />
    </main>
  )
}
