// /terms — the record rendered byte-faithful (pages/terms/layout.json; content/legal/terms.json).
import type { Metadata } from 'next'
import { LegalPage, legalMetadata } from '@/components/LegalPage'

export const revalidate = 60
export const metadata: Metadata = legalMetadata('terms')

export default function Page() {
  return <LegalPage id="terms" />
}
