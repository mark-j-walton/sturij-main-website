// /handles — declared in pages/handles/layout.json; the content is content/sections/handles.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('handles')

export default function Page() {
  return <SectionPage id="handles" />
}
