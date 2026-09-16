// The sitemap generated from the page register (pages/*/layout.json) — never hand-written (the SEO rule
// 0630c89d: the page register is the site map). A page is in the sitemap because its layout exists. Blog
// posts are not in the register (they are content, not pages); only published ones are added.
import type { MetadataRoute } from 'next'
import { publishablePosts } from '@/lib/blog'
import { pageRegister } from '@/lib/signpost'
import { loadContent } from '@/lib/slots'

const SITE = 'https://sturij.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = pageRegister().map((p) => ({
    url: p.slug === '/' ? `${SITE}/` : `${SITE}${p.slug}`,
    changeFrequency: p.kind === 'legal' || p.kind === 'statement' ? ('yearly' as const) : ('monthly' as const),
    priority: p.slug === '/' ? 1 : p.kind === 'legal' || p.kind === 'statement' ? 0.3 : 0.6,
  }))
  const content = await loadContent()
  const posts = publishablePosts(content.copy).map((p) => ({
    url: `${SITE}${p.slug}`,
    lastModified: p.publishedDate,
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  }))
  return [...pages, ...posts]
}
