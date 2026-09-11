import { Copy, type Slot } from './Copy'
import { SlotImage } from './SlotImage'
import { SwatchRail } from './configurator/SwatchRail'
import { VisualTarget } from './configurator/VisualTarget'
import type { ImageRef } from '@/lib/slots'
import { ROOMS } from '@/lib/galleries'

export interface Feature {
  id: string
  kicker: Slot
  title: Slot
  body: Slot
  cta: Slot
  imageSlot: string
  image: ImageRef
  /** The room this block renders — its rail remixes the block's own image into it (bedroom, living room). */
  room: string
  reverse?: boolean
}

/** §6 Two alternating image/text features on linen; each carries a swatch rail and remixes its own image into its room. */
export function Features({ features }: { features: Feature[] }) {
  return (
    <section className="ranges" data-artifact="feature-split">
      {features.map((f) => {
        const room = ROOMS.find((r) => r.id === f.room) ?? null
        return (
        <div key={f.id} className={`feat haswr${f.reverse ? ' rev' : ''}`} id={f.id}>
          <SwatchRail variant="block" targetKey={`feature:${f.id}`} roomLabel={room?.label ?? 'room'} className="swrail" id={`swrail-${f.id}`} tip />
          <VisualTarget targetKey={`feature:${f.id}`} room={room} base={f.image.src} className={`feat-img ${f.reverse ? 'reveal-r' : 'reveal-l'}`}>
            <SlotImage id={f.imageSlot} image={f.image} fill sizes="(max-width: 760px) 100vw, 50vw" />
          </VisualTarget>
          <div className={`feat-txt ${f.reverse ? 'reveal-l' : 'reveal-r'}`}>
            <Copy slot={f.kicker} as="div" className="kicker" />
            <Copy slot={f.title} as="h2" />
            <Copy slot={f.body} as="p" />
            <a className="flink" href="#enquire"><Copy slot={f.cta} /></a>
          </div>
        </div>
        )
      })}
    </section>
  )
}
