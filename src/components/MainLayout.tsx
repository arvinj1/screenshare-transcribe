import type { OCRResult, AudioSegment } from '../types'
import { ScreenPanel } from './ScreenPanel'
import { OCRPanel } from './OCRPanel'

interface MainLayoutProps {
  mediaStream: MediaStream | null
  ocrResults: OCRResult[]
  audioSegments: AudioSegment[]
  isProcessing: boolean
}

export function MainLayout({ mediaStream, ocrResults, audioSegments, isProcessing }: MainLayoutProps) {
  return (
    <main className="main-layout">
      <ScreenPanel mediaStream={mediaStream} />
      <OCRPanel results={ocrResults} audioSegments={audioSegments} isProcessing={isProcessing} />
    </main>
  )
}
