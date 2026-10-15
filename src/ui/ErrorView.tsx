import { AlertTriangle } from 'lucide-react'
import { useApp } from '../store'
import { startDemo } from '../app/boot'

export function ErrorView() {
  const error = useApp((s) => s.error)
  const setPhase = useApp((s) => s.setPhase)
  const setSetupOpen = useApp((s) => s.setSetupOpen)
  return (
    <div className="loading">
      <div className="loading-card card" role="alert">
        <AlertTriangle aria-hidden="true" className="error-icon" />
        <h1>That did not press right</h1>
        <p>{error ?? 'Something went wrong.'}</p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={() => setPhase('landing')}>
            Back to start
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPhase('landing')
              setSetupOpen(true)
            }}
          >
            Check setup
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void startDemo()}>
            Use the demo instead
          </button>
        </div>
      </div>
    </div>
  )
}
