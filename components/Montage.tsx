'use client'
// §9 The scroll-built montage: a 9×6 mosaic whose tiles reveal their slice of the photograph in a random
// order proportional to progress through a 240vh track (recipe montage-reveal; reduced → instant).
// The tints and the order are randomised per visit, so the tiles are built after mount (never on the server).
import { useEffect, useRef } from 'react'
import { Copy, type Slot } from './Copy'
import type { ImageRef } from '@/lib/slots'

export const MONTAGE_COLS = 9
export const MONTAGE_ROWS = 6

export function Montage({ label, image, imageSlot }: { label: Slot; image: ImageRef; imageSlot: string }) {
  const mosaic = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const m = mosaic.current, t = track.current
    if (!m || !t) return
    m.replaceChildren()
    const tiles: HTMLDivElement[] = []
    for (let r = 0; r < MONTAGE_ROWS; r++) for (let c = 0; c < MONTAGE_COLS; c++) {
      const d = document.createElement('div')
      d.className = 'mt'
      d.style.setProperty('--tint', (0.03 + Math.random() * 0.2).toFixed(3))
      d.style.setProperty('--pos', `${(c / (MONTAGE_COLS - 1)) * 100}% ${(r / (MONTAGE_ROWS - 1)) * 100}%`)
      m.appendChild(d)
      tiles.push(d)
    }
    const order = tiles.map((_, i) => i).sort(() => Math.random() - 0.5)
    const onScroll = () => {
      const r = t.getBoundingClientRect()
      const total = r.height - innerHeight
      const p = Math.min(1, Math.max(0, -r.top / total))
      const n = Math.round(p * tiles.length)
      order.forEach((idx, i) => tiles[idx]?.classList.toggle('on', i < n))
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => removeEventListener('scroll', onScroll)
  }, [])
  return (
    <section className="montage" data-artifact="montage">
      <div className="track" ref={track}>
        <div className="stage">
          <Copy slot={label} as="div" className="mlabel reveal" />
          <div
            className="mosaic"
            id="mosaic"
            ref={mosaic}
            role="img"
            aria-label={image.alt}
            data-image-slot={imageSlot}
            data-slot-kind="background"
            data-native={`${image.width}×${image.height}`}
            style={{ ['--cols' as string]: MONTAGE_COLS, ['--rows' as string]: MONTAGE_ROWS, ['--img' as string]: `url("${image.src}")` }}
          />
        </div>
      </div>
    </section>
  )
}
