// /worktops — declared in pages/worktops/layout.json; the content is content/sections/worktops.json (the copy family, part as data).
import type { Metadata } from 'next'
import { SectionPage, sectionMetadata } from '@/components/SectionPage'

export const revalidate = 60
export const metadata: Metadata = sectionMetadata('worktops')

export default function Page() {
  return <SectionPage id="worktops" />
}
