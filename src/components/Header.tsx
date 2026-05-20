import { ShareControls } from './ShareControls'

interface HeaderProps {
  isSharing: boolean
  slideCount: number
  sessionCount: number
  isProcessing: boolean
  onStart: () => void
  onStop: () => void
  onOpenHistory: () => void
  onOpenHelp: () => void
}

export function Header({ isSharing, slideCount, sessionCount, isProcessing, onStart, onStop, onOpenHistory, onOpenHelp }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>ScreenShare Transcribe</h1>
        <span className="privacy-badge" title="All processing is local — no uploads">🔒 Local-only</span>
      </div>
      <div className="header-right">
        {isSharing && slideCount > 0 && (
          <span className="live-slide-count">📄 {slideCount} slide{slideCount !== 1 ? 's' : ''}</span>
        )}
        {isSharing && isProcessing && (
          <span className="processing-badge">🔄 OCR</span>
        )}
        <button className="btn btn-ghost" onClick={onOpenHistory} title="View session history">
          🗂️{sessionCount > 0 && <span className="history-count">{sessionCount}</span>}
        </button>
        <button className="btn btn-ghost" onClick={onOpenHelp} title="Help & privacy info">
          ❓
        </button>
        <ShareControls isSharing={isSharing} onStart={onStart} onStop={onStop} />
      </div>
    </header>
  )
}
