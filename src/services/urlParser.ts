// Matches full URLs with protocol
const FULL_URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi

// Matches bare domains without protocol (e.g. github.com/user/repo, docs.google.com/...)
const BARE_DOMAIN_REGEX = /(?:^|[\s([\]<])(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|io|dev|ai|co|app|edu|gov|me|info|biz|us|uk|de|fr|jp|au|ca|nl|ru|ch|se|no|fi|be|at|it|es|pt|br|in|za|nz|kr|cn|tw|xyz|tech|cloud|page|site|online|store|design|blog|wiki)(?:\.[a-z]{2})?)(?:\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?/gi

// Common TLDs for validation
const VALID_TLDS = new Set([
  'com', 'org', 'net', 'io', 'dev', 'ai', 'co', 'app', 'edu', 'gov',
  'me', 'info', 'biz', 'us', 'uk', 'de', 'fr', 'jp', 'au', 'ca',
  'nl', 'ru', 'ch', 'se', 'no', 'fi', 'be', 'at', 'it', 'es', 'pt',
  'br', 'in', 'za', 'nz', 'kr', 'cn', 'tw', 'xyz', 'tech', 'cloud',
  'page', 'site', 'online', 'store', 'design', 'blog', 'wiki',
])

/**
 * Attempt to repair OCR-damaged URLs.
 * OCR often introduces spaces, line breaks, or character substitutions
 * in the middle of URLs.
 */
function repairUrl(url: string): string {
  let repaired = url
    // Remove spaces/newlines that OCR may insert inside URLs
    .replace(/\s+/g, '')
    // Common OCR substitutions in URLs
    .replace(/[|l](?=\/)/g, '/')   // | or l before / → /
    .replace(/\/{3,}/g, '//')       // /// → //
    .replace(/\s*\.\s*/g, '.')      // spaces around dots
    .replace(/\s*\/\s*/g, '/')      // spaces around slashes
    .replace(/\s*:\s*/g, ':')       // spaces around colons

  // Fix protocol if mangled
  repaired = repaired.replace(/^h\s*t\s*t\s*p\s*s?\s*:\s*\/\s*\//i, (match) => {
    return match.includes('s') || match.includes('S') ? 'https://' : 'http://'
  })

  return repaired
}

/**
 * Extract URLs from text, including:
 * - Full http/https URLs
 * - Bare domain URLs (github.com/..., docs.google.com/...)
 * - OCR-mangled URLs (with spaces/breaks repaired)
 *
 * Designed to run on RAW OCR text before cleaning to catch fragments.
 */
export function extractUrls(text: string): string[] {
  if (!text) return []

  const urls = new Set<string>()

  // 1. Find full URLs with protocol
  const fullMatches = text.match(FULL_URL_REGEX)
  if (fullMatches) {
    for (const match of fullMatches) {
      const repaired = repairUrl(match)
      if (isValidUrl(repaired)) {
        urls.add(normalizeUrl(repaired))
      }
    }
  }

  // 2. Find bare domain URLs (without protocol)
  let bareMatch: RegExpExecArray | null
  const bareRegex = new RegExp(BARE_DOMAIN_REGEX.source, 'gi')
  while ((bareMatch = bareRegex.exec(text)) !== null) {
    let candidate = bareMatch[0].trim().replace(/^[(\[<\s]+/, '')
    candidate = repairUrl(candidate)

    // Add https:// to bare domains
    if (!candidate.match(/^https?:\/\//i)) {
      candidate = 'https://' + candidate
    }

    if (isValidUrl(candidate)) {
      urls.add(normalizeUrl(candidate))
    }
  }

  // 3. Try to reconstruct URLs split across lines
  const lines = text.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trimEnd()
    const nextLine = lines[i + 1].trimStart()

    // If current line ends with a partial URL and next line continues it
    if (currentLine.match(/https?:\/\/[^\s]*$/i) && nextLine.match(/^[^\s]*\.[a-z]/i)) {
      const combined = repairUrl(currentLine.match(/https?:\/\/[^\s]*$/i)![0] + nextLine.split(/\s/)[0])
      if (isValidUrl(combined)) {
        urls.add(normalizeUrl(combined))
      }
    }
  }

  return [...urls]
}

/**
 * Validate a URL string
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Must have a valid-looking hostname with a TLD
    const parts = parsed.hostname.split('.')
    if (parts.length < 2) return false
    const tld = parts[parts.length - 1].toLowerCase()
    // Allow any 2-3 char TLD or known TLDs
    return tld.length >= 2 && (tld.length <= 3 || VALID_TLDS.has(tld))
  } catch {
    return false
  }
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove trailing slash for consistency
    let normalized = parsed.origin + parsed.pathname.replace(/\/+$/, '') + parsed.search + parsed.hash
    return normalized
  } catch {
    return url
  }
}
