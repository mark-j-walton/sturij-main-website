// /fixtures-and-fittings — declared in pages/fittings/layout.json; the content is content/sections/fittings.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('fittings')

export default function Page() {
  return <SectionPage id="fittings" />
}
