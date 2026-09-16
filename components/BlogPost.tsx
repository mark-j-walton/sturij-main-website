// A single blog post (artifacts/blog-post.json): category, title, author and read time, the standfirst,
// then the body as paragraphs with their subheadings, every line a copy slot. A post whose claim.blog.<id>
// slot carries no real ISO date still renders (so Mark can reach its held date-claim in admin editing mode
// and close it — the index and the sitemap never link an unpublished post, and the page carries noindex
// until it is), but says so rather than showing a guessed date.
import type { Metadata } from 'next'
import Link from 'next/link'
import { asset } from '@/lib/assets'
import { loadPost, postDateSlotId, postPublishedDate } from '@/lib/blog'
import { copyOf, loadContent, type SiteContent } from '@/lib/slots'
import { Copy, type Slot } from './Copy'
import { EnquiryBand } from './EnquiryBand'
import { NavBar } from './NavBar'
import { RevealObserver } from './RevealObserver'
import { SiteFooter } from './SiteFooter'
import { ConfiguratorProvider } from './configurator/ConfiguratorProvider'

export async function blogPostMetadata(id: string): Promise<Metadata> {
  const post = loadPost(id)
  const content = await loadContent()
  const published = !!postPublishedDate(post, content.copy)
  return { title: `${post.title} — Sturij`, description: post.description, alternates: { canonical: post.slug }, robots: published ? undefined : { index: false, follow: false } }
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function BlogPostPage({ id }: { id: string }) {
  const post = loadPost(id)
  const content: SiteContent = await loadContent()
  const c = (slot: string): Slot => ({ id: slot, value: copyOf(content, slot) })
  const publishedDate = postPublishedDate(post, content.copy)
  const logo = asset('brand.logo-white').path

  return (
    <ConfiguratorProvider>
      <NavBar logo={logo} />
      <main id="top" className="secpage blogpost" data-content-source={content.source} data-post={post.id} data-post-published={publishedDate ?? ''}>
        <article className="band secpart first" data-artifact="blog-post">
          <div className="wrap">
            <div className="kicker reveal">
              {post.category}{publishedDate ? ` · ${formatDate(publishedDate)}` : ''} · {post.author} · {post.readTime}
            </div>
            {!publishedDate && (
              <p className="draftnote">
                Not yet published — no date is set on this post's claim slot.
                <span className="held" data-copy-slot={postDateSlotId(post.id)} data-held-claim="go-live date (YYYY-MM-DD)" data-held-line={post.id} />
              </p>
            )}
            <h1 className="lead reveal">{post.title}</h1>
            <Copy slot={c(post.standfirst.id)} as="p" className="standfirst reveal" />
            <div className="secbody">
              {post.body.map((line) => (
                <div key={line.id} className="prose reveal" data-block={line.id}>
                  {line.heading && <h2>{line.heading}</h2>}
                  <Copy slot={c(line.id)} as="p" />
                </div>
              ))}
            </div>
            <p className="backlink"><Link href="/blog">← Back to the workshop journal</Link></p>
          </div>
        </article>
        <EnquiryBand kicker={c('enquiry.kicker')} title={c('enquiry.title')} body={c('enquiry.body')} submit={c('enquiry.submit')} note={c('enquiry.note')} />
      </main>
      <SiteFooter logo={logo} tagline={c('footer.tagline')} social={{ facebook: c('footer.social.facebook'), instagram: c('footer.social.instagram'), linkedin: c('footer.social.linkedin') }} trustpilot={c('footer.trustpilot')} trademark={c('footer.trademark')} />
      <RevealObserver />
    </ConfiguratorProvider>
  )
}
