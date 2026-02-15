/**
 * Filters out OCR noise/garbage text that doesn't represent
 * meaningful content from screen captures.
 */

// Common OCR garbage patterns
const GARBAGE_PATTERNS = [
  /^[^a-zA-Z0-9]*$/,                   // No alphanumeric characters at all
  /^(.)\1{3,}$/,                        // Repeated single character (e.g., "aaaa", "||||")
  /^[|!lI1]{4,}$/,                      // Common OCR misreads (vertical bars, l/I/1 confusion)
  /[^\x20-\x7E\n\r\t]/g,               // Non-printable characters (used for ratio check)
]

// Minimum word length to consider a word valid
const MIN_WORD_LENGTH = 2

// Maximum ratio of special characters to total characters
const MAX_SPECIAL_CHAR_RATIO = 0.6

// Minimum ratio of alphabetic characters in a word
const MIN_ALPHA_RATIO = 0.3

// Common English stop words and UI terms we want to keep
const VALID_SHORT_WORDS = new Set([
  'a', 'i', 'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he',
  'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'ok', 'on', 'or',
  'so', 'to', 'up', 'us', 'we', 'vs',
])

/**
 * Check if a single word looks like valid text vs OCR noise
 */
function isValidWord(word: string): boolean {
  const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Keep known short words
  if (VALID_SHORT_WORDS.has(lower)) return true

  // Reject very short meaningless tokens
  if (lower.length < MIN_WORD_LENGTH) return false

  // Check alphabetic ratio - real words have letters
  const alphaCount = (lower.match(/[a-z]/g) || []).length
  if (lower.length > 0 && alphaCount / lower.length < MIN_ALPHA_RATIO) return false

  // Check for excessive repeated characters (e.g., "aaaaaa", "xxxxxs")
  if (/(.)\1{3,}/.test(lower)) return false

  return true
}

/**
 * Clean a line of OCR text, removing noise words
 */
function cleanLine(line: string): string {
  if (line.trim().length === 0) return ''

  const words = line.split(/\s+/)
  const cleanedWords = words.filter(isValidWord)

  // If we filtered out most of the words, the whole line is probably garbage
  if (words.length > 2 && cleanedWords.length / words.length < 0.3) {
    return ''
  }

  return cleanedWords.join(' ')
}

/**
 * Check if a full block of OCR text is mostly garbage
 */
function isGarbageBlock(text: string): boolean {
  // All non-alphanumeric
  if (GARBAGE_PATTERNS[0].test(text)) return true

  // Check special character ratio
  const specialCount = (text.match(/[^a-zA-Z0-9\s.,!?;:'"()\-]/g) || []).length
  if (text.length > 0 && specialCount / text.length > MAX_SPECIAL_CHAR_RATIO) return true

  // Very short with no real words
  const words = text.split(/\s+/).filter(w => w.length >= MIN_WORD_LENGTH)
  if (text.length < 5 && words.length === 0) return true

  return false
}

/**
 * Clean OCR text output:
 * - Remove garbage/noise words
 * - Remove lines that are mostly gibberish
 * - Normalize whitespace
 * - Preserve meaningful content
 */
export function cleanOCRText(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return ''

  // Quick reject: whole block is garbage
  if (isGarbageBlock(rawText)) return ''

  const lines = rawText.split('\n')
  const cleanedLines = lines
    .map(cleanLine)
    .filter(line => line.length > 0)

  const result = cleanedLines.join('\n').trim()

  // If after cleaning we have almost nothing, discard
  if (result.length < 3) return ''

  return result
}

/**
 * Calculate a similarity score between two texts (0-1).
 * Used for detecting slide/screen transitions.
 * Uses Jaccard similarity on word sets.
 */
export function textSimilarity(textA: string, textB: string): number {
  if (!textA && !textB) return 1
  if (!textA || !textB) return 0

  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length >= 3))
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length >= 3))

  if (wordsA.size === 0 && wordsB.size === 0) return 1
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let intersection = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++
  }

  const union = wordsA.size + wordsB.size - intersection
  return union === 0 ? 1 : intersection / union
}

/**
 * Extract the most frequent meaningful words from text.
 * Useful for topic/keyword extraction in the summary.
 */
export function extractKeywords(text: string, topN = 10): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
    'will', 'with', 'this', 'that', 'from', 'they', 'were', 'which',
    'their', 'what', 'there', 'when', 'make', 'like', 'than', 'each',
    'more', 'some', 'them', 'then', 'very', 'just', 'about', 'into',
    'also', 'could', 'would', 'should', 'other', 'these', 'your',
  ])

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w))

  const freq = new Map<string, number>()
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1)
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)
}
