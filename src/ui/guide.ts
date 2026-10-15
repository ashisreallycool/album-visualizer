import type { ListeningProfile } from '../analysis/types'
import type { Focus, UnboxState } from '../store'
import { nextPage, openLid, peelSticker, pullCard, slideDisc, stickDefault, takeBook, tearWrap, useAddIn } from '../app/actions'

export interface Step {
  id: string
  title: string
  hint: string
  action: string
  focus: Focus
  run: () => void
  done: (u: UnboxState) => boolean
  progress?: (u: UnboxState) => string | undefined
}

const ADD_IN_STEP: Record<ListeningProfile['addIn'], { title: string; hint: string; action: string }> = {
  'cd-player': { title: 'Load the CD player', hint: 'Tap the player to drop the disc in and press play.', action: 'Press play' },
  digicam: { title: 'Take a photo on the digicam', hint: 'Tap the camera — the flash prints a concept photo.', action: 'Take a photo' },
  keychain: { title: 'Check your passport keychain', hint: 'Tap the luggage tag to see your genre visas.', action: 'Flip the tag' },
}

export function buildSteps(profile: ListeningProfile, openShare: () => void): Step[] {
  const addIn = ADD_IN_STEP[profile.addIn]
  return [
    {
      id: 'peel',
      title: 'Peel the hype sticker',
      hint: 'Drag the sticker on the wrap to curl it off. Keep it — it can go anywhere later.',
      action: 'Peel it',
      focus: 'lid',
      run: peelSticker,
      done: (u) => u.stickerPeeled,
    },
    {
      id: 'tear',
      title: 'Tear the shrink wrap',
      hint: 'Drag across the plastic on top of the box until it rips.',
      action: 'Tear it open',
      focus: 'lid',
      run: tearWrap,
      done: (u) => u.wrapTorn,
    },
    {
      id: 'lid',
      title: 'Lift the lid',
      hint: 'Drag the lid upward, or tap it.',
      action: 'Open the lid',
      focus: 'lid',
      run: openLid,
      done: (u) => u.lidOpen,
    },
    {
      id: 'book',
      title: 'Take out the photobook',
      hint: 'Tap the photobook to lift it out. Tap pages to flip through your concept photos and stats.',
      action: 'Lift it out',
      focus: 'inside',
      run: takeBook,
      done: (u) => u.bookOut,
    },
    {
      id: 'pages',
      title: 'Flip through the photobook',
      hint: 'Tap the right page to go forward, the left page to go back.',
      action: 'Next page',
      focus: 'book',
      run: nextPage,
      done: (u) => u.page >= 2,
      progress: (u) => `page ${u.page + 1} / 5`,
    },
    {
      id: 'cards',
      title: 'Pull your photocards',
      hint: 'Drag the top card out of the frosted sleeve. Five pulls — the first is the holo.',
      action: 'Pull a card',
      focus: 'inside',
      run: pullCard,
      done: (u) => u.cardsPulled >= 5,
      progress: (u) => `${u.cardsPulled} / 5 pulled`,
    },
    {
      id: 'disc',
      title: 'Slide out the disc',
      hint: 'Drag the disc forward out of its paper sleeve.',
      action: 'Slide it out',
      focus: 'inside',
      run: slideDisc,
      done: (u) => u.discOut,
    },
    {
      id: 'addin',
      title: addIn.title,
      hint: addIn.hint,
      action: addIn.action,
      focus: 'addin',
      run: useAddIn,
      done: (u) => u.addInUsed,
    },
    {
      id: 'stickers',
      title: 'Decorate with stickers',
      hint: 'Drag a badge off the sheet and drop it on the box, the player or the photobook.',
      action: 'Stick one on the cover',
      focus: 'stickers',
      run: () => stickDefault(),
      done: (u) => u.stickersPlaced.length > 0,
      progress: (u) => (u.stickersPlaced.length ? `${u.stickersPlaced.length} placed` : undefined),
    },
    {
      id: 'share',
      title: 'Share your album',
      hint: 'Export a story, post or portrait card.',
      action: 'Share',
      focus: 'overview',
      run: openShare,
      done: (u) => u.shared,
    },
  ]
}
