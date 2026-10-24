import { useCallback, useRef, useEffect } from 'react'
import { THUMB_WIDTH, THUMB_HEIGHT, MAX_SKIP_MS, toGrayscale, hasFrameChanged } from '../services/frameDiff'

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
  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // Thumbnail of the last frame sent to OCR; unchanged frames are skipped
  const lastThumbRef = useRef<Uint8Array | null>(null)
  const lastOcrAtRef = useRef(0)

  // Keep the latest busy flag visible to the interval callback without
  // recreating the interval on every OCR state change.
  useEffect(() => {
    busyRef.current = isBusy
  }, [isBusy])

  const extractFrame = useCallback(() => {
    if (!videoElement || videoElement.readyState < 2) return
    if (busyRef.current) return // previous OCR still running — skip this frame

    // Compare a tiny grayscale thumbnail with the last OCR'd frame first:
    // a static slide produces the same text, so skip the expensive OCR.
    if (!thumbCanvasRef.current) {
      thumbCanvasRef.current = document.createElement('canvas')
      thumbCanvasRef.current.width = THUMB_WIDTH
      thumbCanvasRef.current.height = THUMB_HEIGHT
    }
    const thumbCtx = thumbCanvasRef.current.getContext('2d', { willReadFrequently: true })
    if (thumbCtx) {
      thumbCtx.drawImage(videoElement, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
      const thumb = toGrayscale(thumbCtx.getImageData(0, 0, THUMB_WIDTH, THUMB_HEIGHT).data)
      const now = Date.now()
      if (!hasFrameChanged(lastThumbRef.current, thumb) && now - lastOcrAtRef.current < MAX_SKIP_MS) return
      lastThumbRef.current = thumb
      lastOcrAtRef.current = now
    }

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
      lastThumbRef.current = null // new capture: always OCR the first frame
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
