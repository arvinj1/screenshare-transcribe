**NOTE:** `project_key` is blank in jira_payload.yaml — fill in your Jira project key before importing.

---

## Epic: Audio-only transcription mode

### Goal
Let users capture and transcribe microphone audio without requiring screen sharing — a standalone "Audio-only" mode alongside the existing Screen+OCR mode.

### Scope

**In scope:**
- Mode toggle: "Screen+OCR" (default) or "Audio-only"
- Audio-only mode: mic capture only, no screen share prompt
- Live speech-to-text in transcript panel via Web Speech API
- Screen panel replaced with pulsing mic indicator
- Adaptive button labels ("Start Sharing" vs "Start Recording")
- Session summary from audio transcript alone
- Mode toggle disabled during active sessions

**Out of scope:**
- Cloud STT / backend services (Web Speech API only for MVP)
- Simultaneous modes (mutually exclusive)
- Audio file upload / import
- Speaker diarization
- Rewriting existing Screen+OCR mode

### Breakdown (7 tasks)

| ID | Summary | Size | Type |
|----|---------|------|------|
| T1 | Add AppMode type to shared types | XS | Task |
| T2 | Add mode state and conditional start/stop logic to App.tsx | S | Story |
| T3 | Add mode toggle and adaptive controls to Header | S | Story |
| T4 | Create AudioOnlyPanel component | XS | Task |
| T5 | Update MainLayout for mode-conditional rendering | XS | Task |
| T6 | Add CSS for mode toggle and audio-only panel | XS | Task |
| T7 | Handle audio-only session summary edge cases | XS | Task |

### Risks
- Web Speech API sends audio to Google servers in Chrome (same constraint as existing audio pipeline)
- Audio-only summary is sparser than Screen+OCR (acceptable for MVP)
- No visual feedback if speech recognition silently stops (mitigated by auto-restart + isListening state)

### Approved by
- **PM_INTENT:** aravind — "i am the bloody pm"
