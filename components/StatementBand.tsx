import { Copy, type Slot } from './Copy'

/** §7 The statement block: kicker and the quoted statement in the statement face at weight 200. */
export function StatementBand({ kicker, text }: { kicker: Slot; text: Slot }) {
  return (
    <section className="breather" data-artifact="statement-band">
      <div className="wrap">
        <Copy slot={kicker} as="div" className="kicker reveal" />
        <Copy slot={text} as="h2" className="reveal" />
      </div>
    </section>
  )
}
