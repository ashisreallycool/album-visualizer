import { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { clientIdFromEnv, getClientId, getRedirectUri, setClientId } from '../spotify/auth'
import { connectSpotify } from '../app/boot'

export function SetupPanel({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState(getClientId())
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const first = useRef<HTMLInputElement>(null)
  const redirect = getRedirectUri()
  const fromEnv = clientIdFromEnv()

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = (): boolean => {
    const v = value.trim()
    if (!/^[a-f0-9]{32}$/i.test(v)) {
      setError('A Spotify Client ID is 32 hexadecimal characters. Copy it from the app overview in the developer dashboard.')
      return false
    }
    setError(null)
    setClientId(v)
    return true
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(redirect)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <div className="modal-head">
          <h2 id={`${id}-title`}>Connect your own Spotify app</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close setup">
            <X aria-hidden="true" />
          </button>
        </div>
        <ol className="steps">
          <li>
            Open the{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              Spotify developer dashboard <ExternalLink aria-hidden="true" width={14} height={14} />
            </a>{' '}
            and create an app (any name). Tick <strong>Web API</strong>.
          </li>
          <li>
            Add this exact redirect URI to the app:
            <div className="copy-row">
              <code>{redirect}</code>
              <button type="button" className="btn btn-sm" onClick={() => void copy()} aria-live="polite">
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="help muted">Spotify only accepts HTTPS, or http://127.0.0.1 for local development — not “localhost”.</p>
          </li>
          <li>
            While the app is in development mode, add your Spotify account under <strong>User Management</strong> (up to 25 users).
          </li>
          <li>
            Paste the app’s <strong>Client ID</strong> below. It stays in this browser.
            <div className="field">
              <label htmlFor={`${id}-client`}>Client ID</label>
              <input
                ref={first}
                id={`${id}-client`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => value && save()}
                autoComplete="off"
                spellCheck={false}
                disabled={fromEnv}
                aria-describedby={error ? `${id}-err` : `${id}-help`}
                aria-invalid={Boolean(error)}
              />
              {error ? (
                <p id={`${id}-err`} className="error" role="alert">
                  {error}
                </p>
              ) : (
                <p id={`${id}-help`} className="help">
                  {fromEnv ? 'Configured through VITE_SPOTIFY_CLIENT_ID.' : '32 characters, letters and numbers.'}
                </p>
              )}
            </div>
          </li>
        </ol>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Later
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (fromEnv || save()) void connectSpotify()
            }}
          >
            Save and connect
          </button>
        </div>
      </div>
    </div>
  )
}
