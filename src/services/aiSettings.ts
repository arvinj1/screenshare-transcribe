/**
 * AI summary settings: mode, the user's own Anthropic API key, and model.
 *
 * The key never leaves this browser except in requests to api.anthropic.com.
 * With "remember on this device" it lives in localStorage; otherwise in
 * sessionStorage, which the browser clears when the tab closes.
 */

export type SummaryMode = 'local' | 'claude'

export type ClaudeModelId = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'

export interface ClaudeModelOption {
  id: ClaudeModelId
  label: string
  description: string
  /** Rough cost of one typical session summary, at list prices. */
  approxCost: string
}

export const CLAUDE_MODELS: ClaudeModelOption[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', description: 'Best at reading through noisy OCR and speech', approxCost: '~7¢' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', description: 'Balanced quality and speed', approxCost: '~3¢' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', description: 'Fastest and cheapest', approxCost: '~0.2¢' },
]

export const DEFAULT_MODEL: ClaudeModelId = 'claude-opus-5-5'

/** Shown when the on-demand Claude client can't be downloaded. */
export const CLIENT_LOAD_ERROR = 'Couldn’t load the Claude client — check your connection and reload the page'

export interface AISettings {
  mode: SummaryMode
  apiKey: string
  rememberKey: boolean
  model: ClaudeModelId
}

const MODE_KEY = 'st-summary-mode'
const API_KEY_KEY = 'st-anthropic-api-key'
const MODEL_KEY = 'st-claude-model'
// Written by earlier versions (AI toggle backed by a server key); cleared on save
const LEGACY_AI_KEY = 'st-ai-summaries-enabled'

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key)
    else storage().setItem(key, value)
  } catch {
    // Storage unavailable (private mode, blocked site data) — settings last for this page only
  }
}

const local = () => window.localStorage
const session = () => window.sessionStorage

let memoryKey = '' // fallback when both storages are unavailable

export function loadAISettings(): AISettings {
  const remembered = read(local, API_KEY_KEY)
  const sessionKey = read(session, API_KEY_KEY)
  const model = read(local, MODEL_KEY) as ClaudeModelId | null
  return {
    mode: read(local, MODE_KEY) === 'claude' ? 'claude' : 'local',
    apiKey: remembered ?? sessionKey ?? memoryKey,
    rememberKey: remembered !== null,
    model: CLAUDE_MODELS.some(m => m.id === model) ? (model as ClaudeModelId) : DEFAULT_MODEL,
  }
}

export function saveAISettings(settings: AISettings): void {
  const key = settings.apiKey.trim()
  write(local, MODE_KEY, settings.mode)
  write(local, MODEL_KEY, settings.model)
  write(local, LEGACY_AI_KEY, null)
  // Keep the key in exactly one place
  write(local, API_KEY_KEY, key && settings.rememberKey ? key : null)
  write(session, API_KEY_KEY, key && !settings.rememberKey ? key : null)
  memoryKey = key
}

export function forgetApiKey(): void {
  write(local, API_KEY_KEY, null)
  write(session, API_KEY_KEY, null)
  memoryKey = ''
}

/** True when summaries should be sent to Claude. */
export function isClaudeReady(settings: AISettings): boolean {
  return settings.mode === 'claude' && settings.apiKey.trim().length > 0
}

export function modelLabel(id: ClaudeModelId): string {
  return CLAUDE_MODELS.find(m => m.id === id)?.label ?? id
}

/** Show only the start and end of a key, e.g. "sk-ant-…a1B2". */
export function maskKey(key: string): string {
  const k = key.trim()
  return k.length <= 12 ? '••••' : `${k.slice(0, 7)}…${k.slice(-4)}`
}
