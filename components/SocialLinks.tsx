import { socialLinks, type SocialPlatform } from '@/lib/identity'

/** The three profile links (artifacts/social-links.json): a link is a link — no platform script, no embed. The URLs are the footer's slots. */
export function SocialLinks({ urls }: { urls: Partial<Record<SocialPlatform, string | null | undefined>> }) {
  const links = socialLinks(urls)
  if (links.length === 0) return null
  return (
    <ul className="social" data-artifact="social-links" aria-label="Sturij on social media">
      {links.map((l) => (
        <li key={l.id}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`Sturij on ${l.label}`} data-platform={l.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {l.icon ? <img src={l.icon} alt="" width={20} height={20} /> : <span>{l.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}
