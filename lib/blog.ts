// Blog posts as content records (page-platform S1): every line a copy slot the admin's versioned slot
// tables can override (lib/slots.ts merges allBlogSlots() into the seed, exactly as it merges sections).
// A post's publish date is a claim-style slot (claim.blog.<id>) — empty holds the post off the index and
// off its own page until Mark closes it with a real ISO date (PP4: absence is visible, never guessed).
// Migrated from sturij-web's Feb 2026 content_item rows (content_type=blog); their fabricated Unsplash
// cover images and backdated publish dates were not carried forward — see the blog-section receipt.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface BlogLine { id: string; text: string; heading?: string }
export interface BlogPost {
  id: string
  slug: string
  category: string
  title: string
  description: string
  author: string
  readTime: string
  standfirst: BlogLine
  body: BlogLine[]
  source: { document: string; note: string }
}

const DIR = 'content/blog'

export function loadPosts(dir = DIR): BlogPost[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as BlogPost)
}

export function loadPost(id: string): BlogPost {
  const p = loadPosts().find((x) => x.id === id)
  if (!p) throw new Error(`A_UNDECLARED: post ${id} has no file under ${DIR}`)
  return p
}

/** The slot under which Mark closes a post with its real go-live date. Empty = held. */
export const postDateSlotId = (id: string): string => `claim.blog.${id}`

/** Every copy slot a post seeds: its standfirst, every body line, and its (empty) date claim. */
export function postSlots(post: BlogPost): Record<string, string> {
  const slots: Record<string, string> = {}
  slots[post.standfirst.id] = post.standfirst.text
  for (const l of post.body) slots[l.id] = l.text
  slots[postDateSlotId(post.id)] = ''
  return slots
}

/** Every slot every post seeds — merged into the site's seed by lib/slots.ts. */
export function allBlogSlots(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of loadPosts()) for (const [k, v] of Object.entries(postSlots(p))) {
    if (k in out) throw new Error(`A_UNDECLARED: slot ${k} is seeded twice`)
    out[k] = v
  }
  return out
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** A post is publishable once Mark has closed its date slot with a real ISO date. */
export function postPublishedDate(post: BlogPost, closures: Record<string, string>): string | null {
  const v = (closures[postDateSlotId(post.id)] ?? '').trim()
  return ISO_DATE.test(v) ? v : null
}

export interface PublishedPost extends BlogPost { publishedDate: string }

/** Every post Mark has closed with a real date, newest first — what the index and the sitemap read. */
export function publishablePosts(closures: Record<string, string>): PublishedPost[] {
  return loadPosts()
    .map((p) => ({ ...p, publishedDate: postPublishedDate(p, closures) }))
    .filter((p): p is PublishedPost => p.publishedDate !== null)
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
}
