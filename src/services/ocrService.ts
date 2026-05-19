import { runtimeConfig } from '../config/runtime'
import { BackendOCRProvider } from './ocrProviders/backendOCRProvider'
import { LocalTesseractProvider } from './ocrProviders/localTesseractProvider'
import type { OCRInput, OCRProvider, OCRRecognitionResult } from './ocrProviders/types'

let provider: OCRProvider | null = null
let usingLegacyFallback = false

function createPrimaryProvider(): OCRProvider {
  return runtimeConfig.ocr.backendEnabled
    ? new BackendOCRProvider()
    : new LocalTesseractProvider()
}

function createLegacyProvider(): OCRProvider {
  return new LocalTesseractProvider()
}

async function getProvider(): Promise<OCRProvider> {
  if (!provider) {
    provider = createPrimaryProvider()
    await provider.initialize()
  }
  return provider
}

async function fallbackToLegacyProvider(error: unknown): Promise<OCRProvider> {
  if (!runtimeConfig.ocr.backendEnabled || !runtimeConfig.ocr.legacyFallbackEnabled) {
    throw error
  }
  if (usingLegacyFallback) {
    throw error
  }

  usingLegacyFallback = true
  try {
    await provider?.terminate()
  } catch {
    // Ignore cleanup failures during fallback switch.
  }

  provider = createLegacyProvider()
  await provider.initialize()
  return provider
}

export async function initializeOCR(): Promise<void> {
  try {
    await getProvider()
  } catch (error) {
    await fallbackToLegacyProvider(error)
  }
}

export async function recognizeImage(imageData: OCRInput): Promise<OCRRecognitionResult> {
  let currentProvider = await getProvider()
  try {
    return await currentProvider.recognizeImage(imageData)
  } catch (error) {
    currentProvider = await fallbackToLegacyProvider(error)
    return currentProvider.recognizeImage(imageData)
  }
}

export async function terminateOCR(): Promise<void> {
  if (provider) {
    await provider.terminate()
    provider = null
  }
}
