import { useEffect } from 'react'
import { useApp } from './store'
import { boot } from './app/boot'
import { Landing } from './ui/Landing'
import { Loading } from './ui/Loading'
import { ErrorView } from './ui/ErrorView'
import { Stage } from './ui/Stage'
import { Toasts } from './ui/Toasts'

export function App() {
  const phase = useApp((s) => s.phase)
  const setReducedMotion = useApp((s) => s.setReducedMotion)

  useEffect(() => {
    void boot()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setReducedMotion])

  return (
    <>
      {phase === 'landing' && <Landing />}
      {phase === 'authorizing' && <Loading title="Heading to Spotify" />}
      {phase === 'loading' && <Loading title="Pressing your album" />}
      {phase === 'error' && <ErrorView />}
      {phase === 'stage' && <Stage />}
      <Toasts />
    </>
  )
}
