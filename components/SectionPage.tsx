// A content section as a page (artifacts/content-section.json): the copy family's part as data, every line a
// slot, every [P] claim held until Mark closes its row, every partner gated on consent and a review date. The
// held-line count is the reading on <main> (data-held) and on the receipt; a held line is absent from the DOM,
// with an empty outline the admin's editing mode shows so the closing line can be typed in place.
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { asset } from '@/lib/assets'
import { copyText } from '@/lib/copy'
import { claimSlotId, faqHeld, heldReading, lineHeld, loadPartners, loadSection, partHeld, partnerFields, partnerPublishable, type Block, type Line, type Section } from '@/lib/sections'
import { copyOf, loadContent, type SiteContent } from '@/lib/slots'
import { Copy, type Slot } from './Copy'
import { EnquiryBand } from './EnquiryBand'
import { Faq, type FaqView } from './Faq'
import { NavBar } from './NavBar'
import { RevealObserver } from './RevealObserver'
import { SiteFooter } from './SiteFooter'
import { ConfiguratorProvider } from './configurator/ConfiguratorProvider'

export function sectionMetadata(id: string): Metadata {
  const s = loadSection(id)
  return { title: s.title, description: s.description, alternates: { canonical: s.slug } }
}

/** The admin's outline for a held line: no text for visitors (display:none), an editable slot for the closing line in editing mode. */
function HeldOutline({ section, line }: { section: Section; line: Line }) {
  const open = (line.claims ?? []).filter((c) => section.claims.find((r) => r.id === c)?.status === 'P')
  if (open.length === 0) return null
  return <>{open.map((c) => <span key={c} className="held" data-copy-slot={claimSlotId(section.id, c)} data-held-claim={c} data-held-line={line.id} aria-hidden="true" />)}</>
}

