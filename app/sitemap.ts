// The sitemap generated from the page register (pages/*/layout.json) — never hand-written (the SEO rule
// 0630c89d: the page register is the site map). A page is in the sitemap because its layout exists.
import type { MetadataRoute } from 'next'
import { pageRegister } from '@/lib/signpost'

const SITE = 'https://sturij.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return pageRegister().map((p) => ({
    url: p.slug === '/' ? `${SITE}/` : `${SITE}${p.slug}`,
    changeFrequency: p.kind === 'legal' || p.kind === 'statement' ? 'yearly' : 'monthly',
    priority: p.slug === '/' ? 1 : p.kind === 'legal' || p.kind === 'statement' ? 0.3 : 0.6,
  }))
}
