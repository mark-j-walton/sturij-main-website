'use client'
// §2 The sticky hero panel stack: four full-viewport panels. Recipes scrub-darken (the current panel darkens
// to 45% and zooms to 1.06 while the next fades in over t/.4) and handover (one opacity per caption per
// frame, the smaller of fade-out over 0→.45 and fade-in from .72). rAF-lerp smoothed at the instance's
// lerp factor; under reduced motion the target is applied directly (mapping: instant).
import { useEffect, useRef } from 'react'
import { Copy, type Slot } from './Copy'
import { SlotImage } from './SlotImage'
import type { ImageRef } from '@/lib/slots'
import { clamp01, lerpFactor, navPx, prefersReducedMotion } from './motion'

export interface Panel {
  id: string
  hero?: boolean
  kicker: Slot
  title: Slot
  body: Slot
  imageSlot: string
  image: ImageRef
}

export function PanelStack({ panels }: { panels: Panel[] }) {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const nodes = [...el.querySelectorAll<HTMLElement>('.panel')]
    const reduce = prefersReducedMotion()
    const k = lerpFactor()
    const cur = nodes.map(() => 0)
    const target = nodes.map(() => 0)
    const onScroll = () => {
      const nav = navPx()
      nodes.forEach((_, i) => {
        const next = nodes[i + 1]
        if (!next) return
        const r = next.getBoundingClientRect()
        target[i] = clamp01(1 - (r.top - nav) / (innerHeight - 2 * nav))
      })
    }
    const apply = (i: number, t: number) => {
      const p = nodes[i], next = nodes[i + 1]
      if (!p || !next) return
      p.querySelector<HTMLElement>('.img')?.style.setProperty('--ov', (t * 0.45).toFixed(4))
      const img = p.querySelector<HTMLElement>('.img img')
      if (img) img.style.transform = `scale(${1 + t * 0.06})`
      next.style.opacity = Math.min(1, t / 0.4).toFixed(4)
    }
    const applyCaps = () => {
      nodes.forEach((p, i) => {
        const fadeOut = nodes[i + 1] ? clamp01(1 - (cur[i] ?? 0) / 0.45) : 1
        const fadeIn = i > 0 ? clamp01(((cur[i - 1] ?? 0) - 0.72) / 0.28) : 1
        const cap = p.querySelector<HTMLElement>('.cap')
        if (cap) cap.style.opacity = Math.min(fadeOut, fadeIn).toFixed(4)
      })
    }
    let raf = 0
    const tick = () => {
      nodes.forEach((_, i) => {
        if (!nodes[i + 1]) return
        const d = (target[i] ?? 0) - (cur[i] ?? 0)
        if (Math.abs(d) > 0.0005) { cur[i] = reduce ? (target[i] ?? 0) : (cur[i] ?? 0) + d * k; apply(i, cur[i] ?? 0) }
      })
      applyCaps()
      raf = requestAnimationFrame(tick)
    }
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    onScroll()
    nodes.forEach((_, i) => { cur[i] = target[i] ?? 0; if (nodes[i + 1]) apply(i, cur[i] ?? 0) })
    applyCaps()
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll) }
  }, [])

  return (
    <section className="stack" ref={root} data-artifact="panel-stack">
      {panels.map((p) => (
        <article key={p.id} className={`panel${p.hero ? ' p-hero' : ''}`} data-panel={p.id}>
          <div className="img">
            <SlotImage id={p.imageSlot} image={p.image} fill priority={!!p.hero} sizes="100vw" />
          </div>
          <div className="scrim" />
          <div className="cap">
            <Copy slot={p.kicker} as="div" className="dimline reveal" />
            <Copy slot={p.title} as="h2" className="reveal" />
            <Copy slot={p.body} as="p" className="reveal" />
          </div>
        </article>
      ))}
    </section>
  )
}
