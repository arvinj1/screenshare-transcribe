import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { AINotes, AISummary, SessionSummary } from '../types'
import type { AISettings, ClaudeModelId } from './aiSettings'
import { computeSignals, formatSignals } from './sessionSignals'

// Detailed notes on a long session can take Opus a couple of minutes
const REQUEST_TIMEOUT_MS = 240_000
// Input caps keep cost and latency bounded: brief ≈ 6k tokens, detailed ≈ 30k tokens
const BRIEF_MAX_INPUT_CHARS = 24_000
const DETAILED_MAX_INPUT_CHARS = 120_000
const SLIDE_TEXT_MAX_CHARS = 1_500

// Opus and Sonnet can fall back to another model if a safety classifier
// declines the request; Haiku has no server-side fallback.
const MODELS_WITH_FALLBACK: ClaudeModelId[] = ['claude-opus-5-5', 'claude-sonnet-5-5']

const SummarySchema = z.object({
  title: z.string(),
  narrative: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()),
  topics: z.array(z.string()),
})

const DetailedSchema = z.object({
  title: z.string(),
  overview: z.string(),
  keyPoints: z.array(z.string()),
  themes: z.array(z.object({ name: z.string(), slides: z.array(z.number()), summary: z.string() })),
  slideNotes: z.array(z.object({
    slides: z.array(z.number()),
    title: z.string(),
    shown: z.string(),
    said: z.string(),
    takeaway: z.string(),
  })),
  decisions: z.array(z.string()),
  actionItems: z.array(z.object({ task: z.string(), owner: z.string(), due: z.string() })),
  openQuestions: z.array(z.string()),
  keyNumbers: z.array(z.object({ value: z.string(), context: z.string() })),
  topics: z.array(z.string()),
})

export type AIResult =
  | { ok: true; summary: AISummary }
  | { ok: false; error: string }

/**
 * A client that calls the Claude API straight from this browser with the
 * user's own key. The key goes only to api.anthropic.com, never to our server.
 */
function createClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true, // intentional: bring-your-own-key, browser-only app
    maxRetries: 1,
    // Setting a timeout also lets non-streaming requests use a large max_tokens
    timeout: REQUEST_TIMEOUT_MS,
  })
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\n…[truncated]' : s
}

const SOURCES_PREAMBLE = [
  'You are summarizing a live screen-share/presentation session. Two imperfect sources were captured:',
  '1. OCR text extracted from screen frames (may contain recognition noise, duplicated fragments, or garbled characters — read through the noise).',
  '2. A speech-to-text transcript of what the presenter said (may have mis-transcriptions — infer intended meaning from context).',
]

const ACCURACY_RULES =
  'Correct obvious OCR/speech errors silently; never invent content that is not supported by the sources. Ignore browser or operating-system interface text (tab titles, address bars, bookmarks, menus) that is not part of the presented content.'

export function buildSummaryPrompt(summary: SessionSummary): string {
  const MAX_INPUT_CHARS = BRIEF_MAX_INPUT_CHARS
  const ocrText = summary.slides.map(s => s.text).join('\n\n')
  // Audio (what was said) is usually the highest-signal source
  const audioPart = clip(summary.audioTranscript, Math.floor(MAX_INPUT_CHARS * 0.5))
  const ocrPart = clip(ocrText, MAX_INPUT_CHARS - audioPart.length)
  const slideOutline = summary.slides
    .slice(0, 100)
    .map(s => `Slide ${s.slideNumber}: ${clip(s.text.replace(/\s+/g, ' '), 200)}`)
    .join('\n')

  return [
    ...SOURCES_PREAMBLE,
    '',
    `Session duration: ${summary.duration}`,
    slideOutline ? `\nSlide outline:\n${clip(slideOutline, 4000)}` : '',
    '',
    '--- OCR TEXT (from screen) ---',
    ocrPart || '(none)',
    '',
    '--- SPOKEN TRANSCRIPT ---',
    audioPart || '(none)',
    '',
    `Produce an accurate summary of this session. ${ACCURACY_RULES}`,
    'Fill in:',
    '- title: short descriptive session title, at most 60 characters',
    '- narrative: 2-4 sentence prose summary of what the session covered',
    '- keyPoints: the 3-8 most important points made',
    '- actionItems: explicit action items or next steps mentioned (empty if none)',
    '- topics: 3-6 short topic labels',
  ].join('\n')
}

