import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useApp } from '../store'

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info
        return (
          <div key={t.id} className={`toast card toast-${t.tone ?? 'info'}`}>
            <Icon aria-hidden="true" />
            <span>{t.text}</span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
