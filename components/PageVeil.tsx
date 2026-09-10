'use client'
// §1 The load veil: charcoal overlay with the logo and the gold ring; scroll locked until the hero image
// decodes; hard cap 2.5 s; 0.5 s fade-out.
import { useEffect, useRef } from 'react'

export const VEIL_CAP_MS = 2500

export function PageVeil({ logo }: { logo: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const veil = ref.current
    if (!veil) return
    document.documentElement.style.overflow = 'hidden'
    let done = false
    const release = () => {
      if (done) return
      done = true
      veil.classList.add('off')
      document.documentElement.style.overflow = ''
      setTimeout(() => veil.remove(), 600)
    }
    const hero = document.querySelector<HTMLImageElement>('.p-hero .img img')
    if (hero?.decode) hero.decode().then(release, release)
    else if (hero?.complete) release()
    else if (hero) { hero.addEventListener('load', release); hero.addEventListener('error', release) }
    const cap = setTimeout(release, VEIL_CAP_MS)
    return () => { clearTimeout(cap); document.documentElement.style.overflow = '' }
  }, [])
  return (
    <div className="pageveil" id="pageveil" ref={ref} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" />
      <div className="vring" />
    </div>
  )
}
