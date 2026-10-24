# Changelog

All notable changes to DeckJot. This project uses [semantic versioning](https://semver.org/).

## [0.1.0] - 2026-10-24

The first release, and the first under the name **DeckJot** (previously *Screen Share Transcribe*).

### Capture
- Share a browser tab, window or screen; the picker opens on tabs, which give the cleanest text.
- Slide text is read on your computer with Tesseract.js every 3 seconds, skipping frames when the screen hasn't changed.
- OCR lines below 60% confidence are dropped; the text cleaner removes noise but keeps numbers (slide numbers, years, percentages, prices, times).
- Slide changes are detected automatically, and speech is attached to the slide that was on screen.
- Speech is transcribed from the microphone with the browser's speech recognition (best in Chrome and Edge).
- **Audio Only** mode for conversations without a screen.
- Long sessions keep everything; the live panel shows the 50 most recent slides.

### Summaries and notes
- An on-device summary (title, key points, action items, topics) appears the moment you stop.
- **Claude notes with your own Anthropic API key**, sent straight from your browser to Anthropic:
  - **Detailed notes** (default): a threaded overview grounded in measured session data (time on screen, words spoken, recurring and emphasized terms, numbers), slide-by-slide notes pairing what was shown with what was said, themes, decisions, action items with owner and due date, open questions and key numbers.
  - **Brief recap**: a short overview, key points and action items.
- Choose Claude Opus 5.5, Sonnet 5.5 or Haiku 5.5; **Test key** checks a key without spending tokens.
- If Claude is unavailable, the on-device summary stays and the reason is shown.

### History and export
- Sessions save automatically in your browser, with search, rename, reopen and delete.
- Export as Markdown or JSON, or copy to the clipboard.

### App
- On-page introduction with steps, tips and privacy notes; a Settings panel for summaries, key and model.
- Start is disabled, with an explanation, when the browser can't support the chosen mode.
- New name, logo and favicon.

### Privacy
- Screen video and images never leave your browser.
- There is no app server: the deployment serves static files only, and Claude calls use each user's own key.
- Saved sessions and settings stay in your browser. Their internal storage names are unchanged by the rename, so nothing saved before is lost.

[0.1.0]: https://github.com/arvinj1/screenshare-transcribe/releases/tag/v0.1.0
