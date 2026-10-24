import type { AppMode } from '../types'
import { startBlockedReason } from '../services/browserSupport'

interface ShareControlsProps {
  mode: AppMode
  isActive: boolean
  onStart: () => void
  onStop: () => void
}

export function ShareControls({ mode, isActive, onStart, onStop }: ShareControlsProps) {
  const startLabel = mode === 'audio-only' ? 'Start Recording' : 'Start Sharing'
  const stopLabel = mode === 'audio-only' ? 'Stop Recording' : 'Stop Sharing'
  const blockedReason = startBlockedReason(mode)

  return (
    <div className="share-controls">
      {isActive ? (
        <button className="btn btn-stop" onClick={onStop}>
          {stopLabel}
        </button>
      ) : (
        <button
          className="btn btn-start"
          onClick={onStart}
          disabled={blockedReason !== null}
          title={blockedReason ?? undefined}
        >
          {startLabel}
        </button>
      )}
    </div>
  )
}
