# CLAUDE.md — AI Assistant Guide for screenshare-transcribe

## Project Overview

**screenshare-transcribe** is a privacy-first, client-side web application that:
1. Captures screen share content via the browser's Screen Capture API
2. Extracts text in real-time using Tesseract.js (client-side OCR)
3. Generates structured summaries with entity extraction, topic clustering, and language detection

All processing happens in the browser — no external APIs, no data leaves the user's machine.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3 + TypeScript 5.6 (strict mode) |
| Build Tool | Vite 6 |
| OCR | Tesseract.js 5.1.1 (Web Worker-based) |
| Language Detection | franc 6.2 |
| Styling | Vanilla CSS (dark theme, CSS custom properties) |
| Deployment | Vercel (static hosting) |
| Linting | ESLint 9 + typescript-eslint + react-hooks plugin |

---

## Directory Structure

```
src/
├── App.tsx                  # Root orchestrator component
├── App.css                  # Global dark-theme styles
├── main.tsx                 # React entry point
├── vite-env.d.ts            # Vite type declarations
├── types/
│   └── index.ts             # All shared TypeScript interfaces & types
├── components/              # Presentation-layer React components
│   ├── MainLayout.tsx       # Two-column grid (video | OCR panels)
│   ├── Header.tsx           # Title, live slide counter, controls
│   ├── ShareControls.tsx    # Start / Stop buttons
│   ├── VideoPreview.tsx     # Screen capture <video> element
│   ├── OCRPanel.tsx         # OCR results panel with confidence filter
│   ├── OCRResultList.tsx    # List of OCR captures
│   ├── OCRResultItem.tsx    # Individual capture card (collapsible)
│   ├── EntityPanel.tsx      # Real-time entity display (emails, URLs…)
│   ├── SummaryView.tsx      # Post-capture summary modal
│   ├── SlideGroup.tsx       # Grouped slide display
│   ├── SlideTimeline.tsx    # Timeline visualization
│   ├── ScreenPanel.tsx      # Video container wrapper
│   └── TopicClusterView.tsx # Topic cluster visualization
├── hooks/                   # Custom hooks (state + side-effect bridge)
│   ├── useScreenCapture.ts  # navigator.mediaDevices.getDisplayMedia
│   ├── useOCR.ts            # OCR processing state & orchestration
│   ├── useFrameExtractor.ts # Frame extraction from video (every 3s)
│   └── useSummary.ts        # Summary generation & state
└── services/                # Pure business logic (no React dependencies)
    ├── ocrService.ts        # Tesseract.js worker lifecycle wrapper
    ├── textCleaner.ts       # OCR noise filtering, text similarity, keywords
    ├── languageDetector.ts  # franc wrapper → ISO 639-1 codes
    ├── entityExtractor.ts   # Email, URL, phone, date, proper-noun extraction
    ├── textInference.ts     # Content-type detection, summarization, topic clustering
    └── urlParser.ts         # URL extraction with OCR-damage repair
```

---

## Architecture: Three-Layer Pattern

```
Services (pure logic, no React)
    ↕
Hooks (state management, orchestration)
    ↕
Components (presentation, local UI state only)
```

- **Services** contain all business logic and are framework-agnostic.
- **Hooks** bridge services to React state (`useState`, `useRef`, `useCallback`, `useEffect`).
- **Components** are focused on rendering; complex state lives in hooks.
- **Types** are centralized in `src/types/index.ts` — add all new interfaces there.

---

## Key Data Types

Defined in `src/types/index.ts`:

```typescript
// A single OCR capture from one video frame
interface OCRResult {
  id: string
  timestamp: number
  text: string           // cleaned text
  rawText: string        // original Tesseract output
  confidence: number     // 0–100
  language: string       // ISO 639-1 code
  urls: string[]
  slideNumber: number
  entities: ExtractedEntities
}

// Post-session aggregate
interface SessionSummary {
  totalCaptures: number
  slideCount: number
  duration: string
  wordCount: number
  charCount: number
  avgConfidence: number
  languages: string[]
  urls: string[]
  emails: string[]
  phones: string[]
  dates: Array<{ value: string; normalized?: string }>
  properNouns: string[]
  keywords: string[]
  slides: SlideSummary[]
  fullText: string
  inference: TextInference
}
```

---

## Development Workflow

### Setup