/**
 * The detailed prompt threads the session slide by slide — what was shown next
 * to what was said while it was on screen — and adds the measured signals
 * (time on screen, words spoken, recurring terms, numbers) so the overview
 * can say what got the most attention and how topics connect.
 */
export function buildDetailedPrompt(summary: SessionSummary): string {
  const slides = summary.slides
  const shownTotal = slides.reduce((n, s) => n + Math.min(s.text.length, SLIDE_TEXT_MAX_CHARS), 0)
  // Share what's left of the budget evenly between slides' speech
  const saidBudget = slides.length > 0
    ? Math.max(400, Math.floor((DETAILED_MAX_INPUT_CHARS - shownTotal) / slides.length))
    : DETAILED_MAX_INPUT_CHARS

  const threaded = slides.length > 0
    ? slides.map(s => [
        `### Slide ${s.slideNumber}`,
        `SHOWN: ${clip(s.text, SLIDE_TEXT_MAX_CHARS)}`,
        `SAID: ${s.audioText ? clip(s.audioText, saidBudget) : '(nothing captured)'}`,
      ].join('\n')).join('\n\n')
    : `SAID (no screen captured):\n${clip(summary.audioTranscript, DETAILED_MAX_INPUT_CHARS) || '(none)'}`

  const signals = formatSignals(computeSignals(summary))
  const longDeck = slides.length > 25

  return [
    ...SOURCES_PREAMBLE,
    'Each slide below pairs what was on screen (SHOWN) with what was said while it was on screen (SAID). Slide numbers are the app’s capture order; if a slide shows its own number or title, use that in titles.',
    '',
    `Session duration: ${summary.duration}`,
    '',
    '--- SESSION DATA (measured by the app) ---',
    signals || '(none)',
    '',
    '--- SESSION, SLIDE BY SLIDE ---',
    threaded,
    '',
    `Write comprehensive, threaded notes for someone who missed this session. ${ACCURACY_RULES}`,
    'Use the slide text to resolve speech-recognition errors (e.g. if the slide says "vendors" and the speech says "windows", it was "vendors"). Ground claims about emphasis in the session data (time on screen, words spoken, recurring terms) rather than guessing.',
    'Scale the length to the session: a few minutes gets a short set of notes, an hour gets proportionally more. Leave a list empty when the session has nothing for it — do not pad.',
    'Fill in:',
    '- title: short descriptive session title, at most 60 characters',
    '- overview: 1-3 short paragraphs (separated by a blank line) that thread the session together: its arc from start to finish, how the topics connect, which themes recur across slides, and what got the most time or emphasis according to the data',
    '- keyPoints: the most important points made, most important first',
    '- themes: the threads running through the session; for each, a short name, the slide numbers where it appears, and one or two sentences on how it developed',
    longDeck
      ? '- slideNotes: this is a long deck, so group consecutive slides on the same topic into one entry; list the slide numbers it covers'
      : '- slideNotes: one entry per slide, in order, with that slide’s number in `slides`',
    '  each with: title (a clean heading for the slide), shown (what the slide presented, one sentence), said (what the speaker said about it, corrected, one or two sentences; empty if nothing was said), takeaway (why it matters, one sentence)',
    '- decisions: decisions or agreements stated in the session',
    '- actionItems: explicit tasks or next steps; owner and due are empty strings unless the session names them',
    '- openQuestions: questions, risks or concerns raised but not resolved',
    '- keyNumbers: figures that matter, each with a short context; only numbers that appear in the sources',
    '- topics: 3-6 short topic labels',
  ].join('\n')
}

