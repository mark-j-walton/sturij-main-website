'use client'
// The calculator — one declared artifact (artifacts/calculator.json): configuration · tier · band.
// Inputs as the SPA has them; the finishes are the configurator's picks (one selection on the site,
// never a second materials UI); the preview is a drawn elevation; the band comes from /api/band and is
// shown with its derivation and its watermark, never as a single figure; "take this further" hands the
// band to the enquiry; "see it in a room" hands the materials to the site's render flow, labelled.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalculatorConfiguration, CalculatorTier } from '@/lib/calculator-data'
import { GALLERIES } from '@/lib/galleries'
import { Copy, type Slot } from '../Copy'
import { useConfigurator, type Guide } from '../configurator/ConfiguratorProvider'
import { VisualTarget } from '../configurator/VisualTarget'
import { ROOMS } from '@/lib/galleries'
import { Elevation } from './Elevation'

interface BandReply {
  ok: true
  band: { from: number; to: number; currency: string }
  derivation: string[]
  bays: number | null
  painted: boolean
  tier: { id: string; name: string; line: string }
  option: { id: string; name: string; desc: string } | null
  configuration: { id: string; name: string }
  table: { id: string; version: number; dated: string; reviewDate: string; watermark: string; basis: string }
}
type Reply = BandReply | { ok: false; code: string; message: string }

const gbp = (v: number) => `£${v.toLocaleString('en-GB')}`
const PAINTED_GALLERY = 'colours'

export interface CalculatorView { configurations: CalculatorConfiguration[]; tiers: CalculatorTier[]; watermark: string; basis: string }

