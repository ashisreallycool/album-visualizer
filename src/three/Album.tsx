import type { AlbumAssets } from '../textures/assets'
import { BoxBase } from './BoxBase'
import { Lid } from './Lid'
import { ShrinkWrap } from './ShrinkWrap'
import { Photobook } from './Photobook'
import { Photocards } from './Photocards'
import { Disc } from './Disc'
import { AddIn } from './AddIn'
import { StickerSheet } from './StickerSheet'
import { PlacedStickers } from './PlacedStickers'
import { ListenerCard } from './ListenerCard'

export function Album({ assets, teaser }: { assets: AlbumAssets; teaser: boolean }) {
  return (
    <group>
      <BoxBase assets={assets} />
      <Lid assets={assets} interactive={!teaser} />
      {!teaser && (
        <>
          <StickerSheet assets={assets} />
          <ListenerCard assets={assets} />
          <Disc assets={assets} />
          <Photocards assets={assets} />
          <AddIn assets={assets} />
          <Photobook assets={assets} />
          <PlacedStickers assets={assets} />
        </>
      )}
      <ShrinkWrap assets={assets} interactive={!teaser} />
    </group>
  )
}
