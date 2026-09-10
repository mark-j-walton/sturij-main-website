'use client'
// The finish configurator's one state (artifacts/finish-configurator.json): the roundel build, the
// session's swatches (max 4), each swatch's room finishes, the visuals generated into the page's images,
// and the modals. Every consumer — the Egger band, the two swatch rails, the feature image, the four
// stacking cards, the enquiry band — reads this context; there is no second implementation.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { ROOMS, type Room, type RoomCategory, type Tile } from '@/lib/galleries'
import { drawRoundel, type CompletePicks, type Picks } from './canvas'

export const MAX_SWATCHES = 4
export const VISUALS_KEY = 'sturij_visuals'

export type RoomPicks = Record<RoomCategory, Tile | null>
export interface Swatch { n: number; picks: CompletePicks; thumb: string; room: RoomPicks }
export interface Visual { swatch: Swatch; room: Room; src: string; spec: string; at: number }

export type TargetState = 'idle' | 'loading' | 'ready' | 'done'
export interface Target {
  key: string
  /** The room this target renders (a stacking card); null for the feature image, which asks. */
  room: Room | null
  element: () => HTMLElement | null
  run: (swatch: Swatch, room: Room) => Promise<void>
  askRoom: (swatch: Swatch) => void
}

export const emptyPicks = (): Picks => ({ doors: null, carcass: null, handle: null })
export const emptyRoom = (): RoomPicks => ({ ceiling: null, walls: null, skirting: null, flooring: null })
export const roomComplete = (r: RoomPicks) => !!(r.ceiling && r.walls && r.skirting && r.flooring)

export const finishNames = (p: CompletePicks) => [p.doors, p.carcass, p.handle].map((t) => t.name).join(' · ')
export const fullSpec = (s: Swatch) => finishNames(s.picks) + (roomComplete(s.room) ? ' · ' + (['ceiling', 'walls', 'skirting', 'flooring'] as RoomCategory[]).map((k) => s.room[k]?.name).filter(Boolean).join(' · ') : '')

interface Ctx {
  picks: Picks
  swatches: Swatch[]
  activeGallery: number
  setActiveGallery: (i: number) => void
  pick: (slot: keyof Picks, tile: Tile) => void
  newSwatch: () => void
  builderFor: Swatch | null
  openBuilder: (s: Swatch | null) => void
  setRoomPick: (n: number, cat: RoomCategory, tile: Tile | null) => void
  registerTarget: (t: Target) => () => void
  visualiseFeature: (s: Swatch) => void
  visualiseCurrentCard: (s: Swatch) => void
  lightbox: Visual | null
  openLightbox: (v: Visual | null) => void
  recordVisual: (v: Visual) => void
  visuals: Visual[]
  latestSwatch: Swatch | null
}

const ConfiguratorContext = createContext<Ctx | null>(null)

export function useConfigurator(): Ctx {
  const c = useContext(ConfiguratorContext)
  if (!c) throw new Error('useConfigurator outside ConfiguratorProvider — the configurator is one artifact; mount its consumers inside it')
  return c
}

export function ConfiguratorProvider({ children }: { children: ReactNode }) {
  const [picks, setPicks] = useState<Picks>(emptyPicks)
  const [swatches, setSwatches] = useState<Swatch[]>([])
  const [activeGallery, setActiveGallery] = useState(0)
  const [builderFor, setBuilderFor] = useState<Swatch | null>(null)
  const [lightbox, setLightbox] = useState<Visual | null>(null)
  const [visuals, setVisuals] = useState<Visual[]>([])
  const targets = useRef(new Map<string, Target>())
  const finishing = useRef(false)

  const finishSwatch = useCallback(async (p: CompletePicks) => {
    if (finishing.current) return
    finishing.current = true
    try {
      const cv = await drawRoundel(300, p)
      const thumb = cv.toDataURL('image/png')
      setSwatches((prev) => (prev.length >= MAX_SWATCHES ? prev : [...prev, { n: prev.length + 1, picks: p, thumb, room: emptyRoom() }]))
    } finally {
      finishing.current = false
    }
  }, [])

  const pick = useCallback((slot: keyof Picks, tile: Tile) => {
    setPicks((prev) => {
      if (swatches.length >= MAX_SWATCHES) return prev
      const next = { ...prev, [slot]: tile }
      if (next.doors && next.carcass && next.handle) void finishSwatch(next as CompletePicks)
      return next
    })
  }, [finishSwatch, swatches.length])

  const newSwatch = useCallback(() => {
    if (swatches.length >= MAX_SWATCHES) return
    setPicks(emptyPicks())
    setActiveGallery(0)
  }, [swatches.length])

  const setRoomPick = useCallback((n: number, cat: RoomCategory, tile: Tile | null) => {
    setSwatches((prev) => prev.map((s) => (s.n === n ? { ...s, room: { ...s.room, [cat]: tile } } : s)))
    setBuilderFor((b) => (b && b.n === n ? { ...b, room: { ...b.room, [cat]: tile } } : b))
  }, [])

  const registerTarget = useCallback((t: Target) => {
    targets.current.set(t.key, t)
    return () => { targets.current.delete(t.key) }
  }, [])

  const visualiseFeature = useCallback((s: Swatch) => {
    const t = targets.current.get('feature')
    if (!t) return
    setBuilderFor(null)
    t.askRoom(s)
  }, [])

  /** The stacking rail: generate into the card currently pinned, using its mapped room (README §8). */
  const visualiseCurrentCard = useCallback((s: Swatch) => {
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav')) || 66
    const sh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sh')) || 90
    let idx = 0
    ROOMS.forEach((room) => {
      const t = targets.current.get(`card:${room.card}`)
      const el = t?.element()
      if (el && el.getBoundingClientRect().top <= nav + sh + 28 + room.card * 18 + 14) idx = room.card
    })
    const room = ROOMS.find((r) => r.card === idx)
    const target = targets.current.get(`card:${idx}`)
    if (room && target) void target.run(s, room)
  }, [])

  const recordVisual = useCallback((v: Visual) => {
    setVisuals((prev) => [...prev, v])
    try {
      const arr = JSON.parse(localStorage.getItem(VISUALS_KEY) || '[]') as unknown[]
      arr.push({ room: v.room.label, finishes: v.spec, ts: v.at, label: 'visualisation' })
      localStorage.setItem(VISUALS_KEY, JSON.stringify(arr))
    } catch { /* the browser's storage is a convenience; nothing depends on it */ }
  }, [])

  const value = useMemo<Ctx>(() => ({
    picks, swatches, activeGallery, setActiveGallery, pick, newSwatch,
    builderFor, openBuilder: setBuilderFor, setRoomPick, registerTarget,
    visualiseFeature, visualiseCurrentCard, lightbox, openLightbox: setLightbox, recordVisual, visuals,
    latestSwatch: swatches[swatches.length - 1] ?? null,
  }), [picks, swatches, activeGallery, pick, newSwatch, builderFor, setRoomPick, registerTarget, visualiseFeature, visualiseCurrentCard, lightbox, recordVisual, visuals])

  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>
}
