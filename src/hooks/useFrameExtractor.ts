import { useCallback, useRef, useEffect } from 'react'

interface UseFrameExtractorOptions {
  intervalMs?: number
  isProcessing?: boolean
  onFrame: (canvas: HTMLCanvasElement) => void
}

const MAX_CANVAS_DIMENSION = 1920

export function useFrameExtractor(
  videoElement: HTMLVideoElement | null,
  isActive: boolean,
  options: UseFrameExtractorOptions
) {
  const { intervalMs = 3000, isProcessing = false, onFrame } = options
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<number | null>(null)
  const isProcessingRef = useRef(isProcessing)

  // Keep a ref in sync so the interval callback always sees the latest value
  // without causing the effect to re-run on every processing toggle.
  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  const extractFrame = useCallback(() => {
    if (!videoElement || videoElement.readyState < 2) return

    // Skip frame if previous OCR is still in flight
    if (isProcessingRef.current) return

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const canvas = canvasRef.current
    let w = videoElement.videoWidth
    let h = videoElement.videoHeight

    // Downscale very large captures to keep OCR fast
    if (w > MAX_CANVAS_DIMENSION || h > MAX_CANVAS_DIMENSION) {
      const scale = MAX_CANVAS_DIMENSION / Math.max(w, h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }

    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, w, h)
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
