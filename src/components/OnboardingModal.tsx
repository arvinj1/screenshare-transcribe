const ONBOARDING_KEY = 'screenshare-transcribe-onboarded-v1'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  } catch {
    return true // if storage unavailable, skip modal
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true')
  } catch {
    // ignore
  }
}

interface OnboardingModalProps {
  onClose: () => void
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const handleClose = () => {
    markOnboardingSeen()
    onClose()
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2>👋 Welcome to ScreenShare Transcribe</h2>
        </div>

        <div className="onboarding-body">
          <div className="onboarding-section privacy-section">
            <h3>🔒 Your Privacy</h3>
            <ul>
              <li>✅ <strong>All processing is local</strong> — nothing leaves your device</li>
              <li>✅ <strong>No uploads</strong> — OCR runs entirely in your browser</li>
              <li>✅ <strong>Browser-native capture</strong> — you control what is shared via the system dialog</li>
              <li>✅ <strong>Sessions are stored locally</strong> in your browser's IndexedDB</li>
            </ul>
          </div>

          <div className="onboarding-section">
            <h3>🚀 What It Does</h3>
            <ul>
              <li>Captures your screen every few seconds and extracts text with OCR</li>
              <li>Groups captures into slides, extracts entities, URLs, and key points</li>
              <li>Generates a searchable session summary when you stop sharing</li>
              <li>Saves all sessions locally so you can search your visual memory later</li>
            </ul>
          </div>

          <div className="onboarding-section">
            <h3>💡 Tips for Better Results</h3>
            <ul>
              <li>Share a single <strong>window or tab</strong> rather than the whole monitor if possible</li>
              <li>Use <strong>larger fonts</strong> and high-contrast themes in the content you're capturing</li>
              <li>Avoid very fast scrolling - OCR captures at regular intervals</li>
              <li>OCR works best with printed text; handwriting or stylized fonts may be imperfect</li>
            </ul>
          </div>

          <div className="onboarding-section onboarding-note">
            <p>
              ⚠️ <strong>OCR accuracy may vary</strong> depending on resolution, font size, and screen contrast.
              Review the confidence scores in the results to identify captures that may need attention.
            </p>
          </div>
        </div>

        <div className="onboarding-footer">
          <button className="btn btn-start" onClick={handleClose}>
            Got it — Start Capturing
          </button>
        </div>
      </div>
    </div>
  )
}
