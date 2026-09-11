'use client'
// §3–§5 The finish configurator: the roundel with its three facets and the rail where the session's swatches collect, the sliding tab, the four galleries
// (one full marquee, three minis), the swatch modal with the CSS-3D viewer, the swatch lifecycle
// (four per session, the download pack built in-browser). One artifact — artifacts/finish-configurator.json.
import Image, { getImageProps } from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { GALLERIES, HANDLE_GALLERY_INDEX, type Tile } from '@/lib/galleries'
import { blobBytes, drawRoundel, makeZip, saveBlob, slug, tileBackground, type Picks } from './canvas'
import { MAX_SWATCHES, useConfigurator } from './ConfiguratorProvider'
import { SwatchRail } from './SwatchRail'
import { Viewer3D } from './Viewer3D'

type FacetSlot = keyof Picks
const SLOT_LABEL: Record<FacetSlot, string> = { doors: 'doors', carcass: 'carcass', handle: 'handles' }

/** The tile's intrinsic size from the manifest (a rendition is derived from it; the master is never served). */
const tileDims = (t: Tile): { width: number; height: number } => ({ width: t.width ?? 1600, height: t.height ?? 1000 })

/** A CSS background for a tile that is a rendition, not the master (the roundel facets, the modal image). */
export function tileBackgroundRendition(t: Tile, width = 640): string {
  if (!t.src) return tileBackground(t)
  const dims = tileDims(t)
  const { props } = getImageProps({ src: t.src, alt: '', width, height: Math.round((width * dims.height) / dims.width), quality: 80 })
  return `url('${props.src}') center/cover no-repeat`
}

/** A ribbon of tiles duplicated for the seamless −50% loop (README §3). Every image is a rendition sized for its tile. */
export function Ribbon({ tiles, duration, reverse, onTile, ariaHidden, sizes }: { tiles: Tile[]; duration: number; reverse?: boolean; onTile?: (t: Tile) => void; ariaHidden?: boolean; sizes?: string }) {
  let list = tiles
  while (list.length < 10) list = list.concat(tiles)
  const doubled = [...list, ...list]
  return (
    <div className={`ribbon${reverse ? ' rev' : ''}`} style={{ animationDuration: `${duration}s` }} aria-hidden={ariaHidden ? 'true' : undefined}>
      {doubled.map((t, i) => {
        const dims = tileDims(t)
        return (
          <figure key={`${t.id}-${i}`}>
            {t.src
              ? <Image src={t.src} alt={t.alt ?? t.name} width={dims.width} height={dims.height} sizes={sizes ?? '(max-width: 760px) 60vw, 310px'} loading="lazy" quality={75} />
              : <span className="sw" style={{ background: tileBackground(t) }} />}
            <figcaption>{t.name}</figcaption>
            {onTile && <button type="button" className="tilehit" aria-label={`Choose ${t.name}`} tabIndex={i < list.length ? 0 : -1} onClick={() => onTile(t)} />}
          </figure>
        )
      })}
    </div>
  )
}

