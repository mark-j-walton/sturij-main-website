// /how-we-price — declared in pages/pricing/layout.json; the content is content/sections/pricing.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('pricing')

export default function Page() {
  return <SectionPage id="pricing" />
}
