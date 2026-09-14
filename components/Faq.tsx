import { Copy, type Slot } from './Copy'

export interface FaqView { id: string; q: Slot; a: Slot[] }

/**
 * The FAQ accordion (artifacts/faq-accordion.json): visible content in native <details>/<summary> — nothing hidden
 * from people for crawlers, no script; the same visible items feed the page's FAQPage structured data. A
 * held item (every answer line [P]) is not in the DOM at all.
 */
export function Faq({ items, sectionId }: { items: FaqView[]; sectionId: string }) {
  if (items.length === 0) return null
  return (
    <section className="band faqsec" id="questions" data-artifact="faq-accordion" data-section={sectionId} data-items={items.length}>
      <div className="wrap">
        <h2 className="faqhead reveal">Questions we're asked</h2>
        <div className="faqlist">
          {items.map((it) => (
            <details className="faq" key={it.id} data-faq={it.id}>
              <summary><Copy slot={it.q} as="span" /></summary>
              <div className="faqbody">
                {it.a.map((l) => <Copy key={l.id} slot={l} as="p" />)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
