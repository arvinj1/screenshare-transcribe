import { useEffect, useState } from 'react'
import {
  CLAUDE_MODELS,
  maskKey,
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

type TestState = { status: 'idle' } | { status: 'testing' } | { status: 'done'; ok: boolean; message: string }

export function SettingsPanel({ settings, onSave, onForgetKey, onClose }: SettingsPanelProps) {
  const [mode, setMode] = useState<SummaryMode>(settings.mode)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [rememberKey, setRememberKey] = useState(settings.rememberKey)
  const [model, setModel] = useState<ClaudeModelId>(settings.model)
  const [showKey, setShowKey] = useState(false)
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const trimmedKey = apiKey.trim()
  const looksLikeKey = trimmedKey.length === 0 || trimmedKey.startsWith('sk-ant-')
  const needsKey = mode === 'claude' && trimmedKey.length === 0

  const handleTest = async () => {
    setTest({ status: 'testing' })
    const { testApiKey } = await import('../services/aiSummarizer')
    const result = await testApiKey(trimmedKey, model)
    setTest({ status: 'done', ...result })
  }

  const handleSave = () => {
    onSave({ mode, apiKey: trimmedKey, rememberKey, model })
    onClose()
  }

  const handleForget = () => {
    setApiKey('')
    setTest({ status: 'idle' })
    onForgetKey()
  }

  return (
    <div className="summary-overlay" onClick={onClose}>
      <div
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
                    onChange={e => { setApiKey(e.target.value); setTest({ status: 'idle' }) }}
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
                    {test.ok ? `✓ ${test.message} with ${CLAUDE_MODELS.find(m => m.id === model)?.label}` : `✗ ${test.message}`}
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
                        onChange={() => { setModel(m.id); setTest({ status: 'idle' }) }}
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
