import type { AppMode } from '../types'
import { isClaudeReady, modelLabel, type AISettings } from '../services/aiSettings'
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
  aiSettings: AISettings
  onOpenSettings: () => void
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
  aiSettings,
  onOpenSettings,
  onOpenHistory,
  onStart,
  onStop,
}: HeaderProps) {
  const claude = isClaudeReady(aiSettings)
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
          className={`ai-toggle ${claude ? 'ai-toggle-on' : ''}`}
          onClick={onOpenSettings}
          disabled={isActive}
          title={claude
            ? `Summaries by ${modelLabel(aiSettings.model)} with your API key. Click to change.`
            : 'Summaries are written on this device. Click to use Claude with your own API key.'}
        >
          Settings{claude ? ` · ${modelLabel(aiSettings.model).replace('Claude ', '')}` : ''}
        </button>
        <button className="history-btn" onClick={onOpenHistory} disabled={isActive} title="Session history">
          History
        </button>
        <ShareControls mode={mode} isActive={isActive} onStart={onStart} onStop={onStop} />
      </div>
    </header>
  )
}
