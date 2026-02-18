## Change Summary: Audio-Only Transcription Mode

### Files modified (6 existing + 1 new)

**New files:**
- `src/components/AudioOnlyPanel.tsx` — Visual panel with pulsing mic icon, replaces ScreenPanel in audio-only mode

**Modified files:**
- `src/types/index.ts` — Added `AppMode` type (`'screen-ocr' | 'audio-only'`); added `audioText` to `SlideSummary`
- `src/App.tsx` — Added `mode` state, `isRecordingAudio` state, `audioOnlyStartRef`; dispatches start/stop based on mode; passes mode to Header and MainLayout
- `src/components/Header.tsx` — Added mode toggle (segmented control), disabled during active session; adapted indicators for both modes
- `src/components/ShareControls.tsx` — Accepts `mode` and `isActive` props; adaptive button labels ("Start Sharing" vs "Start Recording")
- `src/components/MainLayout.tsx` — Accepts `mode` and `isActive` props; conditionally renders AudioOnlyPanel or ScreenPanel
- `src/App.css` — Added CSS for mode toggle, audio-only panel with pulse animation, slide cards, summary redesign, export buttons

**Not modified (verified working as-is):**
- `src/hooks/useSummary.ts` — Already handles `results=[]` + audio segments correctly for audio-only summaries

### Build verification
- `npx tsc --noEmit` passes with zero errors
- `npx vite build` produces clean production build
- No new dependencies added

### Key decisions
- Modes are mutually exclusive — toggle is disabled while a session is active
- Audio-only mode reuses existing `useAudioCapture` hook unchanged
- `audioOnlyStartRef` tracks session start time for duration calculation (since useOCR's `sessionStart` is not available)
- Audio-only summary passes `results=[]` to `generateSummary`; the existing guard (`results.length === 0 && audioSegmentCount === 0`) correctly passes through when audio exists
