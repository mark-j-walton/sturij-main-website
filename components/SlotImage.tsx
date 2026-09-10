import Image from 'next/image'
import type { ImageRef } from '@/lib/slots'

/**
 * An image slot: the asset resolved by id (or the admin's override) rendered through next/image, which
 * derives srcset renditions from the master at request time — the master is never what the page serves.
 * The element carries data-image-slot for the reading and the editing mode, and data-native for the chip.
 */
export function SlotImage({ id, image, priority, sizes, className, fill }: { id: string; image: ImageRef; priority?: boolean; sizes?: string; className?: string; fill?: boolean }) {
  const common = {
    src: image.src,
    alt: image.alt,
    className,
    sizes: sizes ?? '100vw',
    priority: priority ?? false,
    ...(priority ? { fetchPriority: 'high' as const } : {}),
    'data-image-slot': id,
    'data-native': `${image.width}×${image.height}`,
    ...(image.override ? { 'data-override': image.version ?? 'db' } : {}),
  }
  if (fill) return <Image {...common} fill />
  return <Image {...common} width={image.width} height={image.height} />
}
