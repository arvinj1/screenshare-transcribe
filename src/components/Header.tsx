import type { AppMode } from '../types'
import { ShareControls } from './ShareControls'

interface HeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  isActive: boolean
  isSharing: boolean
  slideCount: number
  isListening: boolean
  audioError: string | null
  onStart: () => void
  onStop: () => void
}

export function Header({ mode, onModeChange, isActive, isSharing, slideCount, isListening, audioError, onStart, onStop }: HeaderProps) {
  return (
    <header className="header">
      <h1>Screen Share Transcribe</h1>
      <div className="header-right">
        <div className={`mode-toggle ${isActive ? 'mode-toggle-disabled' : ''}`}>
          <button
            className={`mode-toggle-btn ${mode === 'screen-ocr' ? 'active' : ''}`}
            onClick={() => onModeChange('screen-ocr')}
            disabled={isActive}
          >
            Screen+OCR
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'audio-only' ? 'active' : ''}`}
            onClick={() => onModeChange('audio-only')}
            disabled={isActive}
          >
            Audio Only
          </button>
        </div>
        {mode === 'screen-ocr' && isSharing && slideCount > 0 && (
          <span className="live-slide-count">{slideCount} slide{slideCount !== 1 ? 's' : ''}</span>
        )}
        {isActive && isListening && (
          <span className="live-audio-indicator">Listening</span>
        )}
        {isActive && audioError && (
          <span className="audio-error-indicator" title={audioError}>No audio</span>
        )}
        <ShareControls mode={mode} isActive={isActive} onStart={onStart} onStop={onStop} />
      </div>
    </header>
  )
}
