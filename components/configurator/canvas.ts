// Browser-side drawing for the configurator: the roundel through the hexagon mask, a tile as a JPEG texture
// for the render prompt, the download composite, and a store-method zip built in the browser (README §5, §6).
import type { Tile } from '@/lib/galleries'

export const ROUNDEL_MASK = '/brand/sturij-mark-white.png'
export const POLY: Record<'handle' | 'doors' | 'carcass', Array<[number, number]>> = {
  handle: [[0, 0], [100, 0], [100, 40.7], [0, 2.4]],
  doors: [[0, 2.4], [77.5, 32.1], [14.6, 100], [0, 100]],
  carcass: [[77.5, 32.1], [100, 40.7], [100, 100], [14.6, 100]],
}

export const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src })

export function tileBackground(t: Tile): string {
  return t.src ? `url('${t.src}') center/cover no-repeat` : `linear-gradient(165deg, ${t.gradient?.[0]}, ${t.gradient?.[1]})`
}

async function paintTile(ctx: CanvasRenderingContext2D, t: Tile, W: number, H: number) {
  if (t.src) {
    const img = await loadImg(t.src)
    const s = Math.max(W / img.width, H / img.height)
    ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, t.gradient?.[0] ?? '#888888') // token-audit:allow — a tile's own colour, not a design token
    g.addColorStop(1, t.gradient?.[1] ?? '#666666') // token-audit:allow
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
}

async function paintPoly(ctx: CanvasRenderingContext2D, poly: Array<[number, number]>, t: Tile, W: number) {
  ctx.save()
  ctx.beginPath()
  poly.forEach(([x, y], i) => (i ? ctx.lineTo((x * W) / 100, (y * W) / 100) : ctx.moveTo((x * W) / 100, (y * W) / 100)))
  ctx.closePath()
  ctx.clip()
  await paintTile(ctx, t, W, W)
  ctx.restore()
}

export interface Picks { doors: Tile | null; carcass: Tile | null; handle: Tile | null }
export type CompletePicks = { doors: Tile; carcass: Tile; handle: Tile }

/** The roundel: the three facets painted in their measured polygons, cut by the hexagon mask. */
export async function drawRoundel(W: number, p: CompletePicks): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas')
  cv.width = cv.height = W
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D
  await paintPoly(ctx, POLY.doors, p.doors, W)
  await paintPoly(ctx, POLY.carcass, p.carcass, W)
  await paintPoly(ctx, POLY.handle, p.handle, W)
  const mask = await loadImg(ROUNDEL_MASK)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(mask, 0, 0, W, W)
  ctx.globalCompositeOperation = 'source-over'
  return cv
}

/** A tile as a 256px JPEG (base64, no prefix) — one of the render declaration's texture channels. */
export async function tileTexture(t: Tile): Promise<string> {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d') as CanvasRenderingContext2D
  await paintTile(x, t, 256, 256)
  return c.toDataURL('image/jpeg', 0.85).split(',')[1] as string
}

/** The download composite: the visual, the roundel badge bottom-right, a charcoal strip carrying the spec and the VISUALISATION label. */
export async function composeDownload(src: string, thumb: string, strip: string, colours: { strip: string; ink: string }): Promise<Blob> {
  const img = await loadImg(src)
  const W = Math.min(1400, img.width), H = Math.round((W * img.height) / img.width)
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H + 84
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = colours.strip
  ctx.fillRect(0, 0, W, H + 84)
  ctx.drawImage(img, 0, 0, W, H)
  const r = await loadImg(thumb), S = 150
  ctx.drawImage(r, W - S - 22, H - S - 22, S, S)
  ctx.fillStyle = colours.ink
  ctx.font = '600 16px monospace'
  ctx.fillText(strip.toUpperCase().slice(0, 140), 24, H + 50)
  return new Promise((res) => cv.toBlob((b) => res(b as Blob), 'image/png'))
}

// --- a minimal zip (store method) ---
const crcT = (() => { const t: number[] = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
export const crc32 = (u: Uint8Array) => { let c = -1; for (let i = 0; i < u.length; i++) c = (crcT[(c ^ (u[i] as number)) & 255] as number) ^ (c >>> 8); return (c ^ -1) >>> 0 }

export function makeZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const enc = new TextEncoder(), parts: BlobPart[] = [], cd: BlobPart[] = []
  let off = 0
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length
    const lh = new DataView(new ArrayBuffer(30))
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true)
    parts.push(new Uint8Array(lh.buffer), nm, f.data as BlobPart)
    const ch = new DataView(new ArrayBuffer(46))
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true)
    cd.push(new Uint8Array(ch.buffer), nm)
    off += 30 + nm.length + sz
  }
  let cdLen = 0
  cd.forEach((p) => (cdLen += (p as Uint8Array).length))
  const e = new DataView(new ArrayBuffer(22))
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdLen, true); e.setUint32(16, off, true)
  return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], { type: 'application/zip' })
}

export const blobBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer())

export function saveBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = u
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(u), 4000)
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
