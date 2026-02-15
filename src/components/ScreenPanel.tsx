import { VideoPreview } from './VideoPreview'

interface ScreenPanelProps {
  mediaStream: MediaStream | null
}

export function ScreenPanel({ mediaStream }: ScreenPanelProps) {
  return (
    <div className="screen-panel">
      <VideoPreview mediaStream={mediaStream} />
    </div>
  )
}
