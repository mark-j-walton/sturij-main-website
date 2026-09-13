// A legal page (artifacts/legal-document.json): the record rendered byte-faithful — the identity paragraph
// (the legal entity and the trading name paired, addendum 2), the document as HTML, and the record's version,
// date, source and hash in the page footer. Nothing here is edited on the site.
import type { Metadata } from 'next'
import { asset } from '@/lib/assets'
import { IDENTITY, workshopLine } from '@/lib/identity'
import { legalHash, loadLegal, renderMarkdown, type LegalId } from '@/lib/legal'
import { pageBySlug } from '@/lib/signpost'
import { copyOf, loadContent } from '@/lib/slots'
import { NavBar } from './NavBar'
import { SiteFooter } from './SiteFooter'

export function legalMetadata(id: LegalId): Metadata {
  const entry = pageBySlug(`/${id}`)
  return { title: entry?.title ?? loadLegal(id).title, description: entry?.description, alternates: { canonical: `/${id}` } }
}

export async function LegalPage({ id }: { id: LegalId }) {
  const record = loadLegal(id)
  const content = await loadContent()
  const c = (slot: string) => ({ id: slot, value: copyOf(content, slot) })
  const logo = asset('brand.logo-white').path
  const hash = legalHash(record.content)
  const html = renderMarkdown(record.content)
  const recorded = record.createdAt.slice(0, 10)
  const sourceLabel = record.source === 'brain' ? 'the record in the brain' : 'the page as published on sturij.com, awaiting its record'
  return (
    <>
      <NavBar logo={logo} />
      <main id="top" className="secpage legalpage" data-content-source={content.source} data-legal={id} data-legal-version={record.version} data-legal-sha256={hash} data-legal-source={record.source}>
        <section className="band secpart first" data-artifact="legal-document">
          <div className="wrap">
            <div className="kicker reveal">Legal · {IDENTITY.tradingName}</div>
            <p className="standfirst identity" data-legal-identity>
              {IDENTITY.legalName}, trading as {IDENTITY.tradingName} — registered in {IDENTITY.registeredIn} no. {IDENTITY.companyNumber}. Workshop: {workshopLine()}. {IDENTITY.email} · {IDENTITY.phone.display}.
            </p>
            <article className="legaldoc" data-legal-document dangerouslySetInnerHTML={{ __html: html }} />
            <footer className="legalmeta mono" data-legal-meta>
              Version {record.version} · recorded {recorded}{record.lastUpdated ? ` · last updated ${record.lastUpdated}` : ''} · {sourceLabel}{record.externalId ? ` · ${record.externalId}` : ''} · sha256 {hash.slice(0, 12)}…<br />
              This page renders the document as it stands; nothing is edited here. A change is a new version of the record, re-rendered when it lands.
            </footer>
          </div>
        </section>
      </main>
      <SiteFooter logo={logo} tagline={c('footer.tagline')} social={{ facebook: c('footer.social.facebook'), instagram: c('footer.social.instagram'), linkedin: c('footer.social.linkedin') }} trustpilot={c('footer.trustpilot')} trademark={c('footer.trademark')} />
    </>
  )
}
