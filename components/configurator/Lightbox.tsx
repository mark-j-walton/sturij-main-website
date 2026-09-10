'use client'
// The lightbox for a generated visual: the image, its caption (the room and the full finish spec) and the
// download — every generated image is labelled a VISUALISATION here and in the downloaded strip; a
// generated room is never presented as a photograph.
import { composeDownload, saveBlob } from './canvas'
import { useConfigurator } from './ConfiguratorProvider'
import { VISUALISATION_LABEL } from './VisualTarget'

export function Lightbox() {
  const { lightbox, openLightbox } = useConfigurator()
  const v = lightbox
  const download = async () => {
    if (!v) return
    const cs = getComputedStyle(document.documentElement)
    const blob = await composeDownload(v.src, v.swatch.thumb, `VISUALISATION · ${v.room.label} · ${v.spec}`, { strip: cs.getPropertyValue('--download-strip').trim(), ink: cs.getPropertyValue('--download-ink').trim() })
    saveBlob(blob, `sturij-visualisation-${v.room.id}.png`)
  }
  return (
    <div className={`lbx${v ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Visualisation" onClick={(e) => { if (e.target === e.currentTarget) openLightbox(null) }}>
      {v && (
        <div className="lbin">
          <div className="lbframe">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.src} alt={`${VISUALISATION_LABEL}: ${v.room.label} — ${v.spec}`} />
            <span className="vis-badge">{VISUALISATION_LABEL}</span>
          </div>
          <div className="lbcap"><b>Visualisation</b> · {v.room.label} — {v.spec}</div>
          <div className="acts">
            <button className="mbtn" type="button" onClick={download}>Download ↓</button>
            <button className="mbtn ghost" type="button" onClick={() => openLightbox(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
