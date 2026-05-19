# Backend OCR + Open-Source SFU Integration

This app now supports an API-backed OCR path with open-source SFU metadata and optional realtime OCR result streaming.

## Runtime Flags

- `VITE_OCR_BACKEND_ENABLED` (`true|false`, default `false`)
  - Enables backend OCR path.
- `VITE_OCR_LEGACY_FALLBACK_ENABLED` (`true|false`, default `true`)
  - Falls back to local Tesseract provider if backend OCR fails.
- `VITE_OCR_API_BASE_URL` (default empty = same origin)
  - API base URL for OCR session and frame endpoints.
- `VITE_OCR_API_TOKEN`
  - Optional bearer token used for API auth.
- `VITE_OCR_REALTIME_TRANSPORT` (`sse|none`, default `sse`)
  - Enables SSE transport for pushed OCR frame results.
- `VITE_OCR_REQUEST_TIMEOUT_MS` (default `15000`)
  - Per-request timeout.
- `VITE_OCR_MAX_RETRIES` (default `2`)
  - Retries for failed backend requests.
- `VITE_SFU_PROVIDER` (`livekit|janus|mediasoup|custom`, default `livekit`)
  - Open-source SFU provider metadata sent to backend session init.
- `VITE_SFU_DEPLOYMENT` (default `self-hosted`)
  - Deployment descriptor metadata sent to backend.
- `VITE_SFU_ROOM_PREFIX` (default `screenshare`)
  - Room naming prefix metadata sent to backend.
- `VITE_REDACT_OCR_LOGS` (`true|false`, default `true`)
  - Privacy hint sent to backend policy layer.

## Frontend OCR Provider Model

- `src/services/ocrService.ts` now routes OCR through provider abstraction.
- Primary provider:
  - Backend OCR provider when `VITE_OCR_BACKEND_ENABLED=true`.
  - Local Tesseract provider when backend is disabled.
- Automatic fallback:
  - If backend fails and legacy fallback is enabled, the service switches to local Tesseract provider.

## Backend API Contract

### Create session

- `POST /api/ocr/sessions`
- Request includes:
  - `sfuProvider`, `sfuDeployment`, `roomPrefix`
  - `realtimeTransport`
  - `privacy.redactLogs`
- Response:
  - `sessionId`
  - optional `eventsUrl` for SSE

### Submit frame

- `POST /api/ocr/sessions/:sessionId/frames`
- Request includes:
  - `frameId`
  - `imageBase64` (JPEG)
  - `timestamp`
- Response (non-realtime fallback path):
  - `text`, `rawText`, `confidence`, optional `frameId`

### Realtime results (optional)

- `GET /api/ocr/sessions/:sessionId/events` (SSE)
- Each event payload should include:
  - `frameId`
  - `text`, `rawText`, `confidence`

### End session

- `DELETE /api/ocr/sessions/:sessionId`

## Session lifecycle and cleanup

- OCR session starts on screen-share start.
- OCR session is terminated when sharing stops (or when browser share ends).
- Session cleanup is best-effort and idempotent.

## Security and hardening expectations for backend

- Use short-lived, scoped auth tokens for OCR session APIs.
- Enforce stream/session access controls.
- Apply rate limits per user/session.
- Enforce TLS for signaling, stream transport, and OCR APIs.
- Redact OCR payloads in logs when policy requires it.
