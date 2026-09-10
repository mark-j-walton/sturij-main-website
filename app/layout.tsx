import type { Metadata } from 'next'
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import './tokens.css'
import './site.css'

// The three faces the sturij-public instance names, self-hosted at build by next/font (no runtime request
// to a font service, no key). Each is exposed as the CSS variable app/tokens.css maps its family to.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['opsz'] })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-plex-mono', display: 'swap' })

const SITE = 'https://sturij.com'
const TITLE = 'Sturij — Fitted Furniture, Made in Yorkshire'
const DESCRIPTION = 'Bespoke fitted wardrobes, media walls and home offices — designed, made and fitted from our Harrogate workshop, to your millimetre. Made in Yorkshire.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: 'Bespoke wardrobes, media walls and home offices, built to your walls — not to a range.', type: 'website', url: SITE, images: ['/showcase/kitchen-bright.jpg'] },
  icons: { icon: [{ url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/brand/favicon-512.png', sizes: '512x512', type: 'image/png' }], apple: '/brand/favicon-180.png' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'Sturij',
  url: SITE,
  email: 'contact@sturij.com',
  telephone: '+441937326011',
  address: { '@type': 'PostalAddress', addressLocality: 'Harrogate', addressRegion: 'North Yorkshire', addressCountry: 'GB' },
  areaServed: 'North Yorkshire',
  description: DESCRIPTION,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </body>
    </html>
  )
}
