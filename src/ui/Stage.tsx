import { useEffect, useMemo } from 'react'
import { useApp } from '../store'
import { assetsRef } from '../textures/assets'
import { Scene } from '../three/Scene'
import { Hud } from './Hud'
import { InspectPanel } from './InspectPanel'
import { StatsPanel } from './StatsPanel'
import { ShareModal } from './ShareModal'
import { Polaroids } from './Polaroids'
import { buildSteps } from './guide'

export function Stage() {
  const profile = useApp((s) => s.profile)
  const inspect = useApp((s) => s.inspect)
  const statsOpen = useApp((s) => s.statsOpen)
  const shareOpen = useApp((s) => s.shareOpen)
  const setInspect = useApp((s) => s.setInspect)
  const setStatsOpen = useApp((s) => s.setStatsOpen)
  const setShareOpen = useApp((s) => s.setShareOpen)
  const assets = assetsRef.current

  const steps = useMemo(() => (profile ? buildSteps(profile, () => setShareOpen(true)) : []), [profile, setShareOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (shareOpen) setShareOpen(false)
      else if (inspect) setInspect(null)
      else if (statsOpen) setStatsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inspect, statsOpen, shareOpen, setInspect, setStatsOpen, setShareOpen])

  useEffect(() => {
    document.documentElement.style.setProperty('--stage', assets?.theme.colors.stage ?? '')
    return () => {
      document.documentElement.style.removeProperty('--stage')
    }
  }, [assets])

  if (!profile || !assets) return null

  return (
    <div className="stage">
      <div
        className="stage-canvas"
        role="application"
        aria-label="Interactive 3D album. Every gesture has a button in the guide below, and the stats panel lists everything printed on the album."
      >
        <Scene assets={assets} />
      </div>
      <Hud steps={steps} assets={assets} />
      <Polaroids assets={assets} />
      {inspect && <InspectPanel id={inspect} assets={assets} onClose={() => setInspect(null)} />}
      {statsOpen && <StatsPanel assets={assets} onClose={() => setStatsOpen(false)} />}
      {shareOpen && <ShareModal assets={assets} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
