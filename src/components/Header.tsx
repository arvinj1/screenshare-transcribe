import { ShareControls } from './ShareControls'

interface HeaderProps {
  isSharing: boolean
  slideCount: number
  isListening: boolean
  audioError: string | null
  onStart: () => void
  onStop: () => void
}

export function Header({ isSharing, slideCount, isListening, audioError, onStart, onStop }: HeaderProps) {
  return (
    <header className="header">
      <h1>Screen Share Transcribe</h1>
      <div className="header-right">
        {isSharing && slideCount > 0 && (
          <span className="live-slide-count">📄 {slideCount} slide{slideCount !== 1 ? 's' : ''}</span>
        )}
        {isSharing && isListening && (
          <span className="live-audio-indicator">🎤 Listening</span>
        )}
        {isSharing && audioError && (
          <span className="audio-error-indicator" title={audioError}>🎤⚠️ No audio</span>
        )}
        <ShareControls isSharing={isSharing} onStart={onStart} onStop={onStop} />
      </div>
    </header>
  )
}
