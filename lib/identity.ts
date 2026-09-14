// The business's identity — one NAP everywhere. content/identity.json is the data (addenda 1, 2 and 4 of the
// content-sections brief); the footer, the structured data and the legal pages read it here. Nothing about the
// business is typed into a component. The values Mark edits — the social URLs, the reviews link, the trade-mark
// registration — arrive from the footer's slots.
import { existsSync } from 'node:fs'
import identity from '@/content/identity.json'

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin'
export const SOCIAL_PLATFORMS: Array<{ id: SocialPlatform; label: string }> = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
]

export const IDENTITY = identity

/** A slot value that is a usable https URL, else null — a held or malformed value renders nothing. */
export function urlOf(value: string | null | undefined): string | null {
  const v = (value ?? '').replace(/<[^>]+>/g, '').trim()
  return /^https:\/\/[^\s"'<>]+$/.test(v) ? v : null
}

/** The workshop's address as one line — the NAP's A. */
export function workshopLine(): string {
  const w = identity.workshop
  return `${w.name}, ${w.street}, ${w.locality}, ${w.town} ${w.postcode}`
}

/** The registered office as one line — the footer's trading disclosure, and nowhere else on the site. */
export function registeredOfficeLine(): string {
  return `${identity.registeredOffice.lines.join(', ')} ${identity.registeredOffice.postcode}`
}

/** The trading disclosure the Companies (Trading Disclosures) Regulations 2008 and the E-Commerce Regulations 2002 ask for on every page (addendum 2's wording). */
export function tradingDisclosure(): string {
  return `${identity.tradingName} is a trading name of ${identity.legalName}, registered in ${identity.registeredIn} no. ${identity.companyNumber}, registered office ${registeredOfficeLine()}. VAT ${identity.vat}.`
}

/** The copyright notice — the legal entity, its trading name, the year (addendum 5, item 14). */
export function copyrightLine(year = new Date().getFullYear()): string {
  return `© ${year} ${identity.legalName}, trading as ${identity.tradingName}`
}

/** The trade-mark line — only once the UK registration number is on record in the footer's slot; plain "Sturij" until then (addendum 2). */
export function trademarkLine(registration: string | null | undefined): string | null {
  const n = (registration ?? '').replace(/<[^>]+>/g, '').trim()
  return /^UK\d{8,11}$/.test(n) ? `${identity.tradingName}® is a registered trade mark of ${identity.legalName} (${n}).` : null
}

/** The social links from the footer's slots, with the icon file where the platform's official asset has been placed, unaltered, per its guidelines. */
export function socialLinks(urls: Partial<Record<SocialPlatform, string | null | undefined>>): Array<{ id: SocialPlatform; label: string; href: string; icon: string | null }> {
  const out: Array<{ id: SocialPlatform; label: string; href: string; icon: string | null }> = []
  for (const p of SOCIAL_PLATFORMS) {
    const href = urlOf(urls[p.id])
    if (!href) continue
    const iconPath = `/brand/social/${p.id}.svg`
    out.push({ id: p.id, label: p.label, href, icon: existsSync(`public${iconPath}`) ? iconPath : null })
  }
  return out
}

/** The Organization and the LocalBusiness as one graph: the legal name and the trading name paired, the workshop's NAP, the social profiles as sameAs (addendum 2; the SEO rule 0630c89d). */
export function organisationJsonLd(site: string, description: string, sameAs: string[]) {
  const w = identity.workshop
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}/#organization`,
        name: identity.tradingName,
        legalName: identity.legalName,
        alternateName: identity.tradingName,
        url: site,
        logo: `${site}/brand/sturij-logo-black.png`,
        email: identity.email,
        telephone: identity.phone.e164,
        vatID: `GB${identity.vat}`,
        sameAs,
        brand: { '@type': 'Brand', name: identity.tradingName },
      },
      {
        '@type': 'HomeAndConstructionBusiness',
        '@id': `${site}/#workshop`,
        name: identity.tradingName,
        parentOrganization: { '@id': `${site}/#organization` },
        url: site,
        email: identity.email,
        telephone: identity.phone.e164,
        address: { '@type': 'PostalAddress', streetAddress: `${w.name}, ${w.street}`, addressLocality: w.locality, addressRegion: w.region, postalCode: w.postcode, addressCountry: w.country },
        areaServed: identity.areaServed,
        description,
      },
    ],
  }
}
