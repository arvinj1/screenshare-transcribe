import type { OCRResult } from '../types'
import { ScreenPanel } from './ScreenPanel'
import { OCRPanel } from './OCRPanel'

interface MainLayoutProps {
  mediaStream: MediaStream | null
  ocrResults: OCRResult[]
  isProcessing: boolean
}

export function MainLayout({ mediaStream, ocrResults, isProcessing }: MainLayoutProps) {
  return (
    <main className="main-layout">
      <ScreenPanel mediaStream={mediaStream} />
      <OCRPanel results={ocrResults} isProcessing={isProcessing} />
    </main>
  )
}
