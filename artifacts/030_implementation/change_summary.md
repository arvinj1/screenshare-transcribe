## Change Summary: Audio Alignment

### Files modified (8 existing + 2 new)

**New files:**
- `src/hooks/useAudioCapture.ts` — React hook for mic capture + Web Speech API transcription
- `src/components/AudioSegmentItem.tsx` — UI component for rendering audio transcript segments

**Modified files:**
- `src/types/index.ts` — Added `AudioSegment` interface; added `audioSegmentCount`, `audioWordCount`, `audioTranscript` to `SessionSummary`
- `src/App.tsx` — Wired `useAudioCapture` hook; manages `audioSegments` state; starts/stops audio with screen capture
- `src/components/Header.tsx` — Added mic status indicator (listening / error)
- `src/components/MainLayout.tsx` — Passes `audioSegments` prop through to `OCRPanel`
- `src/components/OCRPanel.tsx` — Accepts and forwards `audioSegments` to `OCRResultList`
- `src/components/OCRResultList.tsx` — Interleaves OCR + audio entries sorted by timestamp
- `src/hooks/useSummary.ts` — Accepts `audioSegments`, merges audio transcript with OCR text for inference
- `src/components/SummaryView.tsx` — Shows audio stats + collapsible audio transcript section

### Build verification
- `npx tsc --noEmit` passes with zero errors
- No new dependencies added

### Key decisions
- Only **final** speech recognition results are stored in state (interim results are discarded)
- Auto-restart on `SpeechRecognition.onend` to handle the browser's automatic stop behavior
- Audio transcript appended after OCR text (separated by `--- Audio Transcript ---`) for inference
