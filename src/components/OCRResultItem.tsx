import type { OCRResult } from '../types'

interface OCRResultItemProps {
  result: OCRResult
}

export function OCRResultItem({ result }: OCRResultItemProps) {
  const confidenceColor = result.confidence >= 80
    ? 'confidence-high'
    : result.confidence >= 50
      ? 'confidence-medium'
      : 'confidence-low'

  return (
    <div className="ocr-result-item">
      <div className="ocr-result-header">
        <span className="slide-badge">Slide {result.slideNumber}</span>
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
      <div className="ocr-result-text">{result.text}</div>
      {result.urls.length > 0 && (
        <div className="ocr-result-urls">
          {result.urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="url-link">
              {url}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
