// The server's checks on an admin's slot upload, before a byte goes to sturij-assets' asset-ingest. The
// browser already refused the wrong type, the oversized file and the narrow image (components/admin/validate.ts);
// the server checks again and does not take the browser's word for the type (the file's own first bytes).
// Pure, so a test reads it; app/api/slots/image/route.ts calls it.
import { checkImageMeta, IMAGE_MIN_WIDTH } from '@/components/admin/validate'
import { IMAGE_SLOTS } from './slots'
import { extOf, ingestBody, slotPath, sniffImage } from './slot-store'

export const MAX_SIDE_PX = 12000

export type SlotUploadVerdict =
  | { ok: true; body: ReturnType<typeof ingestBody> }
  | { ok: false; status: number; error: string }

export function checkSlotUpload(o: { slot: unknown; name: string; type: string; bytes: Uint8Array; width: unknown; height: unknown; now: number }): SlotUploadVerdict {
  if (typeof o.slot !== 'string' || !(o.slot in IMAGE_SLOTS)) return { ok: false, status: 400, error: `${String(o.slot)} is not an image slot this site declares` }
  const meta = checkImageMeta(o.type, o.bytes.length, o.name)
  if (!meta.ok) return { ok: false, status: 400, error: meta.reason }
  const sniffed = sniffImage(o.bytes)
  if (!sniffed || sniffed !== o.type) return { ok: false, status: 400, error: `${o.name || 'that file'} is not the ${o.type} it says it is` }
  const width = Number(o.width), height = Number(o.height)
  if (!Number.isInteger(width) || !Number.isInteger(height) || height < 1 || width > MAX_SIDE_PX || height > MAX_SIDE_PX) return { ok: false, status: 400, error: 'the image dimensions were not readable' }
  if (width < IMAGE_MIN_WIDTH) return { ok: false, status: 400, error: `${o.name} is ${width} px wide — the smallest a slot accepts is ${IMAGE_MIN_WIDTH} px` }
  const ext = extOf(sniffed)!
  const path = slotPath(o.slot, ext, o.now)
  return { ok: true, body: ingestBody({ slotId: o.slot, path, contentBase64: Buffer.from(o.bytes).toString('base64'), mime: sniffed, width, height }) }
}
