import type { ElementType } from 'react'
import { sanitizeCopy } from '@/lib/copy'

export interface Slot {
  id: string
  value: string
}

/**
 * A copy slot rendered in place: the element carries data-copy-slot so the reading and the admin editing
 * mode find it. Renders the same on the server and in the browser (no hooks).
 */
export function Copy({ slot, as, className }: { slot: Slot; as?: ElementType; className?: string }) {
  const Tag = (as ?? 'span') as ElementType
  return <Tag className={className} data-copy-slot={slot.id} dangerouslySetInnerHTML={{ __html: sanitizeCopy(slot.value) }} />
}