```bash
npm install
npm run dev       # Dev server at http://localhost:5173 (hot reload)
```

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server with Fast Refresh |
| `npm run build` | Type-check (`tsc -b`) then bundle to `dist/` |
| `npm run lint` | Run ESLint across all files |
| `npm run preview` | Preview the production build locally |

### Manual Testing Checklist

1. `npm run build` passes with no errors
2. `npm run dev` → open `http://localhost:5173`
3. Click "Start Sharing" — browser prompt appears
4. Select a window/screen — video preview renders
5. OCR text appears in right panel within a few seconds
6. Click "Stop" — summary modal appears with entities/topics
7. Confidence slider filters results correctly

---

## Coding Conventions

### TypeScript

- **Strict mode is on** — no `any`, unused locals/params are errors.
- All interfaces go in `src/types/index.ts`.
- Use `interface` for object shapes, `type` for unions/aliases.

### React

- Use functional components only (no class components).
- Hooks are the only state mechanism — no Redux or external state library.
- Use `useCallback` for callbacks passed as props to avoid re-renders.
- Use `useRef` for DOM references and mutable values that shouldn't trigger re-renders.
- Clean up effects (`useEffect` return) — especially important for the OCR worker and media streams.

### Services

- Services must be pure functions or singleton classes with no React imports.
- OCR worker (`ocrService.ts`) is a lazy singleton — initialize once, terminate on unmount.
- The `textInference.ts` pipeline runs fully client-side (no LLM/API calls).

### CSS

- Dark theme via CSS custom properties (variables defined in `App.css`).
- BEM-inspired class names (e.g., `ocr-panel`, `btn-start`, `entity-panel`).
- No CSS preprocessors — plain `.css` files only.
- Each component may have its styles in `App.css` or inline (no CSS Modules currently).

### Git & PRs

- Commit messages follow `type: description` format (e.g., `feat:`, `fix:`, `updated`).
- PRs use the `.github/pull_request_template.md` template.
- Feature branches → PR → merge to `master`.

---

## Core Processing Pipeline

```
Video stream (getDisplayMedia)
    ↓  every 3 seconds
Frame extraction (Canvas 2D drawImage)
    ↓
Tesseract.js OCR (Web Worker)
    ↓  returns { text, confidence }
textCleaner → noise filter + slide change detection (Jaccard similarity ≥ 0.4 = same slide)
    ↓
entityExtractor → emails, URLs, phones, dates, proper nouns
    ↓
languageDetector (franc)
    ↓
OCRResult stored (max 100, sliding window)
    ↓  on Stop
textInference → content type, headings, action items, extractive summary, topic clusters
    ↓
SessionSummary displayed in SummaryView modal
```

---

## Important Implementation Details

### Slide Detection

Slide changes are detected in `textCleaner.ts` using **Jaccard index** (word-set overlap). A similarity below 0.4 triggers a new slide number. This threshold is a key tuning parameter.

### OCR Worker Lifecycle

`ocrService.ts` manages a single Tesseract.js worker:
- `initializeOCR()` — called once on mount (English language)
- `recognizeImage()` — processes a canvas element
- `terminateOCR()` — called on unmount to free memory

### URL Repair

`urlParser.ts` corrects OCR artifacts in URLs:
- Removes accidental spaces (e.g., `h t t p s : / /` → `https://`)
- Fixes character substitutions common in OCR
- Reconstructs URLs split across line breaks

### Memory Management

- OCR results are capped at 100 entries: `results.slice(-99)` before appending.
- Canvas elements are recreated per frame (no long-lived buffers).
- Worker is terminated on component unmount to prevent memory leaks.

---

## What Does NOT Exist (yet)

- **No automated tests** — testing is manual only.
- **No error boundary components** — add if expanding error handling.
- **No multi-language OCR** — Tesseract.js initialized with English only (`eng`).
- **No CSS Modules** — styles live in global `App.css`.
- **No backend** — fully static; Vercel deploys the `dist/` folder.

---

## Deployment

- **Platform:** Vercel (config in `.vercel/project.json`)
- **Build command:** `npm run build`
- **Output directory:** `dist/`
- Can also be deployed to any static host (Netlify, GitHub Pages, etc.)

---

## Browser Compatibility

- Requires `navigator.mediaDevices.getDisplayMedia` — Chrome, Edge, Firefox supported.
- **Safari is not supported** (no `getDisplayMedia` implementation).
- Targets ES2020; no IE11 support.
