type SfuProvider = 'livekit' | 'janus' | 'mediasoup' | 'custom'
type RealtimeTransport = 'none' | 'sse'

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const runtimeConfig = {
  ocr: {
    backendEnabled: toBool(import.meta.env.VITE_OCR_BACKEND_ENABLED, false),
    legacyFallbackEnabled: toBool(import.meta.env.VITE_OCR_LEGACY_FALLBACK_ENABLED, true),
    apiBaseUrl: import.meta.env.VITE_OCR_API_BASE_URL || '',
    authToken: import.meta.env.VITE_OCR_API_TOKEN || '',
    requestTimeoutMs: toNumber(import.meta.env.VITE_OCR_REQUEST_TIMEOUT_MS, 15000),
    maxRetries: toNumber(import.meta.env.VITE_OCR_MAX_RETRIES, 2),
    realtimeTransport: (import.meta.env.VITE_OCR_REALTIME_TRANSPORT as RealtimeTransport) || 'sse',
  },
  sfu: {
    provider: (import.meta.env.VITE_SFU_PROVIDER as SfuProvider) || 'livekit',
    deployment: import.meta.env.VITE_SFU_DEPLOYMENT || 'self-hosted',
    roomPrefix: import.meta.env.VITE_SFU_ROOM_PREFIX || 'screenshare',
  },
  privacy: {
    redactLogs: toBool(import.meta.env.VITE_REDACT_OCR_LOGS, true),
  },
} as const
