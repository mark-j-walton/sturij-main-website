// /complaints — the record rendered byte-faithful (pages/complaints/layout.json; content/legal/complaints.json).
import type { Metadata } from 'next'
import { LegalPage, legalMetadata } from '@/components/LegalPage'

export const revalidate = 60
export const metadata: Metadata = legalMetadata('complaints')

export default function Page() {
  return <LegalPage id="complaints" />
}
