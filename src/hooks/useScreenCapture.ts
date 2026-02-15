import { useState, useCallback, useRef } from 'react'

interface UseScreenCaptureReturn {
  mediaStream: MediaStream | null
  isSharing: boolean
  error: string | null
  startCapture: () => Promise<void>
  stopCapture: () => void
}

export function useScreenCapture(): UseScreenCaptureReturn {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCapture = useCallback(async () => {
    try {
      setError(null)

      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser')
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      })

      streamRef.current = stream
      setMediaStream(stream)
      setIsSharing(true)

      stream.getVideoTracks()[0].onended = () => {
        setIsSharing(false)
        setMediaStream(null)
        streamRef.current = null
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen capture'
      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setError('Screen sharing permission was denied')
      } else {
        setError(message)
      }
      setIsSharing(false)
      setMediaStream(null)
    }
  }, [])

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setMediaStream(null)
    setIsSharing(false)
  }, [])

  return {
    mediaStream,
    isSharing,
    error,
    startCapture,
    stopCapture,
  }
}
