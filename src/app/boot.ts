import { analyze, applyHistory } from '../analysis/analyze'
import { parseHistoryFiles } from '../analysis/streamingHistory'
import { DEMO_PERSONAS, buildDemoData } from '../data/demo'
import { useApp } from '../store'
import { AuthError, beginLogin, completeLogin, getClientId, getValidAccessToken, isAuthRedirect, logout } from '../spotify/auth'
import { fetchListeningData, SpotifyApiError } from '../spotify/api'
import { assetsRef, buildAlbumAssets, disposeAssets } from '../textures/assets'
import { paintListenerCard } from '../textures/inserts'
import { paintBack, paintSleeve } from '../textures/parts'
import { seededRng } from '../lib/rng'
import type { RawListeningData } from '../spotify/types'

const s = () => useApp.getState()

async function pressAlbum(data: RawListeningData): Promise<void> {
  const profile = analyze(data)
  s().setProfile(profile)
  disposeAssets(assetsRef.current)
  assetsRef.current = await buildAlbumAssets(profile, (label) => s().pushProgress(label))
  s().resetUnbox()
  s().setPhase('stage')
}

export async function startDemo(personaId?: string): Promise<void> {
  const persona = DEMO_PERSONAS.find((p) => p.id === personaId) ?? DEMO_PERSONAS[Math.floor(Math.random() * DEMO_PERSONAS.length)]
  s().setDemoPersona(persona.id)
  useApp.setState({ progress: [] })
  s().setPhase('loading')
  try {
    s().pushProgress(`Reading ${persona.userName}'s listening history`)
    await pressAlbum(buildDemoData(persona))
  } catch (err) {
    s().setPhase('error', err instanceof Error ? err.message : 'Something went wrong while pressing the demo album.')
  }
}

export async function connectSpotify(): Promise<void> {
  const clientId = getClientId()
  if (!clientId) {
    s().setSetupOpen(true)
    s().toast('Add your Spotify Client ID in setup first.')
    return
  }
  try {
    s().setPhase('authorizing')
    await beginLogin(clientId)
  } catch (err) {
    s().setPhase('error', err instanceof Error ? err.message : 'Could not start the Spotify sign-in.')
  }
}

async function loadFromSpotify(token: string): Promise<void> {
  useApp.setState({ progress: [] })
  s().setPhase('loading')
  const data = await fetchListeningData(token, (label) => s().pushProgress(label))
  await pressAlbum(data)
}

/** Runs once on page load: finishes a redirect, or resumes a stored session. */
export async function boot(): Promise<void> {
  const clientId = getClientId()
  if (isAuthRedirect()) {
    try {
      s().setPhase('loading')
      s().pushProgress('Finishing Spotify sign-in')
      const tokens = await completeLogin(clientId)
      await loadFromSpotify(tokens.accessToken)
    } catch (err) {
      handleError(err)
    }
    return
  }
  if (!clientId) return
  const token = await getValidAccessToken(clientId)
  if (!token) return
  try {
    await loadFromSpotify(token)
  } catch (err) {
    handleError(err)
  }
}

function handleError(err: unknown): void {
  if (err instanceof AuthError && err.code === 'expired') {
    logout()
    s().setPhase('landing')
    s().toast('Your Spotify session expired — connect again.')
    return
  }
  if (err instanceof SpotifyApiError && err.status === 401) {
    logout()
    s().setPhase('landing')
    s().toast('Your Spotify session expired — connect again.')
    return
  }
  s().setPhase('error', err instanceof Error ? err.message : 'Something went wrong.')
}

export function disconnect(): void {
  logout()
  disposeAssets(assetsRef.current)
  assetsRef.current = null
  s().setProfile(null)
  s().resetUnbox()
  s().setPhase('landing')
}

export function restartUnboxing(): void {
  s().resetUnbox()
  s().toast('Re-wrapped. Unbox it again.')
}

export async function importHistory(files: File[]): Promise<void> {
  const profile = s().profile
  if (!profile) return
  try {
    const history = await parseHistoryFiles(files)
    const updated = applyHistory(profile, history)
    s().setProfile(updated)
    s().toast(`Imported ${history.plays.toLocaleString()} plays — minutes are now exact.`, 'success')
    // Repaint the inserts that quote minutes.
    const assets = assetsRef.current
    if (assets) {
      const rng = seededRng(`${updated.user.id}:${updated.theme}`)
      assets.profile = updated
      assets.listenerCard.image = paintListenerCard({ theme: assets.theme, profile: updated, rng, images: assets.images, albumArt: assets.albumArt })
      assets.listenerCard.needsUpdate = true
      assets.back.image = paintBack({ theme: assets.theme, profile: updated, rng })
      assets.back.needsUpdate = true
      assets.sleeve.image = paintSleeve({ theme: assets.theme, profile: updated, rng }).color
      assets.sleeve.needsUpdate = true
    }
  } catch (err) {
    s().toast(err instanceof Error ? err.message : 'Could not read those files.', 'error')
  }
}

export { DEMO_PERSONAS }
