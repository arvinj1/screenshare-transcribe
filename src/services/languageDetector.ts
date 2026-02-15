import { franc } from 'franc'

const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  nld: 'nl',
  rus: 'ru',
  jpn: 'ja',
  zho: 'zh',
  kor: 'ko',
  ara: 'ar',
  hin: 'hi',
  und: 'und',
}

export function detectLanguage(text: string): string {
  if (!text || text.length < 10) {
    return 'und'
  }

  const detected = franc(text, { minLength: 10 })
  return LANGUAGE_NAMES[detected] || detected
}
