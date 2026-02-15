import { useEffect, useRef } from 'react'

interface VideoPreviewProps {
  mediaStream: MediaStream | null
}

export function VideoPreview({ mediaStream }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream
    }
  }, [mediaStream])

  if (!mediaStream) {
    return (
      <div className="video-placeholder">
        <p>Click "Start Sharing" to begin screen capture</p>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="video-preview"
    />
  )
}
