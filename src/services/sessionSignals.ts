/**
 * Measurable facts about a session — time on screen, how much was said,
 * themes that recur across slides, numbers mentioned — computed locally so
 * a Claude summary can be grounded in the data, not just the raw text.
 */

import type { SessionSummary } from '../types'

export interface SlideSignal {
  slideNumber: number
  /** First line of the slide text, usually its title */
  title: string
  /** Seconds from the start of the session until the slide appeared */
  startOffsetSec: number | null
  secondsOnScreen: number | null
  wordsSpoken: number
}

export interface ThemeSignal {
  term: string
  /** Slide numbers whose text mentions the term */
  slides: number[]
  /** How often the term appears in the spoken transcript */
  spokenMentions: number
}

export interface NumberSignal {
  value: string
  context: string
  source: 'slide' | 'speech'
}

export interface RepeatSignal {
  term: string
  slideNumber: number
  count: number
}

export interface SessionSignals {
  slides: SlideSignal[]
  recurringThemes: ThemeSignal[]
  /** A term repeated several times on one slide is usually being emphasized */
  repeatedOnSlide: RepeatSignal[]
  mostDiscussed: number[]
  longestOnScreen: number[]
  numbers: NumberSignal[]
}

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'being', 'from', 'have', 'here', 'into', 'just', 'like', 'more', 'most',
  'only', 'other', 'over', 'review', 'slide', 'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'very', 'want', 'were', 'what', 'when', 'which', 'will', 'with',
  'would', 'your', 'team', 'marker',
])

const NUMBER_PATTERN = /(?:[$€£¥]\s?\d[\d,]*(?:\.\d+)?\s?(?:[kKmMbB]|million|billion)?|\b\d[\d,]*(?:\.\d+)?\s?(?:%|percent\b|x\b|ms\b|k\b|million\b|billion\b|users\b|customers\b|days\b|weeks\b|months\b|hours\b)|\b(?:19|20)\d{2}\b|\bQ[1-4]\b)/g

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []
}

function firstLine(text: string): string {
  return (text.split('\n').find(l => l.trim().length > 0) ?? '').trim().slice(0, 80)
}

function countMentions(haystack: string, term: string): number {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
  return haystack.match(re)?.length ?? 0
}

function extractNumbers(text: string, source: NumberSignal['source'], limit: number): NumberSignal[] {
  const found: NumberSignal[] = []
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const start = Math.max(0, (match.index ?? 0) - 40)
    const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 40)
    found.push({ value: match[0].trim(), context: text.slice(start, end).replace(/\s+/g, ' ').trim(), source })
    if (found.length >= limit) break
  }
  return found
}

export function computeSignals(summary: SessionSummary): SessionSignals {
  const sessionStart = summary.slides.find(s => s.startTime !== undefined)?.startTime ?? null

  const slides: SlideSignal[] = summary.slides.map(s => ({
    slideNumber: s.slideNumber,
    title: firstLine(s.text),
    startOffsetSec: sessionStart !== null && s.startTime !== undefined ? Math.round((s.startTime - sessionStart) / 1000) : null,
    secondsOnScreen: s.startTime !== undefined && s.endTime !== undefined ? Math.max(0, Math.round((s.endTime - s.startTime) / 1000)) : null,
    wordsSpoken: s.audioText ? s.audioText.split(/\s+/).filter(Boolean).length : 0,
  }))

  // Terms that appear on more than one slide are the threads of the session
  const slidesByTerm = new Map<string, Set<number>>()
  for (const s of summary.slides) {
    for (const w of new Set(words(s.text))) {
      if (STOP_WORDS.has(w)) continue
      if (!slidesByTerm.has(w)) slidesByTerm.set(w, new Set())
      slidesByTerm.get(w)!.add(s.slideNumber)
    }
  }
  const transcript = summary.audioTranscript.toLowerCase()
  const recurringThemes: ThemeSignal[] = [...slidesByTerm.entries()]
    .filter(([, set]) => set.size >= 2)
    .map(([term, set]) => ({ term, slides: [...set].sort((a, b) => a - b), spokenMentions: countMentions(transcript, term) }))
    .sort((a, b) => b.slides.length + b.spokenMentions - (a.slides.length + a.spokenMentions))
    .slice(0, 12)

  const repeatedOnSlide: RepeatSignal[] = []
  for (const s of summary.slides) {
    const counts = new Map<string, number>()
    for (const w of words(s.text)) if (!STOP_WORDS.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
    for (const [term, count] of counts) if (count >= 3) repeatedOnSlide.push({ term, slideNumber: s.slideNumber, count })
  }
  repeatedOnSlide.sort((a, b) => b.count - a.count)

  const top3 = (key: 'wordsSpoken' | 'secondsOnScreen') =>
    [...slides]
      .filter(s => (s[key] ?? 0) > 0)
      .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
      .slice(0, 3)
      .map(s => s.slideNumber)

  const numbers = [
    ...extractNumbers(summary.slides.map(s => s.text).join('\n'), 'slide', 15),
    ...extractNumbers(summary.audioTranscript, 'speech', 15),
  ]

  return {
    slides,
    recurringThemes,
    repeatedOnSlide: repeatedOnSlide.slice(0, 8),
    mostDiscussed: top3('wordsSpoken'),
    longestOnScreen: top3('secondsOnScreen'),
    numbers,
  }
}

function fmtTime(sec: number | null): string {
  if (sec === null) return '?'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** A compact, model-readable digest of the signals. */
export function formatSignals(signals: SessionSignals): string {
  const lines: string[] = []
  if (signals.slides.length > 0) {
    lines.push('Slides (capture order): start time · seconds on screen · words spoken · title')
    for (const s of signals.slides) {
      lines.push(`- Slide ${s.slideNumber}: ${fmtTime(s.startOffsetSec)} · ${s.secondsOnScreen ?? '?'}s · ${s.wordsSpoken} words · ${s.title || '(no title)'}`)
    }
  }
  if (signals.mostDiscussed.length > 0) lines.push(`Most discussed slides: ${signals.mostDiscussed.join(', ')}`)
  if (signals.longestOnScreen.length > 0) lines.push(`Longest on screen: ${signals.longestOnScreen.join(', ')}`)
  if (signals.recurringThemes.length > 0) {
    lines.push('Terms recurring across slides (slides · spoken mentions):')
    for (const t of signals.recurringThemes) lines.push(`- ${t.term}: slides ${t.slides.join(', ')} · ${t.spokenMentions} spoken`)
  }
  if (signals.repeatedOnSlide.length > 0) {
    lines.push(`Repeated on a single slide (emphasis): ${signals.repeatedOnSlide.map(r => `${r.term} ×${r.count} on slide ${r.slideNumber}`).join('; ')}`)
  }
  if (signals.numbers.length > 0) {
    lines.push('Numbers mentioned:')
    for (const n of signals.numbers) lines.push(`- ${n.value} (${n.source}): “${n.context}”`)
  }
  return lines.join('\n')
}
