/**
 * Entity extraction service - extracts structured entities from OCR text
 * Handles: emails, dates, phone numbers, numbers with context, proper nouns
 */

import type { ExtractedEntities } from '../types'

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Date patterns (various formats)
const DATE_PATTERNS = [
  // ISO: 2024-01-15
  /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
  // US: 01/15/2024, 1/15/24
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
  // EU: 15-01-2024, 15.01.2024
  /\b(\d{1,2}[-\.]\d{1,2}[-\.]\d{2,4})\b/g,
  // Written: January 15, 2024 / Jan 15, 2024 / 15 January 2024
  /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{2,4})\b/gi,
  /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s*\d{2,4})\b/gi,
]

// Phone number patterns (international and US)
const PHONE_PATTERNS = [
  // International: +1-234-567-8900, +44 20 7946 0958
  /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  // US: (123) 456-7890, 123-456-7890, 123.456.7890
  /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
]

// Numbers with context patterns
const NUMBER_CONTEXT_PATTERNS = [
  // Currency: $1,234.56, $100, €50, £30
  { pattern: /[$€£¥]\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g, type: 'currency' },
  // Percentages: 50%, 12.5%
  { pattern: /\d+(?:\.\d+)?%/g, type: 'percentage' },
  // Dimensions: 1920x1080, 100px, 12pt
  { pattern: /\d+(?:\.\d+)?\s*(?:px|pt|em|rem|vh|vw|cm|mm|in|x\d+)/gi, type: 'dimension' },
  // Time: 3:30 PM, 15:45, 2h 30m
  { pattern: /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g, type: 'time' },
  { pattern: /\b\d+h\s*\d*m?\b/gi, type: 'duration' },
  // Version numbers: v2.1.0, 3.14.159
  { pattern: /\bv?\d+\.\d+(?:\.\d+)*\b/g, type: 'version' },
]

// Proper noun detection - capitalized words not at sentence start
const PROPER_NOUN_MIN_LENGTH = 2
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'we', 'you',
  'he', 'she', 'they', 'them', 'their', 'our', 'your', 'my', 'his', 'her',
  'if', 'then', 'else', 'when', 'where', 'why', 'how', 'what', 'which',
  'who', 'whom', 'whose', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
  'there', 'today', 'tomorrow', 'yesterday', 'new', 'first', 'last',
  'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big',
  'high', 'different', 'small', 'large', 'next', 'early', 'young',
  'important', 'public', 'bad', 'good', 'same', 'able', 'note', 'click',
  'please', 'thank', 'thanks', 'hello', 'hi', 'hey', 'okay', 'ok',
])

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN) || []
  return [...new Set(matches.map(e => e.toLowerCase()))]
}

function extractDates(text: string): Array<{ value: string; normalized?: string }> {
  const dates: Array<{ value: string; normalized?: string }> = []
  const seen = new Set<string>()

  for (const pattern of DATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const value = match[1] || match[0]
      const normalized = value.toLowerCase().trim()
      if (!seen.has(normalized)) {
        seen.add(normalized)
        dates.push({ value: value.trim() })
      }
    }
  }

  return dates
}

function extractPhones(text: string): string[] {
  const phones: string[] = []
  const seen = new Set<string>()

  for (const pattern of PHONE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const phone = match[0].trim()
      // Normalize for deduplication
      const normalized = phone.replace(/[-.\s()]/g, '')
      if (normalized.length >= 10 && !seen.has(normalized)) {
        seen.add(normalized)
        phones.push(phone)
      }
    }
  }

  return phones
}

function extractNumbers(text: string): Array<{ value: string; context: string }> {
  const numbers: Array<{ value: string; context: string }> = []
  const seen = new Set<string>()

  for (const { pattern, type } of NUMBER_CONTEXT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const value = match[0].trim()
      if (!seen.has(value)) {
        seen.add(value)
        numbers.push({ value, context: type })
      }
    }
  }

  return numbers
}

function extractProperNouns(text: string): string[] {
  const properNouns: string[] = []
  const seen = new Set<string>()

  // Split into sentences
  const sentences = text.split(/[.!?\n]+/)

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/)

    for (let i = 0; i < words.length; i++) {
      const word = words[i]

      // Skip first word of sentence (always capitalized)
      if (i === 0) continue

      // Check if capitalized
      if (!/^[A-Z][a-z]+$/.test(word)) continue

      // Skip short words
      if (word.length < PROPER_NOUN_MIN_LENGTH) continue

      // Skip common words
      if (COMMON_WORDS.has(word.toLowerCase())) continue

      const normalized = word.toLowerCase()
      if (!seen.has(normalized)) {
        seen.add(normalized)
        properNouns.push(word)
      }
    }

    // Also look for multi-word proper nouns (consecutive capitalized words)
    const multiWordPattern = /(?<!\.\s)(?:[A-Z][a-z]+\s){1,3}[A-Z][a-z]+/g
    let match: RegExpExecArray | null
    while ((match = multiWordPattern.exec(sentence)) !== null) {
      const phrase = match[0].trim()
      // Skip if it's at the start of the sentence
      if (sentence.trim().startsWith(phrase)) continue

      const normalized = phrase.toLowerCase()
      if (!seen.has(normalized)) {
        // Check no word is a common word
        const words = phrase.split(/\s+/)
        const hasCommon = words.some(w => COMMON_WORDS.has(w.toLowerCase()))
        if (!hasCommon) {
          seen.add(normalized)
          properNouns.push(phrase)
        }
      }
    }
  }

  return properNouns
}

/**
 * Extract all entities from text
 */
export function extractEntities(text: string): ExtractedEntities {
  return {
    emails: extractEmails(text),
    dates: extractDates(text),
    phones: extractPhones(text),
    numbers: extractNumbers(text),
    properNouns: extractProperNouns(text),
  }
}

/**
 * Merge multiple ExtractedEntities into one, deduplicating
 */
export function mergeEntities(entitiesList: ExtractedEntities[]): ExtractedEntities {
  const emailSet = new Set<string>()
  const dateSet = new Set<string>()
  const phoneSet = new Set<string>()
  const numberSet = new Set<string>()
  const properNounSet = new Set<string>()

  const dates: Array<{ value: string; normalized?: string }> = []
  const numbers: Array<{ value: string; context: string }> = []

  for (const entities of entitiesList) {
    for (const email of entities.emails) {
      emailSet.add(email)
    }
    for (const date of entities.dates) {
      if (!dateSet.has(date.value.toLowerCase())) {
        dateSet.add(date.value.toLowerCase())
        dates.push(date)
      }
    }
    for (const phone of entities.phones) {
      phoneSet.add(phone)
    }
    for (const num of entities.numbers) {
      if (!numberSet.has(num.value)) {
        numberSet.add(num.value)
        numbers.push(num)
      }
    }
    for (const noun of entities.properNouns) {
      properNounSet.add(noun)
    }
  }

  return {
    emails: [...emailSet],
    dates,
    phones: [...phoneSet],
    numbers,
    properNouns: [...properNounSet],
  }
}

/**
 * Check if entities object has any content
 */
export function hasEntities(entities: ExtractedEntities): boolean {
  return (
    entities.emails.length > 0 ||
    entities.dates.length > 0 ||
    entities.phones.length > 0 ||
    entities.numbers.length > 0 ||
    entities.properNouns.length > 0
  )
}
