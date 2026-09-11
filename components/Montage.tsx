'use client'
// §9 The scroll-built montage: a mosaic whose tiles reveal their slice of the image underneath in a random
// order proportional to progress through a 240vh track (recipe montage-reveal; reduced → instant). The tints
// and the order are randomised per visit, so the tiles are built after mount (never on the server).
// Underneath is one of the montage's image slots — the suppliers' montages — chosen at random per visit; when
// the visitor scrolls back above the montage and every tile has closed, the next takes its place unseen, so
// the next reveal shows a different image (Mark, 11 Sep 2026). Six rows; the columns follow the image's
// aspect so the tiles stay square. The tiles paint a rendition, never the master.
import { getImageProps } from 'next/image'
import { useEffect, useRef } from 'react'
import { Copy, type Slot } from './Copy'
import type { ImageRef } from '@/lib/slots'

export const MONTAGE_ROWS = 6
/** Columns for an image: six rows, the tiles square (a 2:1 montage → 12; a 7:5 photograph → 8). */
export const montageCols = (image: { width: number; height: number }) => Math.max(4, Math.round(MONTAGE_ROWS * (image.width / image.height)))
/** How far the reveal must have gone before a return to the top swaps the image underneath. */
export const SWAP_AFTER = 1 / 3

export interface MontageImage { slot: string; image: ImageRef }

/** The rendition the tiles paint: the optimiser's largest candidate up to 2048px wide, never the master. */
export function montageRendition(image: ImageRef): string {
  const { props } = getImageProps({ src: image.src, alt: '', width: image.width, height: image.height, quality: 78, sizes: '100vw' })
  const candidates = (props.srcSet ?? '')
    .split(',')
    .map((c) => c.trim().split(' '))
    .filter((c) => c.length === 2)
    .map(([u, w]) => ({ u: u!, w: parseInt(w!, 10) }))
    .filter((c) => c.w <= 2048)
  return candidates.length ? candidates[candidates.length - 1]!.u : props.src
}

export function Montage({ label, images }: { label: Slot; images: MontageImage[] }) {
  const mosaic = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const list = useRef(images)
  list.current = images
  const key = images.map((i) => `${i.slot}:${i.image.src}`).join('|')
  const first = images[0]!

  useEffect(() => {
    const m = mosaic.current, t = track.current
    const imgs = list.current
    if (!m || !t || imgs.length === 0) return
    // this visit's sequence: a random start, then round-robin
    const seq = imgs.map((_, i) => i).sort(() => Math.random() - 0.5)
    let k = 0
    let tiles: HTMLDivElement[] = []
    let order: number[] = []
    let revealed = false
    const apply = (i: number) => {
      const { slot, image } = imgs[i]!
      const cols = montageCols(image)
      m.style.setProperty('--cols', String(cols))
      m.style.setProperty('--rows', String(MONTAGE_ROWS))
      m.style.setProperty('--ar', (image.width / image.height).toFixed(4))
      m.style.setProperty('--img', `url("${montageRendition(image)}")`)
      m.setAttribute('aria-label', image.alt)
      m.setAttribute('data-image-slot', slot)
      m.setAttribute('data-native', `${image.width}×${image.height}`)
      m.setAttribute('data-image-index', String(i))
      m.replaceChildren()
      tiles = []
      for (let r = 0; r < MONTAGE_ROWS; r++) for (let c = 0; c < cols; c++) {
        const d = document.createElement('div')
        d.className = 'mt'
        d.style.setProperty('--tint', (0.03 + Math.random() * 0.2).toFixed(3))
        d.style.setProperty('--pos', `${(c / (cols - 1)) * 100}% ${(r / (MONTAGE_ROWS - 1)) * 100}%`)
        m.appendChild(d)
        tiles.push(d)
      }
      order = tiles.map((_, j) => j).sort(() => Math.random() - 0.5)
    }
    apply(seq[0]!)
    let preloaded = false
    const onScroll = () => {
      const r = t.getBoundingClientRect()
      if (!preloaded && r.top < innerHeight * 2) {
        // the montage is near: the other images decode in the background, so a swap costs nothing when it comes
        preloaded = true
        imgs.forEach((im, i) => { if (i !== seq[0]) { const pre = new Image(); pre.src = montageRendition(im.image) } })
      }
      const total = r.height - innerHeight
      const p = Math.min(1, Math.max(0, -r.top / total))
      const n = Math.round(p * tiles.length)
      if (n >= tiles.length * SWAP_AFTER) revealed = true
      if (n === 0 && revealed && imgs.length > 1) {
        // back above the montage with every tile closed: the next image goes underneath, unseen
        revealed = false
        k = (k + 1) % seq.length
        apply(seq[k]!)
        return
      }
      order.forEach((idx, i) => tiles[idx]?.classList.toggle('on', i < n))
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => removeEventListener('scroll', onScroll)
  }, [key])

  return (
    <section className="montage" data-artifact="montage" data-images={images.length}>
      <div className="track" ref={track}>
        <div className="stage">
          <Copy slot={label} as="div" className="mlabel reveal" />
          <div
            className="mosaic"
            id="mosaic"
            ref={mosaic}
            role="img"
            aria-label={first.image.alt}
            data-image-slot={first.slot}
            data-slot-kind="background"
            data-native={`${first.image.width}×${first.image.height}`}
            style={{ ['--cols' as string]: montageCols(first.image), ['--rows' as string]: MONTAGE_ROWS, ['--ar' as string]: (first.image.width / first.image.height).toFixed(4), ['--img' as string]: `url("${montageRendition(first.image)}")` }}
          />
        </div>
      </div>
    </section>
  )
}
