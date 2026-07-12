# Screen Share Transcribe

Transcribe and summarize live screen shares — presentations, demos, video calls — entirely in your browser. Captures slide text with OCR, records what's said via speech recognition, and produces a summary you can save, search, and export.

## How it works

- **Screen+OCR mode**: pick a window/tab/screen to share. Frames are captured every 3 seconds and run through [tesseract.js](https://github.com/naptha/tesseract.js) OCR locally in your browser. Slide changes are detected automatically and text is deduplicated per slide.
- **Audio**: the Web Speech API transcribes your microphone alongside the screen capture (or on its own in **Audio Only** mode). Speech is aligned to the slide that was on screen when it was said.
- **Summaries**: when you stop, a local heuristic summary appears instantly (title, key points, action items, topics). If AI summaries are enabled, the captured text is sent once to the Claude API to produce a higher-quality narrative summary — with graceful fallback to the local summary if the API is unavailable.
- **History**: sessions are auto-saved to IndexedDB in your browser. Search, rename, reopen, delete, and export them (Markdown or JSON) from the History panel.

## Privacy

Everything — capture, OCR, speech recognition, storage — happens locally in your browser. The single exception: with **AI on** (header toggle), the captured text is sent to the Claude API once per session to generate the summary. Toggle **AI off** for a fully local experience.

## Local development

```bash
npm install
npm run dev
```

Requires Node 18+. Chrome or Edge recommended (best Web Speech API support; Safari/Firefox have limited or no speech recognition — the app still works, minus audio transcription).

To test AI summaries locally, run through Vercel so the serverless function is available:

```bash
npm i -g vercel
vercel dev
```

with `ANTHROPIC_API_KEY` in a `.env.local` file or your Vercel project env.

## Deploying to Vercel

The app is a static Vite build plus one serverless function (`api/summarize.ts`), which Vercel picks up automatically — no `vercel.json` needed.

1. Push this repo to GitHub and import it in Vercel (or run `vercel` from the repo root).
2. Add the API key for AI summaries:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```
   (Get a key at https://console.anthropic.com. Uses `claude-haiku-4-5`, roughly a tenth of a cent per session summary.)
3. Deploy: `vercel --prod`.

If `ANTHROPIC_API_KEY` is not set, the API returns 503 and the app silently falls back to local summaries — the deploy still works.

## Notes & limitations

- Audio transcription uses the microphone, not system/tab audio. For a remote presenter, play their audio through speakers so the mic picks it up.
- Client-side OCR is CPU-intensive; the app downscales frames to 1920px and skips frames while OCR is busy. Sessions over 30 minutes trigger a suggestion to split.
- OCR quality depends on capture quality: share the presentation window directly at high resolution for best results.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and production build |
| `npm run preview` | Preview the production build |