export function FinishConfigurator({ lead }: { lead: ReactNode }) {
  const { picks, swatches, activeGallery, setActiveGallery, pick, newSwatch } = useConfigurator()
  const [modalTile, setModalTile] = useState<Tile | null>(null)
  const [modalConfirm, setModalConfirm] = useState<string | null>(null)
  const [in3d, setIn3d] = useState(false)
  const [mainOpacity, setMainOpacity] = useState(1)
  const [shownGallery, setShownGallery] = useState(0)
  const [building, setBuilding] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)

  const gallery = GALLERIES[shownGallery] ?? GALLERIES[0]!
  const complete = !!(picks.doors && picks.carcass && picks.handle)
  const sessionFull = swatches.length >= MAX_SWATCHES

  // recipe swap: a 200ms crossfade when the active gallery changes; recipe tab-slide: the thumb follows.
  useEffect(() => {
    if (activeGallery === shownGallery) return
    setMainOpacity(0)
    const t = setTimeout(() => { setShownGallery(activeGallery); setMainOpacity(1) }, 200)
    return () => clearTimeout(t)
  }, [activeGallery, shownGallery])

  const moveThumb = useCallback(() => {
    const tabs = tabsRef.current, thumb = thumbRef.current
    if (!tabs || !thumb) return
    const b = tabs.querySelectorAll<HTMLButtonElement>('button')[activeGallery]
    if (!b) return
    thumb.style.left = `${b.offsetLeft}px`
    thumb.style.width = `${b.offsetWidth}px`
  }, [activeGallery])
  useEffect(() => {
    moveThumb()
    const raf = requestAnimationFrame(moveThumb)
    addEventListener('resize', moveThumb)
    document.fonts?.ready.then(moveThumb)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', moveThumb) }
  }, [moveThumb])

  // When doors and carcass are set and no handle, the gallery switches to Handles (README §4).
  useEffect(() => {
    if (picks.doors && picks.carcass && !picks.handle && HANDLE_GALLERY_INDEX >= 0) setActiveGallery(HANDLE_GALLERY_INDEX)
  }, [picks.doors, picks.carcass, picks.handle, setActiveGallery])

  const openModal = (t: Tile) => { if (sessionFull) return; setModalTile(t); setModalConfirm(null); setIn3d(false) }
  const closeModal = () => { setModalTile(null); setIn3d(false) }
  const choose = (slot: FacetSlot) => {
    if (!modalTile) return
    pick(slot, modalTile)
    setTimeout(() => setModalConfirm(`${modalTile.name} — set for ${SLOT_LABEL[slot]}`), 250)
  }
  const options: Array<[FacetSlot, string]> = useMemo(() => {
    if (!modalTile) return []
    if (modalTile.kind === 'handle') return picks.handle ? [] : [['handle', 'Use for handles']]
    const o: Array<[FacetSlot, string]> = []
    if (!picks.doors) o.push(['doors', 'Use for doors'])
    if (!picks.carcass) o.push(['carcass', 'Use for carcass'])
    return o
  }, [modalTile, picks])

  const download = async () => {
    const p = swatches[swatches.length - 1]?.picks ?? (complete ? (picks as Required<Picks>) : null)
    if (!p || !p.doors || !p.carcass || !p.handle) return
    setBuilding(true)
    try {
      const cv = await drawRoundel(900, { doors: p.doors, carcass: p.carcass, handle: p.handle })
      const roundelPng = await new Promise<Blob>((r) => cv.toBlob((b) => r(b as Blob), 'image/png'))
      const files = [{ name: 'sturij-roundel.png', data: await blobBytes(roundelPng) }]
      const d = p.doors
      const name = `door-swatch-${slug(d.name)}${d.code ? `-${d.code}` : ''}`
      if (d.src) files.push({ name: name + d.src.slice(d.src.lastIndexOf('.')), data: await blobBytes(await (await fetch(d.src)).blob()) })
      else {
        const c2 = document.createElement('canvas')
        c2.width = 800; c2.height = 500
        const x2 = c2.getContext('2d') as CanvasRenderingContext2D
        const g = x2.createLinearGradient(0, 0, 800, 500)
        g.addColorStop(0, d.gradient?.[0] ?? '#888888') // token-audit:allow — the tile's own colour
        g.addColorStop(1, d.gradient?.[1] ?? '#666666') // token-audit:allow
        x2.fillStyle = g
        x2.fillRect(0, 0, 800, 500)
        files.push({ name: name + '.png', data: await blobBytes(await new Promise<Blob>((r) => c2.toBlob((b) => r(b as Blob), 'image/png'))) })
      }
      saveBlob(makeZip(files), 'sturij-finishes.zip')
    } finally {
      setBuilding(false)
    }
  }

  const facetStyle = (t: Tile | null): CSSProperties => (t ? { background: tileBackgroundRendition(t, 640), backgroundSize: 'cover' } : {})

  return (
    <section className="eggerband" id="range" data-artifact="finish-configurator">
      <div className="eb-lead">
        <div className="eb-txt">{lead}</div>
        <div className="eb-side reveal">
          <div className="eb-round">
            <div className="roundel" id="roundel" role="img" aria-label={complete ? `Your swatch: ${picks.doors!.name} doors, ${picks.carcass!.name} carcass, ${picks.handle!.name} handles` : 'Your finish selection — empty'}>
              <div className="hex">
                <div className="fc f-doors" style={facetStyle(picks.doors)} />
                <div className="fc f-carcass" style={facetStyle(picks.carcass)} />
                <div className="fc f-handle" style={facetStyle(picks.handle)} />
              </div>
            </div>
            {/* the session's four swatches collect beside the roundel — placeholders until made (Mark's mock, 11 Sep 2026) */}
            <SwatchRail variant="range" roomLabel="room" className="eb-rail" id="swrail-range" tip tipAt="last" />
          </div>
          {complete && (
            <div className="dlwrap">
              <button className="dlgold" type="button" onClick={download} disabled={building}>{building ? 'Building…' : 'Download swatch ↓'}</button>
              {!sessionFull && <button className="newsw" type="button" onClick={() => { closeModal(); newSwatch() }}>+ New swatch</button>}
              <span className="dlnote">Swatch {swatches.length} of {MAX_SWATCHES}</span>
            </div>
          )}
        </div>
      </div>
      <div id="galleries">
        <div className="galtabs reveal" ref={tabsRef} role="tablist" aria-label="Finish galleries">
          <span className="thumb" ref={thumbRef} />
          {GALLERIES.map((g, i) => (
            <button key={g.id} type="button" role="tab" aria-selected={i === activeGallery} className={i === activeGallery ? 'on' : undefined} onClick={() => setActiveGallery(i)}>{g.label}</button>
          ))}
        </div>
        <div className="galmain" style={{ opacity: mainOpacity }} aria-live="polite">
          <Ribbon tiles={gallery.tiles} duration={60} onTile={openModal} />
        </div>
        <div className="galminis">
          {GALLERIES.map((g, j) => j === activeGallery ? null : (
            <button key={g.id} className="gmini" type="button" aria-label={`Show ${g.label} gallery`} onClick={() => setActiveGallery(j)}>
              <Ribbon tiles={g.tiles} duration={34 + j * 8} reverse={j % 2 === 1} ariaHidden />
              <span className="ml">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`swm${modalTile ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label={modalTile?.name} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        {modalTile && (
          <div className="box">
            <div className="swimg" style={in3d ? undefined : { background: tileBackgroundRendition(modalTile, 1200), backgroundSize: 'cover' }}>
              {in3d && <Viewer3D tile={modalTile} />}
            </div>
            <div className="mbody">
              <h3>{modalTile.name}</h3>
              <span className="code">{modalTile.code ? `${modalTile.supplier ?? ''} ${modalTile.code}` : modalTile.kind === 'handle' ? 'Handle finish' : 'Egger decor'}</span>
              {!modalConfirm && (
                <div className="opts">
                  {options.map(([slot, label]) => (
                    <label className="opt" key={slot}><input type="checkbox" onChange={() => choose(slot)} /> {label}</label>
                  ))}
                </div>
              )}
              {modalConfirm && <div className="done">{modalConfirm}</div>}
              <div className="acts">
                <button className="mbtn" type="button" onClick={() => setIn3d((v) => !v)}>{in3d ? 'Back to swatch' : 'View in 3D'}</button>
                <button className="mbtn ghost" type="button" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
