// The editing mode's refusals: a wrong type or an oversized file is refused with the reason, before any byte
// leaves the browser. The database enforces the same limits again (check constraints on site_image_slots).
export const IMAGE_LIMIT_BYTES = 800 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const IMAGE_MIN_WIDTH = 800

export type FileVerdict = { ok: true; width: number; height: number } | { ok: false; reason: string }

export function checkImageMeta(type: string, size: number, name: string): { ok: true } | { ok: false; reason: string } {
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) return { ok: false, reason: `${name || 'that file'} is ${type || 'an unknown type'} — use JPG, WebP, PNG or AVIF` }
  if (size > IMAGE_LIMIT_BYTES) return { ok: false, reason: `${name || 'that file'} is ${Math.round(size / 1024)} KB — the limit is ${Math.round(IMAGE_LIMIT_BYTES / 1024)} KB; compress it first` }
  if (size === 0) return { ok: false, reason: `${name || 'that file'} is empty` }
  return { ok: true }
}

export async function validateImageFile(file: File): Promise<FileVerdict> {
  const meta = checkImageMeta(file.type, file.size, file.name)
  if (!meta.ok) return meta
  try {
    const bmp = await createImageBitmap(file)
    const { width, height } = bmp
    bmp.close()
    if (width < IMAGE_MIN_WIDTH) return { ok: false, reason: `${file.name} is ${width} px wide — the smallest a slot accepts is ${IMAGE_MIN_WIDTH} px` }
    return { ok: true, width, height }
  } catch {
    return { ok: false, reason: `${file.name} could not be decoded as an image` }
  }
}
