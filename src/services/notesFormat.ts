/** "Slide 3", "Slides 3–5", or "Slides 2, 5, 8" */
export function slideLabel(slides: number[]): string {
  const nums = [...new Set(slides)].sort((a, b) => a - b)
  if (nums.length === 0) return ''
  if (nums.length === 1) return `Slide ${nums[0]}`
  const consecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
  return consecutive ? `Slides ${nums[0]}–${nums[nums.length - 1]}` : `Slides ${nums.join(', ')}`
}

/** Split an overview into paragraphs on blank lines. */
export function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
}
