import type { OCRResult } from '../types'

interface OCRResultItemProps {
  result: OCRResult
  hideSlide?: boolean
}

export function OCRResultItem({ result, hideSlide }: OCRResultItemProps) {
  const confidenceColor = result.confidence >= 80
    ? 'confidence-high'
    : result.confidence >= 50
      ? 'confidence-medium'
      : 'confidence-low'

  // Calculate opacity based on confidence (min 0.4, max 1.0)
  const textOpacity = 0.4 + (result.confidence / 100) * 0.6

  const hasEmails = result.entities.emails.length > 0
  const hasUrls = result.urls.length > 0
  const hasPhones = result.entities.phones.length > 0

  return (
    <div className="ocr-result-item">
      <div className="ocr-result-header">
        {!hideSlide && <span className="slide-badge">Slide {result.slideNumber}</span>}
        <span className={`confidence-badge ${confidenceColor}`}>
          {result.confidence.toFixed(0)}%
        </span>
        {result.language && result.language !== 'und' && (
          <span className="language-badge">{result.language}</span>
        )}
        <span className="timestamp">
          {new Date(result.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div
        className="ocr-result-text"
        style={{ opacity: textOpacity }}
      >
        {result.text}
      </div>

      {/* Extracted entities inline */}
      {(hasEmails || hasUrls || hasPhones) && (
        <div className="ocr-result-entities">
          {hasEmails && (
            <div className="ocr-entity-row">
              <span className="ocr-entity-icon">📧</span>
              {result.entities.emails.map((email, i) => (
                <a key={i} href={`mailto:${email}`} className="ocr-entity-link email-link">
                  {email}
                </a>
              ))}
            </div>
          )}
          {hasUrls && (
            <div className="ocr-entity-row">
              <span className="ocr-entity-icon">🔗</span>
              {result.urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="ocr-entity-link url-link">
                  {url}
                </a>
              ))}
            </div>
          )}
          {hasPhones && (
            <div className="ocr-entity-row">
              <span className="ocr-entity-icon">📞</span>
              {result.entities.phones.map((phone, i) => (
                <a key={i} href={`tel:${phone.replace(/[\s()-]/g, '')}`} className="ocr-entity-link phone-link">
                  {phone}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
