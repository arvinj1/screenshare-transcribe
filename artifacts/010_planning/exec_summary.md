## Exec Summary: Audio Alignment for Screenshare Transcription

**Goal:** Pair real-time audio transcription with the existing OCR pipeline so users get a time-synced view of what was shown + what was said.

**User impact:** Users capture richer meeting/presentation context — verbal explanations appear alongside extracted screen text, and the session summary incorporates both sources.

**What will change:**
- Microphone audio captured alongside screen share (browser permission prompt)
- Real-time speech-to-text via Web Speech API (zero new dependencies)
- Audio transcript segments displayed interleaved with OCR results by timestamp
- Summary view includes both OCR and audio data

**Out of scope:**
- Speaker diarization
- Video recording / playback
- Server-side processing
- Offline transcription (future: Whisper WASM)

**Success criteria:**
- Audio captured when sharing starts
- Audio transcript visible alongside OCR results
- Timestamps correlate between audio and OCR
- Summary incorporates both data sources
- Graceful fallback if mic permission denied

**Rollout approach:** Feature branch (feat/v3-align-audio), 9 incremental tasks, manual test in Chrome.

**Risks / tradeoffs:**
- Web Speech API sends audio to Google servers (acceptable for MVP; document for user)
- Chromium-only (matches existing browser target)

**Open questions:** None — scope is clear.