/** The view data comes from the server page (lib/calculator-data reads the table there); the browser never holds the table. */
export function Calculator({ kicker, title, body, finishesHref, standalone, view }: { kicker: Slot; title: Slot; body: Slot; finishesHref: string; standalone?: boolean; view: CalculatorView }) {
  const CALC_CONFIGURATIONS = view.configurations, CALC_TIERS = view.tiers, CALC_WATERMARK = view.watermark, CALC_BASIS = view.basis
  const { picks, latestSwatch, setGuide, guide } = useConfigurator()
  const [cfgId, setCfgId] = useState<string>(CALC_CONFIGURATIONS[0]!.id)
  const cfg = useMemo(() => CALC_CONFIGURATIONS.find((c) => c.id === cfgId) ?? CALC_CONFIGURATIONS[0]!, [cfgId, CALC_CONFIGURATIONS])
  const [width, setWidth] = useState<number>(cfg.defW)
  const [height, setHeight] = useState<number>(cfg.defH ?? 2400)
  const [option, setOption] = useState<string>(cfg.options?.[0]?.id ?? '')
  const [tier, setTier] = useState<string>(CALC_TIERS[0]!.id)
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState<Reply | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setWidth(cfg.defW); setHeight(cfg.defH ?? 2400); setOption(cfg.options?.[0]?.id ?? '') }, [cfg])

  const doors = picks.doors ?? latestSwatch?.picks.doors ?? null
  const carcass = picks.carcass ?? latestSwatch?.picks.carcass ?? null
  const handle = picks.handle ?? latestSwatch?.picks.handle ?? null
  const painted = !!doors && (GALLERIES.find((g) => g.tiles.includes(doors))?.id === PAINTED_GALLERY)
  const swatchComplete = !!(doors && carcass && handle)

  const price = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/band', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ configuration: cfg.id, widthMm: width, option: option || null, tier, painted }) })
      const j = (await r.json().catch(() => null)) as Reply | null
      setReply(j ?? { ok: false, code: 'E_UPSTREAM', message: 'No answer' })
      if (j?.ok) {
        const g: Guide = { configuration: j.configuration.name, option: j.option?.name ?? null, widthMm: width, bays: j.bays, tier: j.tier.name, band: j.band, tableVersion: j.table.version, line: `${j.configuration.name}${j.option ? ` (${j.option.name})` : ''} · ${j.bays ? `${j.bays} bays · ` : ''}${cfg.kind === 'run' ? 'wall' : 'width'} ${width} mm · ${j.tier.name} · guide ${gbp(j.band.from)} – ${gbp(j.band.to)} (band table v${j.table.version})` }
        setGuide(g)
      }
    } finally {
      setBusy(false)
    }
  }, [cfg, width, option, tier, painted, setGuide])

  // the band follows every input, debounced a touch
  useEffect(() => { const t = setTimeout(() => { void price() }, 250); return () => clearTimeout(t) }, [price])

  const bays = cfg.kind === 'run' ? Math.max(2, Math.min(10, Math.round((width - 200) / 500))) : null
  const groups = [...new Set(CALC_CONFIGURATIONS.map((c) => c.group))]
  const optionObj = cfg.options?.find((o) => o.id === option) ?? null

  return (
    <section className={`band calc${standalone ? ' calc-page' : ''}`} id="calculator" data-artifact="calculator" data-state={reply?.ok ? 'priced' : 'idle'}>
      <div className="wrap">
        <Copy slot={kicker} as="div" className="kicker reveal" />
        <Copy slot={title} as="h2" className="lead reveal" />
        <Copy slot={body} as="p" className="sub reveal" />

        <div className="calc-grid">
          <div className="calc-inputs">
            <div className="calc-block">
              <div className="calc-label">What are we making?</div>
              {groups.map((g) => (
                <div key={g} className="calc-group">
                  <div className="calc-groupname">{g}</div>
                  <div className="calc-chips" role="radiogroup" aria-label={g}>
                    {CALC_CONFIGURATIONS.filter((c) => c.group === g).map((c) => (
                      <button key={c.id} type="button" role="radio" aria-checked={c.id === cfg.id} className={`calc-chip${c.id === cfg.id ? ' on' : ''}`} onClick={() => setCfgId(c.id)} title={c.blurb}>{c.name}</button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="calc-blurb">{cfg.blurb}</p>
            </div>

            <div className="calc-block">
              <label className="calc-label" htmlFor="calc-width">{cfg.kind === 'run' ? 'Wall width' : 'Width'} <span className="calc-val">{width.toLocaleString('en-GB')} mm{bays ? ` · ${bays} bays` : ''}</span></label>
              <input id="calc-width" type="range" min={cfg.minW} max={cfg.maxW} step={cfg.kind === 'run' ? 50 : 10} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
              <div className="calc-range"><span>{cfg.minW.toLocaleString('en-GB')} mm</span><span>{cfg.maxW.toLocaleString('en-GB')} mm</span></div>
              {cfg.kind === 'run' && (
                <>
                  <label className="calc-label" htmlFor="calc-height">Ceiling height <span className="calc-val">{height.toLocaleString('en-GB')} mm</span></label>
                  <input id="calc-height" type="range" min={2000} max={3000} step={20} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
                </>
              )}
            </div>

            {cfg.options && (
              <div className="calc-block">
                <div className="calc-label">How you&rsquo;ll use it</div>
                <div className="calc-options" role="radiogroup" aria-label="Layout">
                  {cfg.options.map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={o.id === option} className={`calc-option${o.id === option ? ' on' : ''}`} onClick={() => setOption(o.id)}>
                      <b>{o.name}</b><span>{o.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="calc-block">
              <div className="calc-label">Specification</div>
              <div className="calc-tiers" role="radiogroup" aria-label="Tier">
                {CALC_TIERS.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={t.id === tier} className={`calc-tier${t.id === tier ? ' on' : ''}`} onClick={() => setTier(t.id)}>
                    <b>{t.name}</b><span>{t.line}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="calc-block">
              <div className="calc-label">Finishes</div>
              {swatchComplete
                ? <p className="calc-blurb">Doors <b>{doors!.name}</b> · carcass <b>{carcass!.name}</b> · handles <b>{handle!.name}</b>{painted ? ' · painted doors' : ''}. <a href={finishesHref}>Change them in the range</a>.</p>
                : <p className="calc-blurb">Compose your swatch in <a href={finishesHref}>the range</a> — doors, carcass and handle — and the drawing and the room visual follow it.{doors ? ` Doors so far: ${doors.name}.` : ''}</p>}
            </div>
          </div>

          <div className="calc-out">
            <VisualTarget targetKey="calculator" room={null} className="calc-preview" roomPickerIn>
              <Elevation configuration={cfg as CalculatorConfiguration} widthMm={width} heightMm={height} bays={bays} option={optionObj} doors={doors} carcass={carcass} handle={handle} open={open} />
            </VisualTarget>
            <div className="calc-previewbar">
              <span className="calc-note">A drawing at your proportions, not a photograph</span>
              {cfg.kind === 'run' && <button type="button" className="calc-link" onClick={() => setOpen((v) => !v)}>{open ? 'Doors on' : 'Doors off'}</button>}
              <SeeItInARoom enabled={swatchComplete} />
            </div>

            <div className="calc-band" aria-live="polite" data-band={reply?.ok ? `${reply.band.from}-${reply.band.to}` : ''}>
              {reply?.ok ? (
                <>
                  <div className="calc-figure">{gbp(reply.band.from)} <span>–</span> {gbp(reply.band.to)}</div>
                  <div className="calc-watermark">{CALC_WATERMARK} · {CALC_BASIS}</div>
                  <div className="calc-tierline"><b>{reply.tier.name}</b> · {reply.tier.line}</div>
                  <details className="calc-derivation">
                    <summary>How this is worked out</summary>
                    <ol>{reply.derivation.map((d, i) => <li key={i}>{d}</li>)}</ol>
                    <p>Band table v{reply.table.version}, {reply.table.dated}. A guide, not a quote: the exact figure comes from your measurements at the design visit, priced from the cutting list.</p>
                  </details>
                </>
              ) : reply && !reply.ok ? (
                <div className="calc-refusal">{reply.message}</div>
              ) : (
                <div className="calc-watermark">{busy ? 'Working it out…' : CALC_WATERMARK}</div>
              )}
            </div>

            <div className="calc-acts">
              <a className="mbtn calc-cta" href="#enquire" data-guide={guide?.line ?? ''}>Take this further →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** One action, one render path: hands the composed swatch to the site's visualise flow on the calculator's own target. */
function SeeItInARoom({ enabled }: { enabled: boolean }) {
  const { latestSwatch, askRoomOn } = useConfigurator()
  return (
    <button type="button" className="calc-link" disabled={!enabled || !latestSwatch} onClick={() => latestSwatch && askRoomOn('calculator', latestSwatch)} title={enabled ? `Choose one of ${ROOMS.length} rooms and see it visualised` : 'Compose doors, carcass and handle first'}>
      See it in a room
    </button>
  )
}
