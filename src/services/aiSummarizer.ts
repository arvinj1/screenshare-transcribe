import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { AISummary, SessionSummary } from '../types'
import type { AISettings, ClaudeModelId } from './aiSettings'

const REQUEST_TIMEOUT_MS = 120_000
const MAX_INPUT_CHARS = 24_000 // keeps cost and latency bounded for long sessions

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
    timeout: REQUEST_TIMEOUT_MS,
  })
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\n…[truncated]' : s
}

export function buildSummaryPrompt(summary: SessionSummary): string {
  const ocrText = summary.slides.map(s => s.text).join('\n\n')
  // Audio (what was said) is usually the highest-signal source
  const audioPart = clip(summary.audioTranscript, Math.floor(MAX_INPUT_CHARS * 0.5))
  const ocrPart = clip(ocrText, MAX_INPUT_CHARS - audioPart.length)
  const slideOutline = summary.slides
    .slice(0, 100)
    .map(s => `Slide ${s.slideNumber}: ${clip(s.text.replace(/\s+/g, ' '), 200)}`)
    .join('\n')

  return [
    'You are summarizing a live screen-share/presentation session. Two imperfect sources were captured:',
    '1. OCR text extracted from screen frames (may contain recognition noise, duplicated fragments, or garbled characters — read through the noise).',
    '2. A speech-to-text transcript of what the presenter said (may have mis-transcriptions — infer intended meaning from context).',
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
    'Produce an accurate summary of this session. Correct obvious OCR/speech errors silently; never invent content that is not supported by the sources. Ignore browser or operating-system interface text (tab titles, address bars, bookmarks, menus) that is not part of the presented content.',
    'Fill in:',
    '- title: short descriptive session title, at most 60 characters',
    '- narrative: 2-4 sentence prose summary of what the session covered',
    '- keyPoints: the 3-8 most important points made',
    '- actionItems: explicit action items or next steps mentioned (empty if none)',
    '- topics: 3-6 short topic labels',
  ].join('\n')
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

  try {
    const response = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      messages: [{ role: 'user', content: buildSummaryPrompt(summary) }],
      output_config: { effort: 'medium', format: zodOutputFormat(SummarySchema) },
      ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    })

    if (response.stop_reason === 'refusal') return { ok: false, error: 'Claude declined to summarize this session' }
    if (response.stop_reason === 'max_tokens') return { ok: false, error: 'Claude ran out of room before finishing' }

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
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
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
