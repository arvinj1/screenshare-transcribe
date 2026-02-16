import { useState, useCallback, useRef } from 'react'
import type { AudioSegment } from '../types'

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

interface UseAudioCaptureReturn {
  isListening: boolean
  audioError: string | null
  startAudio: (onSegment: (segment: AudioSegment) => void) => void
  stopAudio: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isListening, setIsListening] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onSegmentRef = useRef<((segment: AudioSegment) => void) | null>(null)
  const stoppingRef = useRef(false)

  const startAudio = useCallback((onSegment: (segment: AudioSegment) => void) => {
    setAudioError(null)
    stoppingRef.current = false

    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setAudioError('Speech recognition is not supported in this browser')
      return
    }

    onSegmentRef.current = onSegment

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.trim()
        if (transcript.length === 0) continue

        const segment: AudioSegment = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          text: transcript,
          isFinal: result.isFinal,
          confidence: result[0].confidence,
        }

        onSegmentRef.current?.(segment)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setAudioError('Microphone permission was denied')
        setIsListening(false)
      } else if (event.error === 'no-speech') {
        // Ignore — recognition will auto-restart via onend
      } else if (event.error !== 'aborted') {
        setAudioError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      // Auto-restart if we haven't explicitly stopped
      if (!stoppingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {
          // Already started or stopping — ignore
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setAudioError('Failed to start speech recognition')
    }
  }, [])

  const stopAudio = useCallback(() => {
    stoppingRef.current = true
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      try {
        recognitionRef.current.stop()
      } catch {
        // Already stopped — ignore
      }
      recognitionRef.current = null
    }
    onSegmentRef.current = null
    setIsListening(false)
  }, [])

  return {
    isListening,
    audioError,
    startAudio,
    stopAudio,
  }
}
