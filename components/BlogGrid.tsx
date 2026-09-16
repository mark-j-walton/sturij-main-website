// The blog index (artifacts/blog-grid.json): every published post as a card, newest first. A post whose
// claim.blog.<id> slot carries no real ISO date is held — absent from the grid (PP4: absence is visible,
// never guessed). The published count is the reading on <main data-published>.
import type { Metadata } from 'next'
import Link from 'next/link'
import { asset } from '@/lib/assets'
import { publishablePosts } from '@/lib/blog'
import { pageBySlug } from '@/lib/signpost'
import { copyOf, loadContent, type SiteContent } from '@/lib/slots'
import { Copy, type Slot } from './Copy'
import { EnquiryBand } from './EnquiryBand'
import { NavBar } from './NavBar'
import { RevealObserver } from './RevealObserver'
import { SiteFooter } from './SiteFooter'
import { ConfiguratorProvider } from './configurator/ConfiguratorProvider'

export function blogIndexMetadata(): Metadata {
  const entry = pageBySlug('/blog')
  return { title: entry?.title, description: entry?.description, alternates: { canonical: '/blog' } }
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function BlogGrid() {
  const content: SiteContent = await loadContent()
  const c = (slot: string): Slot => ({ id: slot, value: copyOf(content, slot) })
  const posts = publishablePosts(content.copy)
  const logo = asset('brand.logo-white').path

  return (
    <ConfiguratorProvider>
      <NavBar logo={logo} />
      <main id="top" className="secpage blogindex" data-content-source={content.source} data-artifact="blog-grid" data-published={posts.length}>
        <section className="band secpart first" data-artifact="blog-grid">
          <div className="wrap">
            <Copy slot={c('blog.hero.kicker')} as="div" className="kicker reveal" />
            <Copy slot={c('blog.hero.title')} as="h1" className="lead reveal" />
            <Copy slot={c('blog.hero.description')} as="p" className="standfirst reveal" />
            {posts.length === 0
              ? <p className="empty reveal" data-blog-empty>No posts are published yet.</p>
              : (
                <ul className="bloggrid" data-count={posts.length}>
                  {posts.map((p) => (
                    <li key={p.id} className="blogcard reveal" data-post={p.id}>
                      <Link href={p.slug}>
                        <span className="kicker">{p.category} · {formatDate(p.publishedDate)}</span>
                        <h2>{p.title}</h2>
                        <Copy slot={c(p.standfirst.id)} as="p" className="standfirst" />
                        <span className="readtime">{p.readTime}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </section>
        <EnquiryBand kicker={c('enquiry.kicker')} title={c('enquiry.title')} body={c('enquiry.body')} submit={c('enquiry.submit')} note={c('enquiry.note')} />
      </main>
      <SiteFooter logo={logo} tagline={c('footer.tagline')} social={{ facebook: c('footer.social.facebook'), instagram: c('footer.social.instagram'), linkedin: c('footer.social.linkedin') }} trustpilot={c('footer.trustpilot')} trademark={c('footer.trademark')} />
      <RevealObserver />
    </ConfiguratorProvider>
  )
}
