import type { Metadata } from 'next'
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { IDENTITY, organisationJsonLd, socialLinks } from '@/lib/identity'
import { SITE } from '@/lib/site'
import { loadContent } from '@/lib/slots'
import './tokens.css'
import './site.css'
import './calculator.css'

// The three faces the sturij-public instance names, self-hosted at build by next/font (no runtime request
// to a font service, no key). Each is exposed as the CSS variable app/tokens.css maps its family to.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['opsz'] })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-plex-mono', display: 'swap' })

const TITLE = 'Sturij — Fitted Furniture, Made in Yorkshire'
const DESCRIPTION = `Bespoke fitted wardrobes, media walls and home offices — designed, made and fitted from our ${IDENTITY.workshop.locality} workshop, to your millimetre. Made in Yorkshire.`

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: 'Bespoke wardrobes, media walls and home offices, built to your walls — not to a range.', type: 'website', url: SITE, images: ['/showcase/kitchen-bright.jpg'] },
  icons: { icon: [{ url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/brand/favicon-512.png', sizes: '512x512', type: 'image/png' }], apple: '/brand/favicon-180.png' },
}

/**
 * The structured data every page carries: the Organization (legal name and trading name paired) and the
 * workshop as the LocalBusiness with one NAP — the same address, phone and email the footer shows. The
 * social profiles come from the footer's slots as sameAs. Page-specific graphs (FAQPage) are added by the page.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const content = await loadContent()
  const sameAs = socialLinks({ facebook: content.copy['footer.social.facebook'], instagram: content.copy['footer.social.instagram'], linkedin: content.copy['footer.social.linkedin'] }).map((l) => l.href)
  const jsonLd = organisationJsonLd(SITE, DESCRIPTION, sameAs)
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <script type="application/ld+json" data-jsonld="organisation" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  )
}
