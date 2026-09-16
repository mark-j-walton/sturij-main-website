// The shell's nav artifact (artifacts/nav-bar.json): the wordmark, the home page's section links, and the
// content sections as one group derived from the page register (S6) — a <details> that needs no script.
import { sectionNav, SECTIONS_GROUP } from '@/lib/signpost'

export const NAV_LINKS = [
  { href: '/#wardrobes', label: 'Wardrobes', hideOnPhone: true },
  { href: '/#media', label: 'Media walls', hideOnPhone: true },
  { href: '/#range', label: 'Finishes', hideOnPhone: false },
  { href: '/#make', label: 'The Sturij way', hideOnPhone: true },
  { href: '/blog', label: 'Blog', hideOnPhone: true },
] as const

export function NavBar({ logo }: { logo: string }) {
  const sections = sectionNav()
  return (
    <header className="nav">
      <a className="brand" href="/#top" aria-label="Sturij — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="Sturij" width={273} height={98} />
      </a>
      <nav className="navlinks" aria-label="Sections">
        {NAV_LINKS.map((l) => <a key={l.href} href={l.href} className={l.hideOnPhone ? 'hideM' : undefined}>{l.label}</a>)}
        {sections.length > 0 && (
          <details className="navmore hideM" data-signpost="sections">
            <summary>{SECTIONS_GROUP}</summary>
            <ul>
              {sections.map((s) => <li key={s.slug}><a href={s.slug}>{s.label}</a></li>)}
            </ul>
          </details>
        )}
        <a className="cta" href="/#enquire">Book a visit</a>
      </nav>
    </header>
  )
}
