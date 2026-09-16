// /blog — declared in pages/blog/layout.json; the posts are content/blog/*.json (lib/blog.ts).
import type { Metadata } from 'next'
import { BlogGrid, blogIndexMetadata } from '@/components/BlogGrid'

export const revalidate = 60
export const metadata: Metadata = blogIndexMetadata()

export default function Page() {
  return <BlogGrid />
}
