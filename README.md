# screenshare-transcribe

A React + TypeScript app that captures a live screen share, runs OCR on the shared content, and generates a structured session summary with extracted links, contact info, topics, and slide-by-slide notes.

## Features

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

## Tech Stack

- React 18
- TypeScript
- Vite
- Tesseract.js
- franc

## How It Works

1. The app starts a browser screen-sharing session with `getDisplayMedia`.
2. A video preview renders the live shared screen.
3. Frames are sampled at a fixed interval.
4. Each frame is processed through OCR.
5. Cleaned OCR text is compared with the previous capture to detect slide changes.
6. The app stores OCR results and extracts structured data like URLs and entities.
7. When the session stops, the app builds a summarized view of the captured content.

## Project Structure

```text
.
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
├── tsconfig.json
└── vite.config.ts
```

## Key App Modules

- `src/App.tsx` — wires together screen capture, OCR processing, frame extraction, and summary generation
- `src/hooks/useScreenCapture.ts` — starts and stops display capture and handles permission or browser support errors
- `src/hooks/useOCR.ts` — initializes OCR, processes frames, tracks slide changes, and stores OCR results
- `src/hooks/useSummary.ts` — builds the final session summary and aggregates slide-level information
- `src/components/MainLayout.tsx` — renders the live preview and OCR results side by side
- `src/components/SummaryView.tsx` — displays the post-session summary UI

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Development

### Prerequisites

- Node.js 18+ recommended
- npm
- A modern browser with screen sharing support

### Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser and start a screen-sharing session.

## Notes

- Screen capture depends on browser support for `navigator.mediaDevices.getDisplayMedia`.
- OCR accuracy depends heavily on screen resolution, font size, contrast, and frame quality.
- The app currently captures video only during screen share sessions.

## Future Improvements

- Export summaries to Markdown or JSON
- Add persistence for past sessions
- Tune frame extraction cadence and OCR performance
- Add tests for OCR cleanup, inference, and entity extraction
- Support richer filtering and search over captured sessions
