import type { AISummary, SessionSummary } from '../types'

const AI_ENABLED_KEY = 'st-ai-summaries-enabled'
const REQUEST_TIMEOUT_MS = 45_000

export function isAIEnabled(): boolean {
  try {
    return localStorage.getItem(AI_ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setAIEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AI_ENABLED_KEY, String(enabled))
  } catch {
    // Storage unavailable — session-only behavior is fine
  }
}

/**
 * Ask the serverless /api/summarize endpoint (Claude API) for an accurate
 * summary. Returns null on any failure so callers can keep the local
 * heuristic summary as a graceful fallback.
 */
export async function summarizeWithAI(summary: SessionSummary): Promise<AISummary | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const ocrText = summary.slides.map(s => s.text).join('\n\n')
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ocrText,
        audioTranscript: summary.audioTranscript,
        duration: summary.duration,
        slides: summary.slides.map(s => ({
          slideNumber: s.slideNumber,
          text: s.text,
          audioText: s.audioText,
        })),
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (typeof data?.narrative !== 'string' || data.narrative.length === 0) return null

    return {
      title: typeof data.title === 'string' ? data.title : '',
      narrative: data.narrative,
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.map(String) : [],
      actionItems: Array.isArray(data.actionItems) ? data.actionItems.map(String) : [],
      topics: Array.isArray(data.topics) ? data.topics.map(String) : [],
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
