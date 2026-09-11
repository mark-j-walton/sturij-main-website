'use client'
// §6 The per-image visualiser state machine: idle → loading (blurred under the gold spinner) → ready (the
// visual arrives blurred with the View pill) → done (revealed, labelled VISUALISATION, zoomable into the
// lightbox). The render is a server call (/api/render) — the key never reaches the browser.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { ROOMS, type Room } from '@/lib/galleries'
import { tileTexture } from './canvas'
import { fullSpec, useConfigurator, type Swatch, type TargetState, type Visual } from './ConfiguratorProvider'

export const VISUALISATION_LABEL = 'Visualisation · generated image'

export const RENDER_MESSAGES: Record<string, string> = {
  E_NOT_CONFIGURED: 'Visualising is not switched on for this preview yet',
  E_RATE_LIMIT: 'You have made a few visuals already — wait a moment and try again',
  E_NO_IMAGE: 'No image came back — try again',
  E_UPSTREAM: 'Generation failed — try again',
  E_BAD_REQUEST: 'That swatch could not be sent — try again',
}

export type RenderReply = { ok: true; image: string; label: string; model: string } | { ok: false; code: string; message?: string }

export async function requestRender(swatch: Swatch, room: Room, base: string | null = null, fetchFn: typeof fetch = fetch): Promise<RenderReply> {
  const textures = await Promise.all([swatch.picks.doors, swatch.picks.carcass, swatch.picks.handle].map(tileTexture))
  const body = {
    room: room.label,
    picks: { doors: swatch.picks.doors.name, carcass: swatch.picks.carcass.name, handle: swatch.picks.handle.name },
    codes: { doors: swatch.picks.doors.code ?? null, carcass: swatch.picks.carcass.code ?? null },
    roomFinishes: Object.fromEntries(Object.entries(swatch.room).map(([k, t]) => [k, t?.name ?? null])),
    textures,
    // the remix: the block's own image is the base — the room, camera and layout kept, the furniture re-finished
    base: base ?? null,
  }
  const res = await fetchFn('/api/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => null)) as RenderReply | null
  if (!json) return { ok: false, code: 'E_UPSTREAM' }
  return json
}

export function VisualTarget({ targetKey, room, as, className, style, children, roomPickerIn, base }: { targetKey: string; room: Room | null; as?: ElementType; className?: string; style?: CSSProperties; children: ReactNode; roomPickerIn?: boolean; /** The block's own image, for the remix. */ base?: string | null }) {
  const Tag = (as ?? 'div') as ElementType
  const { registerTarget, openLightbox, recordVisual } = useConfigurator()
  const el = useRef<HTMLElement>(null)
  const [state, setState] = useState<TargetState>('idle')
  const [visual, setVisual] = useState<Visual | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [asking, setAsking] = useState<Swatch | null>(null)
  const [pickedRoom, setPickedRoom] = useState<number>(-1)

  const run = useCallback(async (swatch: Swatch, r: Room) => {
    if (state === 'loading') return
    setMessage(null)
    setState('loading')
    const reply = await requestRender(swatch, r, base ?? null)
    if (!reply.ok) {
      setState(visual ? 'done' : 'idle')
      setMessage(RENDER_MESSAGES[reply.code] ?? RENDER_MESSAGES.E_UPSTREAM!)
      setTimeout(() => setMessage(null), 3400)
      return
    }
    await new Promise<void>((res) => { const i = new Image(); i.onload = () => res(); i.onerror = () => res(); i.src = reply.image })
    const v: Visual = { swatch, room: r, src: reply.image, spec: fullSpec(swatch), at: Date.now() }
    setVisual(v)
    recordVisual(v)
    setState('ready')
  }, [state, visual, recordVisual, base])

  const askRoom = useCallback((swatch: Swatch) => { if (state !== 'loading') { setAsking(swatch); setPickedRoom(-1) } }, [state])

  useEffect(() => registerTarget({ key: targetKey, room, element: () => el.current, run, askRoom }), [registerTarget, targetKey, room, run, askRoom])

  const chooseRoom = (i: number) => {
    const swatch = asking
    const r = ROOMS[i]
    if (!swatch || !r) return
    setPickedRoom(i)
    setTimeout(() => { setAsking(null); void run(swatch, r) }, 420)
  }

  const blurred = state === 'loading' || state === 'ready'
  return (
    <Tag ref={el} className={`${className ?? ''} vtarget${blurred ? ' is-blurred' : ''}${state === 'done' ? ' is-done' : ''}`.trim()} style={style} data-vstate={state} data-target={targetKey}>
      {children}
      {visual && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`gen vimgfx${state === 'done' ? ' zoomable' : ''}`} src={visual.src} alt={`${VISUALISATION_LABEL}: ${visual.room.label} — ${visual.spec}`} onClick={state === 'done' ? () => openLightbox(visual) : undefined} />
      )}
      {state === 'done' && <span className="vis-badge">{VISUALISATION_LABEL}</span>}
      {state === 'loading' && <div className="vloader" aria-live="polite"><div className="vring" /><div className="vt">Visualising…</div></div>}
      {state === 'ready' && <button type="button" className="vview" onClick={() => setState('done')}>View</button>}
      {message && <div className="vloader" role="status"><div className="vt msg">{message}</div></div>}
      {asking && (roomPickerIn ?? true) && (
        <div className="roomsel" onClick={(e) => { if (e.target === e.currentTarget) setAsking(null) }}>
          <div className="rst">Choose a room</div>
          <div className="galtabs" role="tablist" aria-label="Room">
            <span className="thumb" style={pickedRoom >= 0 ? { left: `${5 + pickedRoom * 0}px` } : undefined} />
            {ROOMS.map((r, i) => <button key={r.id} type="button" className={pickedRoom === i ? 'on' : undefined} onClick={() => chooseRoom(i)}>{r.label}</button>)}
          </div>
        </div>
      )}
    </Tag>
  )
}
