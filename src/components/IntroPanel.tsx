import { useState } from 'react'
import type { AppMode } from '../types'
import { isClaudeReady, maskKey, modelLabel, type AISettings } from '../services/aiSettings'

const DETAILS_KEY = 'st-intro-details-hidden'

function readDetailsHidden(): boolean {
  try {
    return localStorage.getItem(DETAILS_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDetailsHidden(hidden: boolean): void {
  try {
    localStorage.setItem(DETAILS_KEY, String(hidden))
  } catch {
    // Storage unavailable — preference lasts for this page only
  }
}

interface BrowserSupport {
  screenCapture: boolean
  speech: boolean
}

function detectSupport(): BrowserSupport {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return {
    screenCapture: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
    speech: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
  }
}

interface IntroPanelProps {
  mode: AppMode
  aiSettings: AISettings
  onStart: () => void
  onOpenSettings: () => void
}

export function IntroPanel({ mode, aiSettings, onStart, onOpenSettings }: IntroPanelProps) {
  const [detailsHidden, setDetailsHidden] = useState(readDetailsHidden)
  const [support] = useState(detectSupport)
  const audioOnly = mode === 'audio-only'
  const claude = isClaudeReady(aiSettings)

  const toggleDetails = () => {
    setDetailsHidden(prev => {
      writeDetailsHidden(!prev)
      return !prev
    })
  }

  const steps = audioOnly
    ? [
        { title: 'Start recording', body: 'Allow the microphone when your browser asks.' },
        { title: 'Talk', body: 'Speech is transcribed as you go.' },
        { title: 'Stop', body: 'Get a summary and transcript. Every session is saved to History.' },
      ]
    : [
        { title: 'Start sharing', body: 'Pick the browser tab with your slides or call. Allow the microphone too.' },
        { title: 'Present or watch', body: 'Slide text and speech appear live, grouped by slide.' },
        { title: 'Stop', body: 'Get a summary, a slide-by-slide timeline and the transcript. Saved to History.' },
      ]

  return (
    <section className="intro-panel" aria-labelledby="intro-title">
      <div className="intro-hero">
        <h2 id="intro-title">
          {audioOnly ? 'Turn a conversation into notes' : 'Turn a screen share into notes'}
        </h2>
        <p className="intro-lede">
          {audioOnly
            ? 'Records what’s said and writes a summary with key points and action items.'
            : 'Reads the text on your slides, transcribes what’s said, and writes a summary with key points and action items.'}
        </p>
      </div>

      <ol className="intro-steps">
        {steps.map((step, i) => (
          <li key={step.title} className="intro-step">
            <span className="intro-step-number">{i + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {(!support.screenCapture && !audioOnly) || !support.speech ? (
        <div className="intro-notice" role="note">
          {!support.screenCapture && !audioOnly && <p>This browser can’t share its screen. Use Chrome or Edge on a computer.</p>}
          {!support.speech && <p>This browser has no speech recognition, so you’ll get slide text without a transcript. Chrome or Edge work best.</p>}
        </div>
      ) : null}

      <div className="intro-actions">
        <button className="btn btn-start intro-start" onClick={onStart} disabled={!audioOnly && !support.screenCapture}>
          {audioOnly ? 'Start Recording' : 'Start Sharing'}
        </button>
        <div className="intro-summary-mode">
          <span className="intro-summary-label">Summaries:</span>{' '}
          {claude ? (
            <span>{modelLabel(aiSettings.model)} with your key <code>{maskKey(aiSettings.apiKey)}</code></span>
          ) : aiSettings.mode === 'claude' ? (
            <span>on this device (no API key added yet)</span>
          ) : (
            <span>on this device</span>
          )}{' '}
          <button className="settings-link" onClick={onOpenSettings}>
            {claude ? 'Change' : 'Use Claude for clearer summaries'}
          </button>
        </div>
      </div>

      <button className="settings-link intro-details-toggle" onClick={toggleDetails} aria-expanded={!detailsHidden}>
        {detailsHidden ? 'Show tips and privacy' : 'Hide tips and privacy'}
      </button>

      {!detailsHidden && (
        <div className="intro-details">
          <div className="intro-card">
            <h3>Tips for good results</h3>
            <ul>
              {!audioOnly && (
                <li><strong>Share a tab, not a window.</strong> Windows and screens include toolbars and menus that come out as garbled text.</li>
              )}
              {!audioOnly && <li><strong>Bigger text reads better.</strong> Present full screen or zoom in.</li>}
              <li><strong>Remote speaker?</strong> Speech comes from your microphone, so play the call through speakers, not headphones.</li>
              <li><strong>Long session?</strong> Everything is kept, but after 30 minutes consider stopping and starting fresh.</li>
            </ul>
          </div>
          <div className="intro-card">
            <h3>Privacy: what stays on your device, and what doesn’t</h3>
            <ul>
              <li><strong>Your screen never leaves this browser.</strong> Slide text is read here, on your computer.</li>
              <li><strong>Sessions are saved in this browser</strong> only. Open History to search, rename, export or delete them.</li>
              <li><strong>Speech:</strong> Chrome and Edge send microphone audio to their own speech service to transcribe it.</li>
              <li>
                <strong>Claude summaries are optional.</strong> When on, the text of the session is sent once, directly to
                Anthropic with your own key.
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