export async function SectionPage({ id }: { id: string }) {
  const section = loadSection(id)
  const partners = loadPartners()
  const content = await loadContent()
  const c = (slot: string): Slot => ({ id: slot, value: copyOf(content, slot) })
  const held = heldReading(section, content.copy, partners)
  const logo = asset('brand.logo-white').path
  const isHeld = (l: Line) => lineHeld(section, l, content.copy, partners)

  const faqItems: FaqView[] = section.faq
    .filter((it) => !faqHeld(section, it, content.copy, partners))
    .map((it) => ({ id: it.id, q: c(`sec.${section.id}.faq.${it.id}.q`), a: it.a.filter((l) => !isHeld(l)).map((l) => c(l.id)) }))
  const faqLd = faqItems.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: copyText(f.q.value), acceptedAnswer: { '@type': 'Answer', text: f.a.map((l) => copyText(l.value)).join(' ') } })) }
    : null

  const renderLines = (lines: Line[], as: 'p' | 'li', className?: string): ReactNode => lines.map((l) => {
    if (isHeld(l)) return <HeldOutline key={l.id} section={section} line={l} />
    const title = l.title ? <><strong>{copyText(copyOf(content, `${l.id}.title`))}</strong> </> : null
    return as === 'li'
      ? <li key={l.id} className={className}>{title}<Copy slot={c(l.id)} as="span" /></li>
      : <p key={l.id} className={className}>{title}<Copy slot={c(l.id)} as="span" /></p>
  })

  const renderBlock = (block: Block, level: 'h2' | 'h3'): ReactNode => {
    if (block.kind === 'partners') {
      const shown = partners.filter((p) => partnerPublishable(p))
      if (shown.length === 0) return <div key={block.id} className="partners empty" data-partners="0" />
      return (
        <ul key={block.id} className="partners" data-partners={shown.length}>
          {shown.map((p) => (
            <li key={p.id} className="partner" data-partner={p.id}>
              {partnerFields(p).map(([f, v]) => f === 'website'
                ? <span key={f} className={`pf pf-${f}`}><a href={v} target="_blank" rel="noopener noreferrer">{v.replace(/^https?:\/\//, '')}</a></span>
                : f === 'email' ? <span key={f} className={`pf pf-${f}`}><a href={`mailto:${v}`}>{v}</a></span>
                : f === 'phone' ? <span key={f} className={`pf pf-${f}`}><a href={`tel:${v.replace(/\s+/g, '')}`}>{v}</a></span>
                : <span key={f} className={`pf pf-${f}`}>{v}</span>)}
            </li>
          ))}
        </ul>
      )
    }
    const allHeld = block.lines.length > 0 && block.lines.every(isHeld)
    if (allHeld) return <div key={block.id} className="heldblock" data-held-block={block.id}>{block.lines.map((l) => <HeldOutline key={l.id} section={section} line={l} />)}</div>
    const title = block.title ? <Copy slot={c(`sec.${section.id}.${block.id}.title`)} as={level} /> : null
    if (block.kind === 'maker') return <div key={block.id} className="maker reveal" data-block={block.id}>{title}{renderLines(block.lines, 'p')}</div>
    if (block.kind === 'list') return <div key={block.id} className="means reveal" data-block={block.id}>{title}<ul>{renderLines(block.lines, 'li')}</ul></div>
    if (block.kind === 'closing') return <div key={block.id} className="closing reveal" data-block={block.id}>{renderLines(block.lines, 'p')}</div>
    if (block.kind === 'statement') return <blockquote key={block.id} className="tradestatement reveal" data-block={block.id}>{renderLines(block.lines, 'p')}</blockquote>
    return <div key={block.id} className="prose reveal" data-block={block.id}>{title}{renderLines(block.lines, 'p')}</div>
  }

  return (
    <ConfiguratorProvider>
      <NavBar logo={logo} />
      <main id="top" className="secpage" data-content-source={content.source} data-section={section.id} data-source-document={section.source.document} data-source-version={section.source.version} data-held={held.total} data-held-lines={held.lines} data-held-faq={held.faq} data-held-partners={held.partners} data-held-parts={held.parts} data-held-open={held.open.join(' ')}>
        {section.parts.map((part, i) => {
          if (partHeld(section, part, partners)) return <div key={part.id} className="heldpart" data-held-part={part.id} data-partner={part.partner} />
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <section key={part.id} className={`band secpart${i === 0 ? ' first' : ''}`} data-artifact="content-section" data-part={part.id}>
              <div className="wrap">
                {part.kicker !== undefined && <Copy slot={c(`sec.${section.id}.${part.id}.kicker`)} as="div" className="kicker reveal" />}
                <Copy slot={c(`sec.${section.id}.${part.id}.heading`)} as={Heading} className="lead reveal" />
                {part.standfirst && (isHeld(part.standfirst) ? <HeldOutline section={section} line={part.standfirst} /> : <Copy slot={c(part.standfirst.id)} as="p" className="standfirst reveal" />)}
                {/* the heading order descends: the first part's heading is the page's h1 and its block titles are h2; later parts are h2 with h3 block titles */}
                <div className="secbody">{part.blocks.map((b) => renderBlock(b, i === 0 ? 'h2' : 'h3'))}</div>
              </div>
            </section>
          )
        })}
        <Faq items={faqItems} sectionId={section.id} />
        <EnquiryBand kicker={c('enquiry.kicker')} title={c('enquiry.title')} body={c('enquiry.body')} submit={c('enquiry.submit')} note={c('enquiry.note')} />
      </main>
      <SiteFooter logo={logo} tagline={c('footer.tagline')} social={{ facebook: c('footer.social.facebook'), instagram: c('footer.social.instagram'), linkedin: c('footer.social.linkedin') }} trustpilot={c('footer.trustpilot')} trademark={c('footer.trademark')} />
      {faqLd && <script type="application/ld+json" data-jsonld="faq" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />}
      <RevealObserver />
    </ConfiguratorProvider>
  )
}

export type { SiteContent }
