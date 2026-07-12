const ONBOARDING_KEY = 'st-onboarding-dismissed'

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) !== 'true'
  } catch {
    return false
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true')
  } catch {
    // Storage unavailable — modal will show again next visit
  }
}

interface OnboardingModalProps {
  onDismiss: () => void
}

export function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  return (
    <div className="summary-overlay">
      <div className="summary-modal onboarding-modal">
        <div className="summary-header">
          <h2>Welcome to Screen Share Transcribe</h2>
        </div>
        <div className="summary-content">
          <ul className="onboarding-list">
            <li><strong>Capture is local.</strong> Screen frames and OCR are processed entirely in your browser — no video or images are ever uploaded.</li>
            <li><strong>You control capture.</strong> Sharing starts only when you approve the browser prompt, and you can stop it at any time.</li>
            <li><strong>Speech transcription</strong> uses your browser's built-in speech recognition (best in Chrome or Edge) with your permission.</li>
            <li><strong>AI summaries (optional).</strong> When enabled, the captured <em>text</em> is sent to the Claude API once per session to produce an accurate summary. Turn it off in the header for a fully local, rule-based summary.</li>
            <li><strong>Sessions save to this browser</strong> (IndexedDB) — search, reopen, and export them from History.</li>
          </ul>
          <div className="onboarding-tips">
            <h3>Tips for good results</h3>
            <ul>
              <li>Share the window or screen showing the presentation at full size — bigger text OCRs better.</li>
              <li>Speak clearly near your microphone; the transcript aligns with slides by time.</li>
              <li>OCR is imperfect on dense or low-contrast slides; the summary compensates for noise.</li>
            </ul>
          </div>
          <div className="summary-header-actions onboarding-actions">
            <button className="btn btn-start" onClick={onDismiss}>Got it</button>
          </div>
        </div>
      </div>
    </div>
  )
}
