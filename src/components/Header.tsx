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
  isProcessing: boolean
  aiEnabled: boolean
  onToggleAI: () => void
  onOpenHistory: () => void
  onStart: () => void
  onStop: () => void
}

export function Header({
  mode,
  onModeChange,
  isActive,
  isSharing,
  slideCount,
  isListening,
  audioError,
  isProcessing,
  aiEnabled,
  onToggleAI,
  onOpenHistory,
  onStart,
  onStop,
}: HeaderProps) {
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
        {isSharing && isProcessing && (
          <span className="ocr-indicator" title="OCR in progress">OCR</span>
        )}
        {isActive && isListening && (
          <span className="live-audio-indicator">Listening</span>
        )}
        {isActive && audioError && (
          <span className="audio-error-indicator" title={audioError}>No audio</span>
        )}
        <button
          className={`ai-toggle ${aiEnabled ? 'ai-toggle-on' : ''}`}
          onClick={onToggleAI}
          disabled={isActive}
          title={aiEnabled
            ? 'AI summaries on: captured text is sent to the Claude API once per session. Click for local-only.'
            : 'AI summaries off: summaries are generated locally with heuristics. Click to enable AI.'}
        >
          AI {aiEnabled ? 'on' : 'off'}
        </button>
        <button className="history-btn" onClick={onOpenHistory} disabled={isActive} title="Session history">
          History
        </button>
        <ShareControls mode={mode} isActive={isActive} onStart={onStart} onStop={onStop} />
      </div>
    </header>
  )
}
