/**
 * Text inferencing service — analyzes OCR-captured text to extract
 * structured insights without requiring an external AI/LLM.
 *
 * Performs:
 * - Content type detection (presentation, code, article, chat, terminal, etc.)
 * - Heading / key point extraction
 * - Action item / TODO detection
 * - Sentence-level importance scoring for auto-summarization
 * - Topic clustering
 */

// ─── Content Type Detection ──────────────────────────────────────

export type ContentType =
  | 'presentation'
  | 'code'
  | 'terminal'
  | 'article'
  | 'chat'
  | 'spreadsheet'
  | 'email'
  | 'documentation'
  | 'general'

interface ContentSignals {
  type: ContentType
  confidence: number
}

const CODE_KEYWORDS = /\b(function|const|let|var|class|import|export|return|if|else|for|while|def|print|async|await|interface|type|enum|struct|void|int|string|boolean|null|undefined|true|false|try|catch|throw|new)\b/g
const TERMINAL_PATTERN = /^[\$#>»]\s|^\w+@[\w.-]+[:%~]|^root@|^\([\w-]+\)\s*\$|^C:\\|^~\/|npm\s+(run|install|start)|yarn\s|pip\s|brew\s|apt\s|git\s+(commit|push|pull|clone|checkout|merge|status|log|diff)/m
const CHAT_PATTERN = /^[\w\s]{2,20}:\s.{5,}$/m
const SPREADSHEET_PATTERN = /(\t.*){3,}|(\|.*){3,}/m
const EMAIL_PATTERN = /^(From|To|Subject|Date|Cc|Bcc):\s/m
const HEADING_LIKE = /^(#{1,6}\s|[A-Z][A-Z\s]{4,}$|[\d]+\.\s+[A-Z]|\*\*[^*]+\*\*$|^[-•●▸▹►]\s)/m
const BULLET_PATTERN = /^[\s]*[-•●▸▹►✓✗→]\s/m

function detectContentType(text: string): ContentSignals {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const totalChars = text.length

  // Code detection
  const codeMatches = (text.match(CODE_KEYWORDS) || []).length
  const braceCount = (text.match(/[{}()[\]]/g) || []).length
  const codeScore = (codeMatches / Math.max(lines.length, 1)) * 0.6 +
    (braceCount / Math.max(totalChars, 1)) * 200

  if (codeScore > 1.5) return { type: 'code', confidence: Math.min(codeScore / 3, 1) }

  // Terminal
  if (TERMINAL_PATTERN.test(text)) {
    const terminalLines = lines.filter(l => TERMINAL_PATTERN.test(l)).length
    if (terminalLines / lines.length > 0.2) {
      return { type: 'terminal', confidence: terminalLines / lines.length }
    }
  }

  // Email
  if (EMAIL_PATTERN.test(text)) return { type: 'email', confidence: 0.8 }

  // Chat
  const chatLines = lines.filter(l => CHAT_PATTERN.test(l)).length
  if (chatLines / Math.max(lines.length, 1) > 0.3) {
    return { type: 'chat', confidence: chatLines / lines.length }
  }

  // Spreadsheet
  if (SPREADSHEET_PATTERN.test(text)) return { type: 'spreadsheet', confidence: 0.7 }

  // Presentation (short bullet-heavy slides)
  const bulletLines = lines.filter(l => BULLET_PATTERN.test(l)).length
  const headingLines = lines.filter(l => HEADING_LIKE.test(l)).length
  const avgLineLength = lines.reduce((s, l) => s + l.length, 0) / Math.max(lines.length, 1)
  if ((bulletLines + headingLines) / Math.max(lines.length, 1) > 0.3 && avgLineLength < 80) {
    return { type: 'presentation', confidence: 0.75 }
  }

  // Documentation (lots of headings + paragraphs)
  if (headingLines >= 2 && avgLineLength > 40) {
    return { type: 'documentation', confidence: 0.6 }
  }

  // Article (long paragraphs)
  if (avgLineLength > 60 && lines.length > 3) {
    return { type: 'article', confidence: 0.5 }
  }

  return { type: 'general', confidence: 0.3 }
}

// ─── Key Point / Heading Extraction ──────────────────────────────

/**
 * Extract lines that look like headings, titles, or key points.
 */
function extractHeadings(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const headings: string[] = []

  for (const line of lines) {
    // Markdown-style headings
    if (/^#{1,6}\s+/.test(line)) {
      headings.push(line.replace(/^#+\s+/, ''))
      continue
    }
    // ALL CAPS lines (likely headings/titles)
    if (/^[A-Z][A-Z\s\d:.\-/]{4,60}$/.test(line) && !/\b(THE|AND|FOR|ARE|BUT|NOT)\b/.test(line.substring(1))) {
      headings.push(line)
      continue
    }
    // Numbered headings like "1. Introduction"
    if (/^\d+[\.)]\s+[A-Z]/.test(line) && line.length < 80) {
      headings.push(line)
      continue
    }
    // Bold markers
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      headings.push(line.replace(/\*\*/g, ''))
      continue
    }
  }

  return [...new Set(headings)]
}

// ─── Action Item / TODO Detection ────────────────────────────────

const ACTION_PATTERNS = [
  /\b(?:TODO|FIXME|HACK|XXX|BUG|NOTE|IMPORTANT)[\s:]+(.+)/gi,
  /\b(?:action\s*item|follow\s*up|next\s*step|to\s*do|task)[\s:]+(.+)/gi,
  /^\s*[-•●▸✓✗☐☑]\s*(.+(?:need|must|should|will|todo|fix|update|review|check|ensure|implement|create|add|remove|delete|refactor).+)/gim,
  /\b(?:need\s+to|must|should|have\s+to|required\s+to)\s+(.{10,80})/gi,
  /\b(?:deadline|due\s+(?:date|by)|by\s+(?:end\s+of|EOD|COB|tomorrow|monday|tuesday|wednesday|thursday|friday))\b.{0,60}/gi,
]

function extractActionItems(text: string): string[] {
  const actions: string[] = []

  for (const pattern of ACTION_PATTERNS) {
    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const item = (match[1] || match[0]).trim()
      if (item.length > 5 && item.length < 200) {
        actions.push(item)
      }
    }
  }

  return [...new Set(actions)]
}

// ─── Extractive Summarization ────────────────────────────────────

/**
 * Simple extractive summarization:
 * Score each sentence by importance signals, return the top ones.
 */
function extractiveSummarize(text: string, maxSentences = 5): string[] {
  // Split into sentences
  const sentences = text
    .replace(/\n+/g, '. ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => {
      const wordCount = s.split(/\s+/).length
      return wordCount >= 4 && wordCount <= 50 && s.length > 15
    })

  if (sentences.length === 0) return []
  if (sentences.length <= maxSentences) return sentences

  // Score each sentence
  const scored = sentences.map((sentence, index) => {
    let score = 0

    // Position bonus — first and last sentences tend to be important
    if (index === 0) score += 2
    if (index === sentences.length - 1) score += 1
    if (index < sentences.length * 0.2) score += 1  // early sentences

    // Length — medium-length sentences are usually more informative
    const wordCount = sentence.split(/\s+/).length
    if (wordCount >= 8 && wordCount <= 25) score += 1

    // Contains numbers/data
    if (/\d+/.test(sentence)) score += 0.5

    // Contains key signal words
    if (/\b(important|key|main|significant|critical|essential|primary|conclusion|result|summary|finding|shows?|demonstrates?|indicates?|reveals?)\b/i.test(sentence)) {
      score += 2
    }

    // Contains a proper noun (capitalized word not at start)
    if (/\s[A-Z][a-z]+/.test(sentence)) score += 0.5

    // Penalize questions slightly
    if (sentence.endsWith('?')) score -= 0.5

    return { sentence, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Return top sentences in original order
  const topSentences = scored.slice(0, maxSentences)
  const originalOrder = sentences.filter(s => topSentences.some(t => t.sentence === s))

  return originalOrder
}

// ─── Topic Clustering ────────────────────────────────────────────

/**
 * Group keywords into semantic topic clusters using enhanced co-occurrence
 * with frequency weighting and cluster quality scoring.
 */
function clusterTopics(text: string, keywords: string[]): string[][] {
  if (keywords.length < 2) return keywords.length ? [keywords] : []

  const sentences = text.toLowerCase().split(/[.!?\n]+/).filter(s => s.length > 10)

  // Build weighted co-occurrence matrix
  const cooccurrence = new Map<string, Map<string, number>>()
  const keywordFreq = new Map<string, number>()

  for (const kw of keywords) {
    cooccurrence.set(kw, new Map())
    keywordFreq.set(kw, 0)
  }

  // Count co-occurrences with frequency weighting
  for (const sentence of sentences) {
    const present = keywords.filter(kw => sentence.includes(kw))
    for (const kw of present) {
      keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1)
    }
    for (const a of present) {
      for (const b of present) {
        if (a !== b) {
          const aMap = cooccurrence.get(a)!
          aMap.set(b, (aMap.get(b) || 0) + 1)
        }
      }
    }
  }

  // Sort keywords by frequency for better cluster seeds
  const sortedKeywords = [...keywords].sort(
    (a, b) => (keywordFreq.get(b) || 0) - (keywordFreq.get(a) || 0)
  )

  // Enhanced greedy clustering with strength threshold
  const assigned = new Set<string>()
  const clusters: string[][] = []
  const MIN_COOCCURRENCE = 1

  for (const kw of sortedKeywords) {
    if (assigned.has(kw)) continue

    const cluster = [kw]
    assigned.add(kw)

    const neighbors = cooccurrence.get(kw) || new Map()

    // Get neighbors sorted by co-occurrence strength
    const sortedNeighbors = [...neighbors.entries()]
      .filter(([_, count]) => count >= MIN_COOCCURRENCE)
      .sort((a, b) => b[1] - a[1])

    // Add top neighbors to cluster (limit cluster size)
    const MAX_CLUSTER_SIZE = 5
    for (const [neighbor] of sortedNeighbors) {
      if (cluster.length >= MAX_CLUSTER_SIZE) break
      if (!assigned.has(neighbor)) {
        cluster.push(neighbor)
        assigned.add(neighbor)
      }
    }

    clusters.push(cluster)
  }

  // Sort clusters by total frequency (prominence)
  clusters.sort((a, b) => {
    const aFreq = a.reduce((sum, kw) => sum + (keywordFreq.get(kw) || 0), 0)
    const bFreq = b.reduce((sum, kw) => sum + (keywordFreq.get(kw) || 0), 0)
    return bFreq - aFreq
  })

  // Merge small singleton clusters if they have weak connections
  const MIN_CLUSTER_SIZE = 2
  const singletons: string[] = []
  const mergedClusters: string[][] = []

  for (const cluster of clusters) {
    if (cluster.length < MIN_CLUSTER_SIZE) {
      singletons.push(...cluster)
    } else {
      mergedClusters.push(cluster)
    }
  }

  // Add singletons as a miscellaneous cluster if any
  if (singletons.length > 0) {
    mergedClusters.push(singletons)
  }

  return mergedClusters
}

// ─── Content-Aware Narrative ─────────────────────────────────────

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  presentation: '📊 Presentation / Slides',
  code: '💻 Source Code',
  terminal: '🖥️ Terminal / Command Line',
  article: '📰 Article / Document',
  chat: '💬 Chat / Conversation',
  spreadsheet: '📋 Spreadsheet / Tabular Data',
  email: '📧 Email',
  documentation: '📖 Documentation',
  general: '📄 General Content',
}

function generateNarrative(
  contentType: ContentSignals,
  slideCount: number,
  wordCount: number,
  duration: string,
  topSentences: string[],
  headings: string[],
  keywords: string[],
): string {
  const typeLabel = CONTENT_TYPE_LABELS[contentType.type]
  let narrative = `This session captured ${typeLabel.toLowerCase()} content`

  if (slideCount > 1) {
    narrative += ` across ${slideCount} distinct screens/slides`
  }

  narrative += ` over ${duration}, containing approximately ${wordCount} words.`

  if (headings.length > 0) {
    narrative += ` The content covers: ${headings.slice(0, 5).join(', ')}.`
  } else if (keywords.length > 0) {
    narrative += ` Key topics include ${keywords.slice(0, 5).join(', ')}.`
  }

  if (topSentences.length > 0) {
    narrative += `\n\nKey takeaways:\n`
    topSentences.forEach((s, i) => {
      narrative += `${i + 1}. ${s}\n`
    })
  }

  return narrative
}

// ─── Public API ──────────────────────────────────────────────────

export interface TextInference {
  contentType: ContentType
  contentTypeLabel: string
  contentConfidence: number
  headings: string[]
  actionItems: string[]
  keySentences: string[]
  topicClusters: string[][]
  narrative: string
}

/**
 * Run all text inference on the captured content.
 */
export function inferFromText(
  fullText: string,
  keywords: string[],
  slideCount: number,
  wordCount: number,
  duration: string,
): TextInference {
  const contentType = detectContentType(fullText)
  const headings = extractHeadings(fullText)
  const actionItems = extractActionItems(fullText)
  const keySentences = extractiveSummarize(fullText, 5)
  const topicClusters = clusterTopics(fullText, keywords.slice(0, 15))
  const narrative = generateNarrative(
    contentType, slideCount, wordCount, duration, keySentences, headings, keywords,
  )

  return {
    contentType: contentType.type,
    contentTypeLabel: CONTENT_TYPE_LABELS[contentType.type],
    contentConfidence: contentType.confidence,
    headings,
    actionItems,
    keySentences,
    topicClusters,
    narrative,
  }
}
