**NOTE:** `project_key` is blank in jira_payload.yaml — fill in your Jira project key before importing.

---

## Epic: Add audio alignment to screenshare transcription pipeline

### Goal
Pair real-time audio transcription with the existing OCR pipeline so users get a time-synced view of what was shown + what was said.

### Scope

**In scope:**
- Capture microphone audio alongside screen share
- Real-time speech-to-text via Web Speech API (zero new dependencies)
- Timestamped audio segments interleaved with OCR results
- Summary view incorporates both OCR and audio data
- Graceful fallback to OCR-only if mic denied or API unavailable

**Out of scope:**
- Speaker diarization
- Video recording / playback
- Server-side processing
- Offline transcription (future: Whisper WASM)

### Breakdown (9 tasks)

| ID | Summary | Size | Type |
|----|---------|------|------|
| T1 | Add AudioSegment type definition | XS | Task |
| T2 | Create useAudioCapture hook | S | Story |
| T3 | Wire audio capture into App.tsx | S | Story |
| T4 | Create AudioSegmentItem component | XS | Task |
| T5 | Interleave audio + OCR in transcript panel | S | Story |
| T6 | Update MainLayout to forward audioSegments | XS | Task |
| T7 | Include audio in summary generation | S | Story |
| T8 | Display audio stats in SummaryView | XS | Task |
| T9 | Add mic status indicator to Header | XS | Task |

### Risks
- Web Speech API sends audio to Google servers in Chrome (acceptable for MVP; documented)
- Chromium-only — matches existing browser target
- Interim results can be noisy — only final results stored; interim shown transiently

### Approved by
- **PM_INTENT:** Aravind Sethuraman — "Lets proceed with this"
