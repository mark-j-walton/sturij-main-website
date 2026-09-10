import { Copy, type Slot } from './Copy'
import { SlotImage } from './SlotImage'
import { SwatchRail } from './configurator/SwatchRail'
import { VisualTarget } from './configurator/VisualTarget'
import type { ImageRef } from '@/lib/slots'

export interface Feature {
  id: string
  kicker: Slot
  title: Slot
  body: Slot
  cta: Slot
  imageSlot: string
  image: ImageRef
  /** The wardrobes feature carries the swatch rail and is the visualise target (README §6). */
  rail?: boolean
  reverse?: boolean
}

/** §6 Two alternating image/text features on linen; the first carries the swatch rail and visualises. */
export function Features({ features }: { features: Feature[] }) {
  return (
    <section className="ranges" data-artifact="feature-split">
      {features.map((f) => (
        <div key={f.id} className={`feat${f.rail ? ' haswr' : ''}${f.reverse ? ' rev' : ''}`} id={f.id}>
          {f.rail && <SwatchRail variant="feature" className="swrail" id="swrail" />}
          {f.rail ? (
            <VisualTarget targetKey="feature" room={null} className="feat-img reveal-l">
              <SlotImage id={f.imageSlot} image={f.image} fill sizes="(max-width: 760px) 100vw, 50vw" />
            </VisualTarget>
          ) : (
            <div className={`feat-img ${f.reverse ? 'reveal-r' : 'reveal-l'}`}>
              <SlotImage id={f.imageSlot} image={f.image} fill sizes="(max-width: 760px) 100vw, 50vw" />
            </div>
          )}
          <div className={`feat-txt ${f.reverse ? 'reveal-l' : 'reveal-r'}`}>
            <Copy slot={f.kicker} as="div" className="kicker" />
            <Copy slot={f.title} as="h2" />
            <Copy slot={f.body} as="p" />
            <a className="flink" href="#enquire"><Copy slot={f.cta} /></a>
          </div>
        </div>
      ))}
    </section>
  )
}
