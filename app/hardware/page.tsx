// /hardware — declared in pages/hardware/layout.json; the content is content/sections/hardware.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('hardware')

export default function Page() {
  return <SectionPage id="hardware" />
}
