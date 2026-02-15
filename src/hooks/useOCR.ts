import { useState, useCallback, useRef, useEffect } from 'react'
import type { OCRResult } from '../types'
import { initializeOCR, recognizeImage, terminateOCR } from '../services/ocrService'
import { extractUrls } from '../services/urlParser'
import { detectLanguage } from '../services/languageDetector'
import { cleanOCRText, textSimilarity } from '../services/textCleaner'

// Threshold below which we consider two frames to show different slides/screens
const SLIDE_CHANGE_THRESHOLD = 0.4

interface UseOCRReturn {
  results: OCRResult[]
  isProcessing: boolean
  slideCount: number
  sessionStart: number | null
  processFrame: (canvas: HTMLCanvasElement) => Promise<void>
  clearResults: () => void
}

export function useOCR(): UseOCRReturn {
  const [results, setResults] = useState<OCRResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [slideCount, setSlideCount] = useState(0)
  const [sessionStart, setSessionStart] = useState<number | null>(null)
  const initializedRef = useRef(false)
  const lastTextRef = useRef<string>('')
  const currentSlideRef = useRef(0)

  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        initializedRef.current = true
        await initializeOCR()
      }
    }
    init()

    return () => {
      terminateOCR()
    }
  }, [])

  const processFrame = useCallback(async (canvas: HTMLCanvasElement) => {
    setIsProcessing(true)
    try {
      const { text: rawText, confidence } = await recognizeImage(canvas)

      // Clean the OCR text to remove garbage/noise
      const text = cleanOCRText(rawText)

      if (text.length > 0 && confidence > 20) {
        // Track session start
        setSessionStart(prev => prev ?? Date.now())

        // Detect slide/screen change via text similarity
        const similarity = textSimilarity(lastTextRef.current, text)
        if (similarity < SLIDE_CHANGE_THRESHOLD || currentSlideRef.current === 0) {
          currentSlideRef.current += 1
          setSlideCount(currentSlideRef.current)
        }
        lastTextRef.current = text

        // Extract URLs from raw text to preserve fragments the cleaner might strip
        const urls = extractUrls(rawText)
        const language = detectLanguage(text)

        const newResult: OCRResult = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          text,
          rawText,
          confidence,
          language,
          urls,
          slideNumber: currentSlideRef.current,
        }

        setResults(prev => [...prev.slice(-99), newResult])
      }
    } catch (err) {
      console.error('OCR processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setSlideCount(0)
    setSessionStart(null)
    lastTextRef.current = ''
    currentSlideRef.current = 0
  }, [])

  return {
    results,
    isProcessing,
    slideCount,
    sessionStart,
    processFrame,
    clearResults,
  }
}
