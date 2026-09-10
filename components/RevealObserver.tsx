'use client'
// Recipe reveal-on-scroll: elements marked .reveal / .reveal-l / .reveal-r arrive when scrolled into view
// (IntersectionObserver at .18, as the handoff). Under reduced motion the CSS shows them at rest.
import { useEffect } from 'react'

export function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-l, .reveal-r')
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) }
    }, { threshold: 0.18 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}
