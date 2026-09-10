// The shell's nav artifact (artifacts/nav-bar.json): the wordmark and the section links.
export const NAV_LINKS = [
  { href: '#wardrobes', label: 'Wardrobes', hideOnPhone: true },
  { href: '#media', label: 'Media walls', hideOnPhone: true },
  { href: '#range', label: 'Finishes', hideOnPhone: false },
  { href: '#make', label: 'The Sturij way', hideOnPhone: true },
] as const

export function NavBar({ logo }: { logo: string }) {
  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="Sturij — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="Sturij" width={273} height={98} />
      </a>
      <nav className="navlinks" aria-label="Sections">
        {NAV_LINKS.map((l) => <a key={l.href} href={l.href} className={l.hideOnPhone ? 'hideM' : undefined}>{l.label}</a>)}
        <a className="cta" href="#enquire">Book a visit</a>
      </nav>
    </header>
  )
}
