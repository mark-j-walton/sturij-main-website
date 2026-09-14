// /lighting-and-services — declared in pages/services/layout.json; the content is content/sections/services.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('services')

export default function Page() {
  return <SectionPage id="services" />
}
