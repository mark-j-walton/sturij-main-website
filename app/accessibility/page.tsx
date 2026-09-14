// /accessibility — the accessibility statement (pages/accessibility/layout.json): the standard aimed at,
// the known exceptions, the contact — copy slots Mark edits in place (addendum 5, item 12).
import type { Metadata } from 'next'
import { asset } from '@/lib/assets'
import { copyOf, loadContent } from '@/lib/slots'
import { Copy } from '@/components/Copy'
import { NavBar } from '@/components/NavBar'
import { RevealObserver } from '@/components/RevealObserver'
import { SiteFooter } from '@/components/SiteFooter'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Accessibility statement — Sturij',
  description: 'What sturij.com aims for (WCAG 2.2 AA), what we know falls short, and how to tell us.',
  alternates: { canonical: '/accessibility' },
}

export default async function AccessibilityPage() {
  const content = await loadContent()
  const c = (id: string) => ({ id, value: copyOf(content, id) })
  const logo = asset('brand.logo-white').path
  return (
    <>
      <NavBar logo={logo} />
      <main id="top" className="secpage statement" data-content-source={content.source} data-page="accessibility">
        <section className="band secpart first" data-artifact="content-section" data-part="statement">
          <div className="wrap">
            <Copy slot={c('access.kicker')} as="div" className="kicker reveal" />
            <Copy slot={c('access.heading')} as="h1" className="lead reveal" />
            <Copy slot={c('access.intro')} as="p" className="standfirst reveal" />
            <div className="secbody">
              <div className="prose reveal"><Copy slot={c('access.standard')} as="p" /></div>
              <div className="prose reveal"><Copy slot={c('access.known')} as="p" /></div>
              <div className="prose reveal"><Copy slot={c('access.contact')} as="p" /></div>
              <div className="closing reveal"><Copy slot={c('access.reviewed')} as="p" className="mono" /></div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter logo={logo} tagline={c('footer.tagline')} social={{ facebook: c('footer.social.facebook'), instagram: c('footer.social.instagram'), linkedin: c('footer.social.linkedin') }} trustpilot={c('footer.trustpilot')} trademark={c('footer.trademark')} />
      <RevealObserver />
    </>
  )
}