function toNotes(parsed: z.infer<typeof DetailedSchema>): AINotes {
  return {
    themes: parsed.themes.slice(0, 12),
    slideNotes: parsed.slideNotes.slice(0, 120),
    decisions: parsed.decisions.slice(0, 20),
    actionItems: parsed.actionItems.slice(0, 30),
    openQuestions: parsed.openQuestions.slice(0, 20),
    keyNumbers: parsed.keyNumbers.slice(0, 30),
  }
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Anthropic rejected this API key'
  if (err instanceof Anthropic.PermissionDeniedError) return 'This API key cannot use the selected model'
  if (err instanceof Anthropic.NotFoundError) return 'Model not available for this API key'
  if (err instanceof Anthropic.RateLimitError) return 'Rate limit or spend limit reached on your API key'
  if (err instanceof Anthropic.BadRequestError) return 'Claude rejected the request'
  if (err instanceof Anthropic.APIConnectionTimeoutError) return 'Claude took too long to respond'
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API'
  if (err instanceof Anthropic.APIError) return `Claude API error${err.status ? ` (${err.status})` : ''}`
  return 'Summary failed'
}

/**
 * Ask Claude for an accurate summary. Never throws: on any failure it
 * returns a short reason, and callers keep the local heuristic summary.
 */
export async function summarizeWithAI(summary: SessionSummary, settings: AISettings): Promise<AIResult> {
  const client = createClient(settings.apiKey)
  const withFallback = MODELS_WITH_FALLBACK.includes(settings.model)
  const request = {
    model: settings.model,
    ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
  }

  try {
    if (settings.detail === 'brief') {
      const response = await client.beta.messages.parse({
        ...request,
        max_tokens: 16000,
        messages: [{ role: 'user', content: buildSummaryPrompt(summary) }],
        output_config: { effort: 'medium', format: zodOutputFormat(SummarySchema) },
      })
      const failure = stopFailure(response.stop_reason)
      if (failure) return failure
      const parsed = response.parsed_output
      if (!parsed || parsed.narrative.trim().length === 0) return { ok: false, error: 'Claude returned an empty summary' }
      return {
        ok: true,
        summary: {
          title: parsed.title.slice(0, 80),
          narrative: parsed.narrative,
          keyPoints: parsed.keyPoints.slice(0, 10),
          actionItems: parsed.actionItems.slice(0, 10),
          topics: parsed.topics.slice(0, 8),
          model: response.model,
        },
      }
    }

    const response = await client.beta.messages.parse({
      ...request,
      max_tokens: 32000,
      messages: [{ role: 'user', content: buildDetailedPrompt(summary) }],
      output_config: { effort: 'medium', format: zodOutputFormat(DetailedSchema) },
    })
    const failure = stopFailure(response.stop_reason)
    if (failure) return failure
    const parsed = response.parsed_output
    if (!parsed || parsed.overview.trim().length === 0) return { ok: false, error: 'Claude returned an empty summary' }
    const notes = toNotes(parsed)
    return {
      ok: true,
      summary: {
        title: parsed.title.slice(0, 80),
        narrative: parsed.overview,
        keyPoints: parsed.keyPoints.slice(0, 20),
        actionItems: notes.actionItems.map(formatActionItem),
        topics: parsed.topics.slice(0, 8),
        notes,
        model: response.model,
      },
    }
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
}

function stopFailure(stopReason: string | null): AIResult | null {
  if (stopReason === 'refusal') return { ok: false, error: 'Claude declined to summarize this session' }
  if (stopReason === 'max_tokens') return { ok: false, error: 'Claude ran out of room before finishing' }
  return null
}

/** "Send the deck to finance (Priya, by Friday)" */
export function formatActionItem(item: { task: string; owner: string; due: string }): string {
  const meta = [item.owner.trim(), item.due.trim() ? `by ${item.due.trim()}` : ''].filter(Boolean).join(', ')
  return meta ? `${item.task} (${meta})` : item.task
}

/**
 * Check a key without spending tokens: look up the chosen model, which needs
 * a valid key with access to it.
 */
export async function testApiKey(apiKey: string, model: ClaudeModelId): Promise<{ ok: boolean; message: string }> {
  try {
    await createClient(apiKey).models.retrieve(model)
    return { ok: true, message: 'Key works' }
  } catch (err) {
    return { ok: false, message: describeError(err) }
  }
}
