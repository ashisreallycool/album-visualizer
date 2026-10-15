import { Check, Loader2 } from 'lucide-react'
import { useApp } from '../store'

export function Loading({ title }: { title: string }) {
  const progress = useApp((s) => s.progress)
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading-card card">
        <div className="loading-art" aria-hidden="true">
          <div className="skeleton-box" />
          <div className="skeleton-disc" />
        </div>
        <h1>{title}</h1>
        <ol className="progress-list">
          {progress.map((label, i) => {
            const current = i === progress.length - 1
            return (
              <li key={`${label}-${i}`} className={current ? 'current' : 'done'}>
                {current ? <Loader2 className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                <span>{label}</span>
                {current && <span className="visually-hidden"> (in progress)</span>}
              </li>
            )
          })}
          {progress.length === 0 && (
            <li className="current">
              <Loader2 className="spin" aria-hidden="true" />
              <span>Starting</span>
            </li>
          )}
        </ol>
      </div>
    </div>
  )
}
