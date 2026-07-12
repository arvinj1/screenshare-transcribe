// Vercel serverless function: summarize a captured session with the Claude API.
// Requires the ANTHROPIC_API_KEY environment variable (set in Vercel project settings).
// The key never reaches the browser — this is the only place it is used.

const MAX_INPUT_CHARS = 24_000 // hard cap on prompt size to keep cost + latency bounded
const MODEL = process.env.SUMMARIZE_MODEL || 'claude-haiku-4-5-20251001'

interface SlideInput {
  slideNumber: number
  text: string
  audioText: string
}

interface SummarizeRequest {
  ocrText?: string
  audioTranscript?: string
  slides?: SlideInput[]
  duration?: string
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\n…[truncated]' : s
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'AI summaries not configured (missing ANTHROPIC_API_KEY)' })
    return
  }

  const body: SummarizeRequest = req.body || {}
  const ocrText = typeof body.ocrText === 'string' ? body.ocrText : ''
  const audioTranscript = typeof body.audioTranscript === 'string' ? body.audioTranscript : ''
  const slides = Array.isArray(body.slides) ? body.slides.slice(0, 100) : []
  const duration = typeof body.duration === 'string' ? body.duration.slice(0, 32) : 'unknown'

  if (ocrText.trim().length === 0 && audioTranscript.trim().length === 0) {
    res.status(400).json({ error: 'Nothing to summarize' })
    return
  }

  // Budget the input: audio (what was said) is usually the highest-signal source.
  const audioPart = clip(audioTranscript, Math.floor(MAX_INPUT_CHARS * 0.5))
  const ocrPart = clip(ocrText, MAX_INPUT_CHARS - audioPart.length)

  const slideOutline = slides
    .map(s => `Slide ${s.slideNumber}: ${clip(s.text.replace(/\s+/g, ' '), 200)}`)
    .join('\n')

  const prompt = [
    'You are summarizing a live screen-share/presentation session. Two imperfect sources were captured:',
    '1. OCR text extracted from screen frames (may contain recognition noise, duplicated fragments, or garbled characters — read through the noise).',
    '2. A speech-to-text transcript of what the presenter said (may have mis-transcriptions — infer intended meaning from context).',
    '',
    `Session duration: ${duration}`,
    slideOutline ? `\nSlide outline:\n${clip(slideOutline, 4000)}` : '',
    '',
    '--- OCR TEXT (from screen) ---',
    ocrPart || '(none)',
    '',
    '--- SPOKEN TRANSCRIPT ---',
    audioPart || '(none)',
    '',
    'Produce an accurate summary of this session. Correct obvious OCR/speech errors silently; never invent content that is not supported by the sources. Respond with ONLY a JSON object (no markdown fences) with exactly these keys:',
    '{',
    '  "title": "short descriptive session title, max 60 chars",',
    '  "narrative": "2-4 sentence prose summary of what the session covered",',
    '  "keyPoints": ["3-8 most important points made"],',
    '  "actionItems": ["explicit action items / next steps mentioned; empty array if none"],',
    '  "topics": ["3-6 topic labels"]',
    '}',
  ].join('\n')

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      console.error('Anthropic API error', r.status, detail.slice(0, 500))
      res.status(502).json({ error: 'Upstream summarization failed' })
      return
    }

    const data = await r.json()
    const text: string = data?.content?.[0]?.text ?? ''

    // Tolerate stray text around the JSON object
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      res.status(502).json({ error: 'Malformed summarization response' })
      return
    }

    const parsed = JSON.parse(text.slice(start, end + 1))
    res.status(200).json({
      title: String(parsed.title ?? '').slice(0, 80),
      narrative: String(parsed.narrative ?? ''),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 10) : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map(String).slice(0, 10) : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.map(String).slice(0, 8) : [],
    })
  } catch (err) {
    console.error('Summarize handler error', err)
    res.status(500).json({ error: 'Summarization failed' })
  }
}
