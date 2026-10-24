import type { AINotes, SessionSummary, SavedSession } from '../types'
import { slideLabel } from './notesFormat'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'session'
}

function uniqueFilename(title: string | undefined, ext: string): string {
  const base = sanitizeFilename(title ?? 'deckjot-notes')
  const date = new Date().toISOString().slice(0, 10)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${date}-${suffix}.${ext}`
}

function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function section(title: string, items: string[]): string[] {
  return items.length > 0 ? [`## ${title}`, '', ...items, ''] : []
}

function detailedNotesMarkdown(notes: AINotes, keyPoints: string[]): string[] {
  const out: string[] = []
  out.push(...section('Key points', keyPoints.map(p => `- ${p}`)))
  out.push(...section('Themes', notes.themes.map(t => `- **${t.name}**${t.slides.length ? ` (${slideLabel(t.slides)})` : ''}: ${t.summary}`)))
  out.push(...section('Decisions', notes.decisions.map(d => `- ${d}`)))
  out.push(...section('Action items', notes.actionItems.map(a => {
    const meta = [a.owner.trim() && `owner: ${a.owner.trim()}`, a.due.trim() && `due: ${a.due.trim()}`].filter(Boolean).join(', ')
    return `- [ ] ${a.task}${meta ? ` (${meta})` : ''}`
  })))
  out.push(...section('Open questions and risks', notes.openQuestions.map(q => `- ${q}`)))
  out.push(...section('Key numbers', notes.keyNumbers.map(n => `- **${n.value}**: ${n.context}`)))
  if (notes.slideNotes.length > 0) {
    out.push('## Slide-by-slide notes', '')
    for (const n of notes.slideNotes) {
      out.push(`### ${n.title} (${slideLabel(n.slides)})`, '')
      if (n.shown) out.push(`- **Shown:** ${n.shown}`)
      if (n.said) out.push(`- **Said:** ${n.said}`)
      if (n.takeaway) out.push(`- **Takeaway:** ${n.takeaway}`)
      out.push('')
    }
  }
  return out
}

export function generateMarkdown(summary: SessionSummary): string {
  const lines: string[] = []
  const { inference } = summary

  lines.push(`# ${summary.aiTitle || 'Session Summary'}`)
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

  if (summary.aiNotes) {
    lines.push(...detailedNotesMarkdown(summary.aiNotes, inference.keySentences))
  }

  // Key Insights (merged key sentences + action items) — detailed notes already cover these
  const insights: string[] = []
  for (const s of inference.keySentences) insights.push(`- ${s}`)
  for (const a of inference.actionItems) insights.push(`- [ ] ${a}`)
  if (!summary.aiNotes && insights.length > 0) {
    lines.push('## Key Insights')
    lines.push('')
    lines.push(...insights)
    lines.push('')
  }

  // Per-slide timeline
  if (summary.slides.length > 0) {
    lines.push(summary.aiNotes ? '## Raw slide text and transcript' : '## Slide Timeline')
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

export function downloadMarkdown(summary: SessionSummary, title?: string): void {
  const md = generateMarkdown(summary)
  downloadBlob(md, 'text/markdown;charset=utf-8', uniqueFilename(title ?? summary.aiTitle, 'md'))
}

export function downloadJSON(session: SavedSession): void {
  const json = JSON.stringify(session, null, 2)
  downloadBlob(json, 'application/json;charset=utf-8', uniqueFilename(session.title, 'json'))
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
