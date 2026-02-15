import { ShareControls } from './ShareControls'

interface HeaderProps {
  isSharing: boolean
  slideCount: number
  onStart: () => void
  onStop: () => void
}

export function Header({ isSharing, slideCount, onStart, onStop }: HeaderProps) {
  return (
    <header className="header">
      <h1>Screen Share Transcribe</h1>
      <div className="header-right">
        {isSharing && slideCount > 0 && (
          <span className="live-slide-count">📄 {slideCount} slide{slideCount !== 1 ? 's' : ''}</span>
        )}
        <ShareControls isSharing={isSharing} onStart={onStart} onStop={onStop} />
      </div>
    </header>
  )
}
