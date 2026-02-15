import { useState, useCallback } from 'react'
import type { OCRResult, SessionSummary, SlideSummary } from '../types'
import { extractKeywords } from '../services/textCleaner'
import { inferFromText } from '../services/textInference'

interface UseSummaryReturn {
  summary: SessionSummary | null
  generateSummary: (results: OCRResult[], sessionStart: number | null) => void
  clearSummary: () => void
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function buildSlides(results: OCRResult[]): SlideSummary[] {
  const slideMap = new Map<number, OCRResult[]>()

  for (const r of results) {
    const existing = slideMap.get(r.slideNumber) || []
    existing.push(r)
    slideMap.set(r.slideNumber, existing)
  }

  const slides: SlideSummary[] = []
  for (const [slideNumber, slideResults] of slideMap) {
    // Use the longest text capture as representative for the slide
    const bestCapture = slideResults.reduce((best, r) =>
      r.text.length > best.text.length ? r : best
    )
    const allUrls = [...new Set(slideResults.flatMap(r => r.urls))]
    const keywords = extractKeywords(bestCapture.text, 5)

    slides.push({
      slideNumber,
      captureCount: slideResults.length,
      text: bestCapture.text,
      keywords,
      urls: allUrls,
    })
  }

  return slides.sort((a, b) => a.slideNumber - b.slideNumber)
}

export function useSummary(): UseSummaryReturn {
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  const generateSummary = useCallback((results: OCRResult[], sessionStart: number | null) => {
    if (results.length === 0) {
      setSummary({
        totalCaptures: 0,
        slideCount: 0,
        duration: '0s',
        wordCount: 0,
        charCount: 0,
        avgConfidence: 0,
        languages: [],
        urls: [],
        keywords: [],
        slides: [],
        fullText: 'No text was captured during this session.',
        inference: {
          contentType: 'general',
          contentTypeLabel: '📄 General Content',
          contentConfidence: 0,
          headings: [],
          actionItems: [],
          keySentences: [],
          topicClusters: [],
          narrative: 'No text was captured during this session.',
        },
      })
      return
    }

    const slides = buildSlides(results)
    const slideCount = slides.length

    // Use deduplicated text (best capture per slide) for the full text
    const fullText = slides.map(s => s.text).join('\n\n')
    const allUrls = [...new Set(results.flatMap(r => r.urls))]
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    const languages = [...new Set(results.map(r => r.language).filter(l => l !== 'und'))]

    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length
    const charCount = fullText.length

    const durationMs = sessionStart ? Date.now() - sessionStart : 0
    const duration = formatDuration(durationMs)

    const keywords = extractKeywords(fullText, 15)

    // Run text inferencing for intelligent insights
    const inference = inferFromText(fullText, keywords, slideCount, wordCount, duration)

    setSummary({
      totalCaptures: results.length,
      slideCount,
      duration,
      wordCount,
      charCount,
      avgConfidence,
      languages,
      urls: allUrls,
      keywords,
      slides,
      fullText,
      inference,
    })
  }, [])

  const clearSummary = useCallback(() => {
    setSummary(null)
  }, [])

  return {
    summary,
    generateSummary,
    clearSummary,
  }
}
