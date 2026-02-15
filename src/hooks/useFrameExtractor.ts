import { useCallback, useRef, useEffect } from 'react'

interface UseFrameExtractorOptions {
  intervalMs?: number
  onFrame: (canvas: HTMLCanvasElement) => void
}

export function useFrameExtractor(
  videoElement: HTMLVideoElement | null,
  isActive: boolean,
  options: UseFrameExtractorOptions
) {
  const { intervalMs = 3000, onFrame } = options
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<number | null>(null)

  const extractFrame = useCallback(() => {
    if (!videoElement || videoElement.readyState < 2) return

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const canvas = canvasRef.current
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0)
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
