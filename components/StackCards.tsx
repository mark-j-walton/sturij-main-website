'use client'
// §8 "One workshop. Every room." — the section header is the sticky element; cards pin 28px below it,
// stepped 18px per card with heights reduced so the bottom edges align and the pile releases together
// (recipe pile-release). Caption crossfade between cards as the hero (recipe handover), lerp-smoothed.
// The stacking swatch rail generates into the currently pinned card.
import { useEffect, useRef } from 'react'
import { Copy, type Slot } from './Copy'
import { SlotImage } from './SlotImage'
import { SwatchRail } from './configurator/SwatchRail'
import { VisualTarget } from './configurator/VisualTarget'
import { ROOMS } from '@/lib/galleries'
import type { ImageRef } from '@/lib/slots'
import { clamp01, lerpFactor, navPx, prefersReducedMotion } from './motion'

export interface StackCard { kicker: Slot; title: Slot; imageSlot: string; image: ImageRef }

export function StackCards({ kicker, title, cards }: { kicker: Slot; title: Slot; cards: StackCard[] }) {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const head = el.querySelector<HTMLElement>('.shead')
    const setSh = () => document.documentElement.style.setProperty('--sh', `${head?.offsetHeight ?? 90}px`)
    setSh()
    document.fonts?.ready.then(setSh)
    const ro = 'ResizeObserver' in window && head ? new ResizeObserver(setSh) : null
    ro?.observe(head as Element)
    addEventListener('resize', setSh)

    const nodes = [...el.querySelectorAll<HTMLElement>('.card')]
    const reduce = prefersReducedMotion(), k = lerpFactor()
    const cur = nodes.map(() => 0), targ = nodes.map(() => 0)
    const onScroll = () => {
      const nav = navPx()
      const sh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sh')) || 90
      nodes.forEach((_, i) => {
        const next = nodes[i + 1]
        if (!next) return
        const st = nav + sh + 28 + (i + 1) * 18
        const r = next.getBoundingClientRect()
        targ[i] = clamp01(1 - (r.top - st) / (innerHeight - st))
      })
    }
    let raf = 0
    const tick = () => {
      nodes.forEach((_, i) => {
        if (!nodes[i + 1]) return
        const d = (targ[i] ?? 0) - (cur[i] ?? 0)
        if (Math.abs(d) > 0.0005) cur[i] = reduce ? (targ[i] ?? 0) : (cur[i] ?? 0) + d * k
      })
      nodes.forEach((c, i) => {
        const out = nodes[i + 1] ? clamp01(1 - (cur[i] ?? 0) / 0.5) : 1
        const inn = i > 0 ? clamp01(((cur[i - 1] ?? 0) - 0.75) / 0.25) : 1
        const cc = c.querySelector<HTMLElement>('.cc')
        if (cc) cc.style.opacity = Math.min(out, inn).toFixed(4)
      })
      raf = requestAnimationFrame(tick)
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', onScroll); removeEventListener('resize', setSh); ro?.disconnect() }
  }, [])

  return (
    <section className="stackx" ref={root} data-artifact="stack-cards">
      <div className="shead reveal">
        <Copy slot={kicker} as="div" className="kicker" />
        <Copy slot={title} as="h2" />
      </div>
      <div className="sbody">
        <SwatchRail variant="stack" className="srail" id="swrail2" />
        <div className="cards">
          {cards.map((c, i) => (
            <VisualTarget key={c.imageSlot} targetKey={`card:${i}`} room={ROOMS.find((r) => r.card === i) ?? null} className="card" style={{ ['--i' as string]: i }}>
              <SlotImage id={c.imageSlot} image={c.image} fill sizes="(max-width: 1120px) 100vw, 1040px" />
              <div className="cc">
                <Copy slot={c.kicker} as="div" className="k" />
                <Copy slot={c.title} as="h3" />
              </div>
            </VisualTarget>
          ))}
        </div>
      </div>
    </section>
  )
}
