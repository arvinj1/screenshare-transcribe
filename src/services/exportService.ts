import type { SessionSummary } from '../types'

export function generateMarkdown(summary: SessionSummary): string {
  const lines: string[] = []
  const { inference } = summary

  lines.push('# Session Summary')
  lines.push('')

  // Stats
  const stats = [`**Duration:** ${summary.duration}`, `**Slides:** ${summary.slideCount}`, `**Words:** ${summary.wordCount + summary.audioWordCount}`]
  if (summary.audioSegmentCount > 0) stats.push(`**Audio segments:** ${summary.audioSegmentCount}`)
  lines.push(stats.join(' | '))
  lines.push('')

  // Narrative
  if (inference.narrative) {
    lines.push(inference.narrative)
    lines.push('')
  }

  // Key Insights (merged key sentences + action items)
  const insights: string[] = []
  for (const s of inference.keySentences) insights.push(`- ${s}`)
  for (const a of inference.actionItems) insights.push(`- [ ] ${a}`)
  if (insights.length > 0) {
    lines.push('## Key Insights')
    lines.push('')
    lines.push(...insights)
    lines.push('')
  }

  // Per-slide timeline
  if (summary.slides.length > 0) {
    lines.push('## Slide Timeline')
    lines.push('')
    for (const slide of summary.slides) {
      lines.push(`### Slide ${slide.slideNumber}`)
      lines.push('')
      lines.push(slide.text)
      lines.push('')
      if (slide.audioText) {
        lines.push(`> **What was said:** ${slide.audioText}`)
        lines.push('')
      }
      if (slide.urls.length > 0) {
        for (const url of slide.urls) lines.push(`- ${url}`)
        lines.push('')
      }
    }
  }

  // URLs
  if (summary.urls.length > 0) {
    lines.push('## URLs')
    lines.push('')
    for (const url of summary.urls) lines.push(`- ${url}`)
    lines.push('')
  }

  // Full audio transcript
  if (summary.audioTranscript) {
    lines.push('## Audio Transcript')
    lines.push('')
    lines.push(summary.audioTranscript)
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadMarkdown(summary: SessionSummary): void {
  const md = generateMarkdown(summary)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `session-summary-${new Date().toISOString().slice(0, 10)}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(summary: SessionSummary): Promise<boolean> {
  const md = generateMarkdown(summary)
  try {
    await navigator.clipboard.writeText(md)
    return true
  } catch {
    return false
  }
}
