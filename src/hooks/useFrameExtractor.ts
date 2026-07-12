import { useCallback, useRef, useEffect } from 'react'

// Downscale captures before OCR — keeps Tesseract fast without hurting accuracy
const MAX_FRAME_WIDTH = 1920

interface UseFrameExtractorOptions {
  intervalMs?: number
  onFrame: (canvas: HTMLCanvasElement) => void
  /** When true, scheduled frames are skipped so OCR work never piles up. */
  isBusy?: boolean
}

export function useFrameExtractor(
  videoElement: HTMLVideoElement | null,
  isActive: boolean,
  options: UseFrameExtractorOptions
) {
  const { intervalMs = 3000, onFrame, isBusy = false } = options
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<number | null>(null)
  const busyRef = useRef(isBusy)

  // Keep the latest busy flag visible to the interval callback without
  // recreating the interval on every OCR state change.
  useEffect(() => {
    busyRef.current = isBusy
  }, [isBusy])

  const extractFrame = useCallback(() => {
    if (!videoElement || videoElement.readyState < 2) return
    if (busyRef.current) return // previous OCR still running — skip this frame

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const canvas = canvasRef.current
    const scale = videoElement.videoWidth > MAX_FRAME_WIDTH
      ? MAX_FRAME_WIDTH / videoElement.videoWidth
      : 1
    canvas.width = Math.round(videoElement.videoWidth * scale)
    canvas.height = Math.round(videoElement.videoHeight * scale)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      onFrame(canvas)
    }
  }, [videoElement, onFrame])

  useEffect(() => {
    if (isActive && videoElement) {
      intervalRef.current = window.setInterval(extractFrame, intervalMs)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, videoElement, intervalMs, extractFrame])
}
