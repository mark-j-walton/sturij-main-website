'use client'
// Reduced motion is a licensed variation (S9): the page reads the preference once and applies each
// recipe's declared mapping — the CSS half in site.css, the script half here (lerp → instant).
import { useEffect, useState } from 'react'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/** The instance's lerp factor (motion.lerp), read from the token so the value lives in one place. */
export function lerpFactor(): number {
  if (typeof document === 'undefined') return 0.1
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-lerp'))
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.1
}

export function navPx(): number {
  if (typeof document === 'undefined') return 66
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav')) || 66
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
