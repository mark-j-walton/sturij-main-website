// /privacy — the record rendered byte-faithful (pages/privacy/layout.json; content/legal/privacy.json).
import type { Metadata } from 'next'
import { LegalPage, legalMetadata } from '@/components/LegalPage'

export const revalidate = 60
export const metadata: Metadata = legalMetadata('privacy')

export default function Page() {
  return <LegalPage id="privacy" />
}
