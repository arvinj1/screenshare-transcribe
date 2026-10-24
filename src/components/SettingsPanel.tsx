import { useEffect, useRef, useState } from 'react'
import {
  CLAUDE_MODELS,
  CLIENT_LOAD_ERROR,
  maskKey,
  modelLabel,
  type AISettings,
  type ClaudeModelId,
  type SummaryMode,
} from '../services/aiSettings'

interface SettingsPanelProps {
  settings: AISettings
  onSave: (settings: AISettings) => void
  onForgetKey: () => void
  onClose: () => void
}

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'done'; ok: boolean; message: string; model: ClaudeModelId }

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'

/** What Tab can actually reach: visible, and only the checked radio of a group that has one. */
function isTabbable(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false // hidden, e.g. inside a closed <details>
  if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked) {
    const group = el.form ?? el.closest('[role="dialog"]')
    const hasChecked = group?.querySelector(`input[type="radio"][name="${el.name}"]:checked`)
    return !hasChecked
  }
  return true
}

export function SettingsPanel({ settings, onSave, onForgetKey, onClose }: SettingsPanelProps) {
  const [mode, setMode] = useState<SummaryMode>(settings.mode)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [rememberKey, setRememberKey] = useState(settings.rememberKey)
  const [model, setModel] = useState<ClaudeModelId>(settings.model)
  const [showKey, setShowKey] = useState(false)
  const [test, setTest] = useState<TestState>({ status: 'idle' })
  // Bumped whenever the key or model changes, so a slow test result for
  // earlier inputs is never shown against the current ones.
  const testIdRef = useRef(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  // Latest onClose without re-running the focus effect (parents pass inline callbacks)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Modal focus: move focus into the dialog, keep Tab/Shift+Tab inside it,
  // close on Escape, and give focus back to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusables = () => (dialog ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isTabbable) : [])
    const initial = dialog?.querySelector<HTMLElement>('input[name="mode"]:checked') ?? focusables()[0]
    initial?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !dialog.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      testIdRef.current += 1 // drop any test still running
      opener?.focus?.()
    }
  }, [])

  const resetTest = () => {
    testIdRef.current += 1
    setTest({ status: 'idle' })
  }

  const trimmedKey = apiKey.trim()
  const looksLikeKey = trimmedKey.length === 0 || trimmedKey.startsWith('sk-ant-')
  const needsKey = mode === 'claude' && trimmedKey.length === 0

  const handleTest = async () => {
    const testId = ++testIdRef.current
    const testedModel = model
    setTest({ status: 'testing' })
    let result: { ok: boolean; message: string }
    try {
      const { testApiKey } = await import('../services/aiSummarizer')
      result = await testApiKey(trimmedKey, testedModel)
    } catch {
      result = { ok: false, message: CLIENT_LOAD_ERROR }
    }
    if (testId !== testIdRef.current) return // key or model changed meanwhile
    setTest({ status: 'done', ...result, model: testedModel })
  }

  const handleSave = () => {
    onSave({ mode, apiKey: trimmedKey, rememberKey, model })
    onClose()
  }

  const handleForget = () => {
    setApiKey('')
    resetTest()
    onForgetKey()
  }

  return (
    <div className="summary-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="summary-modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="summary-header">
          <h2 id="settings-title">Settings</h2>
          <div className="summary-header-actions">
            <button className="btn btn-dismiss" onClick={onClose}>Cancel</button>
            <button className="btn btn-start" onClick={handleSave} disabled={needsKey}>Save</button>
          </div>
        </div>

        <div className="summary-content settings-content">
          <section className="settings-section">
            <h3>Summaries</h3>
            <p className="settings-help">
              When you stop a session, the app always writes a quick summary on this device. You can also have
              Claude rewrite it into a much clearer one using your own Anthropic API key.
            </p>

            <label className={`settings-choice ${mode === 'local' ? 'settings-choice-active' : ''}`}>
              <input type="radio" name="mode" checked={mode === 'local'} onChange={() => setMode('local')} />
              <span>
                <strong>On this device only</strong> — free, and nothing leaves your browser
              </span>
            </label>
            <label className={`settings-choice ${mode === 'claude' ? 'settings-choice-active' : ''}`}>
              <input type="radio" name="mode" checked={mode === 'claude'} onChange={() => setMode('claude')} />
              <span>
                <strong>Claude, with my API key</strong> — clearer summaries; you pay Anthropic per summary
              </span>
            </label>
          </section>

          {mode === 'claude' && (
            <>
              <section className="settings-section">
                <h3>Your Anthropic API key</h3>
                <div className="settings-key-row">
                  <input
                    className="settings-input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-ant-…"
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); resetTest() }}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Anthropic API key"
                  />
                  <button className="btn btn-dismiss" type="button" onClick={() => setShowKey(v => !v)}>
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="btn btn-dismiss"
                    type="button"
                    onClick={handleTest}
                    disabled={trimmedKey.length === 0 || test.status === 'testing'}
                  >
                    {test.status === 'testing' ? 'Testing…' : 'Test key'}
                  </button>
                </div>
                {!looksLikeKey && (
                  <p className="settings-status settings-status-warn">Anthropic API keys start with “sk-ant-”.</p>
                )}
                {test.status === 'done' && (
                  <p className={`settings-status ${test.ok ? 'settings-status-ok' : 'settings-status-error'}`}>
                    {test.ok ? `✓ ${test.message} with ${modelLabel(test.model)}` : `✗ ${test.message}`}
                  </p>
                )}
                {needsKey && <p className="settings-status settings-status-warn">Add a key to use Claude summaries.</p>}

                <label className="settings-checkbox">
                  <input type="checkbox" checked={rememberKey} onChange={e => setRememberKey(e.target.checked)} />
                  Remember on this device
                  <span className="settings-hint">
                    {rememberKey ? 'Kept in this browser until you forget it.' : 'Forgotten when you close this tab.'}
                  </span>
                </label>

                {settings.apiKey && (
                  <p className="settings-saved-key">
                    Saved key: <code>{maskKey(settings.apiKey)}</code>{' '}
                    <button className="settings-link" type="button" onClick={handleForget}>Forget key</button>
                  </p>
                )}

                <details className="settings-details">
                  <summary>Where does my key go?</summary>
                  <ul>
                    <li>Your browser sends it <strong>directly to api.anthropic.com</strong>. It never goes to this site’s server.</li>
                    <li>It’s stored only in this browser ({rememberKey ? 'local storage' : 'session storage'}). Other devices and browsers don’t have it.</li>
                    <li>Anyone with access to this browser profile could read a remembered key, so use a <strong>dedicated key with a spend limit</strong>.</li>
                    <li>
                      Create one at{' '}
                      <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.
                      A Claude.ai Pro, Max or Team subscription does not include API usage.
                    </li>
                  </ul>
                </details>
              </section>

              <section className="settings-section">
                <h3>Model</h3>
                <div className="settings-models">
                  {CLAUDE_MODELS.map(m => (
                    <label key={m.id} className={`settings-choice ${model === m.id ? 'settings-choice-active' : ''}`}>
                      <input
                        type="radio"
                        name="model"
                        checked={model === m.id}
                        onChange={() => { setModel(m.id); resetTest() }}
                      />
                      <span>
                        <strong>{m.label}</strong> — {m.description}
                        <span className="settings-cost">{m.approxCost} per summary</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="settings-help">
                  Costs are rough estimates for a typical session at Anthropic’s list prices; long sessions cost more.
                </p>
              </section>

              <section className="settings-section">
                <h3>What gets sent</h3>
                <p className="settings-help">
                  Once per session, when you stop: the text read from your slides and the speech transcript. Never
                  screen images, video or audio.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
