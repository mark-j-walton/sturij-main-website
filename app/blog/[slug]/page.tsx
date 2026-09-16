// /blog/<slug> — one post (content/blog/<slug>.json via lib/blog.ts). An unknown slug 404s; a post whose
// claim.blog.<slug> slot carries no real go-live date still renders (BlogPostPage shows it as unpublished
// and noindexes it) so Mark can reach the held claim in admin editing mode and close it.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogPostPage, blogPostMetadata } from '@/components/BlogPost'
import { loadPosts } from '@/lib/blog'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    return await blogPostMetadata(slug)
  } catch {
    return {}
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!loadPosts().some((p) => p.id === slug)) notFound()
  return <BlogPostPage id={slug} />
}
