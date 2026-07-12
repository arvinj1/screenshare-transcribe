## Exec Summary: Audio-Only Transcription Mode

**Goal:** Let users capture and transcribe microphone audio without requiring screen sharing — a standalone "Audio-only" mode alongside the existing Screen+OCR mode.

**User impact:** Users who want speech-to-text for meetings, lectures, or dictation no longer need to initiate a screen share. They pick "Audio-only", hit Start, and see live transcription immediately.

**What will change:**
- Mode toggle in the header: "Screen+OCR" (default) or "Audio-only"
- Audio-only mode: mic capture only, no screen share prompt
- Screen panel replaced with pulsing mic indicator when in audio-only mode
- Button labels adapt: "Start Sharing" vs "Start Recording"
- Session summary generated from audio transcript alone
- Mode toggle disabled while a session is active

**Out of scope:**
- Cloud STT / backend services (Web Speech API only)
- Simultaneous modes (mutually exclusive)
- Audio file upload / import
- Speaker diarization
- Rewriting existing Screen+OCR mode

**Success criteria:**
- User can toggle between modes before starting
- Audio-only starts mic without screen share prompt
- Live transcript segments appear with language and confidence
- Audio indicator replaces screen panel
- Stop produces a clean session summary from audio data
- Existing Screen+OCR mode is completely unchanged

**Rollout approach:** 7 incremental tasks on feat/v3-align-audio branch. Manual verification in Chrome.

**Risks / tradeoffs:**
- Web Speech API sends audio to Google in Chrome (same as existing audio pipeline)
- Audio-only summary is sparser than screen+OCR (acceptable for MVP)

**Open questions:** None — scope is clear and constrained.
