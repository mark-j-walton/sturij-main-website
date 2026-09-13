// /boards — declared in pages/boards/layout.json; the content is content/sections/boards.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('boards')

export default function Page() {
  return <SectionPage id="boards" />
}
