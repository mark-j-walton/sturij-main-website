import { Copy, type Slot } from './Copy'

export interface ManifestoStep { no: string; title: Slot; body: Slot }

/** §10 The manifesto band: centred kicker and lead, three columns with gold top rules. */
export function Manifesto({ kicker, title, steps }: { kicker: Slot; title: Slot; steps: ManifestoStep[] }) {
  return (
    <section className="band" id="make" data-artifact="manifesto">
      <div className="wrap">
        <Copy slot={kicker} as="div" className="kicker reveal" />
        <Copy slot={title} as="h2" className="lead reveal" />
        <div className="steps">
          {steps.map((s) => (
            <div className="step reveal" key={s.no}>
              <div className="no">{s.no}</div>
              <Copy slot={s.title} as="h3" />
              <Copy slot={s.body} as="p" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
