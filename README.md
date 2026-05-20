# screenshare-transcribe

A React + TypeScript local-first MVP for **searchable visual memory** — capture your screen, extract text via OCR, and build a persistent, searchable history of everything you've seen. All processing stays in your browser; no data ever leaves your device.

## Features

### Core capture & OCR
- Start and stop browser-based screen sharing
- Extract frames from the shared screen on a timed interval
- Run OCR on captured frames using Tesseract.js
- Detect slide or screen changes from OCR text similarity
- Track live slide count during a session
- Extract URLs, emails, phone numbers, dates, and named entities
- Detect likely language of captured text
- Generate an inferred end-of-session summary with:
  - overview stats
  - confidence distribution
  - headings and key points
  - action items
  - topic clusters
  - per-slide breakdown
  - full captured text

### Local-first session persistence (IndexedDB)
- Sessions are automatically saved to IndexedDB when capture stops
- Session history panel shows all past sessions with metadata:
  - title, date/time, duration, slide count, captures, avg confidence, keywords
- Reopen any saved session to revisit its summary
- Rename sessions inline
- Delete sessions you no longer need
- All storage is local — nothing is synced to any server

### Session export
- Download session summary as **Markdown** — human-readable with narrative, action items, key points, entities, slide breakdown, and full text
- Download raw session data as **JSON** — structured for future import or analysis
- Copy Markdown to clipboard directly from the summary view
- Export buttons available in both the post-session summary and the history panel

### Cross-session search
- Full-text search across all saved sessions
- Matches against session title, captured text, keywords, and named entities
- Results show metadata at a glance; click to open the matching session

### Privacy & onboarding
- First-run onboarding modal explains local-only processing and capture tips
- "🔒 Local-only" badge in the header reinforces the privacy model
- Practical tips for better OCR results (font size, contrast, single-window sharing)

### Performance guardrails
- Frames are skipped if a prior OCR job is still in flight (no queue pile-up)
- Large captures are downscaled before OCR to keep processing fast
- Session duration warning after 30 minutes of continuous capture
- Live "🔄 OCR" indicator in the header shows when processing is active

## Tech Stack

- React 18
- TypeScript
- Vite
- Tesseract.js
- franc
- IndexedDB (browser-native, no extra dependency)

## Privacy

All processing is entirely client-side:
- OCR runs in-browser via Tesseract.js WebAssembly
- Sessions are stored in your browser's IndexedDB
- No network requests are made for OCR or session data
- No authentication, accounts, or cloud sync in this branch

## How It Works

1. The app starts a browser screen-sharing session with `getDisplayMedia`.
2. A video preview renders the live shared screen.
3. Frames are sampled every 3 seconds. Frames are skipped if OCR is still processing.
4. Each frame is processed through OCR (downscaled to ≤1920px for performance).
5. Cleaned OCR text is compared with the previous capture to detect slide changes.
6. The app stores OCR results and extracts structured data like URLs and entities.
7. When the session stops, the app generates a summary, auto-saves to IndexedDB, and shows the summary view.
8. From the summary view you can export as Markdown or JSON, or copy to clipboard.
9. Open the history panel (🗂️) to search, rename, delete, or reopen any past session.

## Project Structure

```text
.
├── index.html
├── package.json
├── src/
│   ├── App.tsx                          — wires together all features
│   ├── App.css                          — all styles
│   ├── components/
│   │   ├── Header.tsx                   — app header with history/help buttons
│   │   ├── MainLayout.tsx               — live preview + OCR results layout
│   │   ├── SummaryView.tsx              — post-session summary with export actions
│   │   ├── SessionHistory.tsx           — history panel with search
│   │   ├── OnboardingModal.tsx          — first-run privacy/onboarding modal
│   │   └── ...                          — OCR panel, slide groups, entity panel
│   ├── hooks/
│   │   ├── useScreenCapture.ts          — display capture lifecycle
│   │   ├── useOCR.ts                    — OCR processing, slide detection
│   │   ├── useFrameExtractor.ts         — frame sampling with processing guard
│   │   ├── useSummary.ts                — summary generation
│   │   └── useSessionHistory.ts         — IndexedDB session CRUD
│   ├── services/
│   │   ├── sessionStorage.ts            — IndexedDB read/write
│   │   ├── sessionExport.ts             — Markdown + JSON export
│   │   ├── ocrService.ts                — OCR provider abstraction
│   │   └── ...                          — entity extraction, text cleaning, inference
│   └── types/
│       └── index.ts                     — shared TypeScript types incl. SavedSession
├── tsconfig.json
└── vite.config.ts
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Development

### Prerequisites

- Node.js 18+ recommended
- npm
- A modern browser with screen sharing support (Chrome, Edge, or Firefox)

### Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser and start a screen-sharing session.

## Notes

- Screen capture requires browser support for `navigator.mediaDevices.getDisplayMedia`.
- OCR accuracy depends heavily on screen resolution, font size, contrast, and frame quality.
- For best results: use large fonts, high contrast, and share a single window rather than the full monitor.
- IndexedDB storage limits vary by browser (~50–500 MB typical); very long sessions with many captures are trimmed to the most recent 200 results before saving.
