// S6 — the signpost: navigation derives from the page register (pages/*/layout.json), never from an
// authored list. A page declares its nav entry (group, label, order) in its layout; the nav, the footer,
// the sitemap and the quality run read the register. Adding a page is one layout file; nothing else changes.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface NavEntry { group: string; label: string; order: number }
export interface PageEntry {
  page: string
  slug: string
  design: string
  kind?: 'home' | 'section' | 'legal' | 'tool' | 'statement'
  title?: string
  description?: string
  nav?: NavEntry
  source?: string
}

const PAGES_DIR = 'pages'

/** Every declared page, by layout file — the register. */
export function pageRegister(dir = PAGES_DIR): PageEntry[] {
  if (!existsSync(dir)) return []
  const out: PageEntry[] = []
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name, 'layout.json')
    if (!existsSync(file)) continue
    const layout = JSON.parse(readFileSync(file, 'utf8')) as PageEntry
    out.push({ page: layout.page, slug: layout.slug, design: layout.design, kind: layout.kind, title: layout.title, description: layout.description, nav: layout.nav, source: layout.source })
  }
  return out
}

export const SECTIONS_GROUP = 'What we build with'

/** The content sections in the order their layouts declare — the nav's group and the footer's row. */
export function sectionNav(): Array<{ slug: string; label: string; page: string }> {
  return pageRegister()
    .filter((p) => p.nav?.group === SECTIONS_GROUP)
    .sort((a, b) => (a.nav!.order - b.nav!.order) || a.slug.localeCompare(b.slug))
    .map((p) => ({ slug: p.slug, label: p.nav!.label, page: p.page }))
}

/** The register entry for a slug, or null. */
export function pageBySlug(slug: string): PageEntry | null {
  return pageRegister().find((p) => p.slug === slug) ?? null
}
