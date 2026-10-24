/**
 * Cheap frame-change detection: compare small grayscale thumbnails so OCR
 * only runs when what's on screen actually changed.
 */

// Thumbnail size: small enough to compare in about a millisecond, large
// enough that a single new word of slide text changes a measurable share of pixels.
export const THUMB_WIDTH = 320
export const THUMB_HEIGHT = 180

// A pixel counts as changed when its brightness moves by more than this (0-255).
// Ignores video-compression shimmer and slight anti-aliasing differences.
const PIXEL_DELTA = 24

// Run OCR when more than this share of thumbnail pixels changed. 0.05% is
// about 29 pixels: a moving mouse cursor stays well below it, while one new
// word of small (24px at 1080p) slide text goes above it.
export const CHANGE_THRESHOLD = 0.0005

// Re-run OCR at least this often even on an "unchanged" frame, as a safety net
// for changes too subtle for the thumbnail (e.g. a single digit edit).
export const MAX_SKIP_MS = 30_000

/** Grayscale brightness values (0-255) for an RGBA pixel buffer. */
export function toGrayscale(rgba: Uint8ClampedArray): Uint8Array {
  const gray = new Uint8Array(rgba.length / 4)
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    // Integer Rec. 601 luma approximation
    gray[p] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8
  }
  return gray
}

/** Share of pixels (0-1) whose brightness differs by more than PIXEL_DELTA. */
export function changedPixelRatio(prev: Uint8Array, next: Uint8Array): number {
  if (prev.length !== next.length || next.length === 0) return 1
  let changed = 0
  for (let i = 0; i < next.length; i++) {
    if (Math.abs(next[i] - prev[i]) > PIXEL_DELTA) changed++
  }
  return changed / next.length
}

/** True when there's no previous frame or enough of the frame changed to re-run OCR. */
export function hasFrameChanged(prev: Uint8Array | null, next: Uint8Array): boolean {
  return prev === null || changedPixelRatio(prev, next) > CHANGE_THRESHOLD
}
