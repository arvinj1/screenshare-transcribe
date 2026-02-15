interface ShareControlsProps {
  isSharing: boolean
  onStart: () => void
  onStop: () => void
}

export function ShareControls({ isSharing, onStart, onStop }: ShareControlsProps) {
  return (
    <div className="share-controls">
      {isSharing ? (
        <button className="btn btn-stop" onClick={onStop}>
          Stop Sharing
        </button>
      ) : (
        <button className="btn btn-start" onClick={onStart}>
          Start Sharing
        </button>
      )}
    </div>
  )
}
