// The render, server-side: the four channels of the render declaration — the room, the materials by name
// (and code where the registry has one), the room finishes, and the three swatch textures as inline parts
// — composed into the prompt the handoff wrote, sent to Gemini's image model with the key from the vault
// by name (GEMINI_API_KEY, the estate's name), one retry, the distinct errors kept. Every image that comes
// back is a VISUALISATION and is labelled so in the reply.
import roomsData from '@/data/rooms.json'

export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
export const DEFAULT_MODEL = 'gemini-3.1-flash-image'
export const VISUALISATION = 'VISUALISATION'
export const TEXTURE_LIMIT_BYTES = 300 * 1024
const ROOM_LABELS = new Set((roomsData.rooms as Array<{ label: string }>).map((r) => r.label))

export interface RenderRequest {
  room: string
  picks: { doors: string; carcass: string; handle: string }
  codes?: { doors?: string | null; carcass?: string | null }
  roomFinishes?: Partial<Record<'ceiling' | 'walls' | 'skirting' | 'flooring', string | null>>
  textures: [string, string, string]
}

export type RenderError = { ok: false; code: 'E_BAD_REQUEST' | 'E_NOT_CONFIGURED' | 'E_RATE_LIMIT' | 'E_NO_IMAGE' | 'E_UPSTREAM' | 'E_FORBIDDEN'; message: string }
export type RenderOk = { ok: true; image: string; label: typeof VISUALISATION; model: string }

const name = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const b64 = /^[A-Za-z0-9+/]+={0,2}$/

export function validateRenderRequest(body: unknown): { ok: true; value: RenderRequest } | RenderError {
  if (!body || typeof body !== 'object') return { ok: false, code: 'E_BAD_REQUEST', message: 'The request was not readable' }
  const b = body as Record<string, unknown>
  const room = name(b.room, 40)
  if (!room || !ROOM_LABELS.has(room)) return { ok: false, code: 'E_BAD_REQUEST', message: 'The room is not one the page offers' }
  const p = (b.picks ?? {}) as Record<string, unknown>
  const doors = name(p.doors), carcass = name(p.carcass), handle = name(p.handle)
  if (!doors || !carcass || !handle) return { ok: false, code: 'E_BAD_REQUEST', message: 'A swatch needs doors, carcass and handle' }
  const textures = Array.isArray(b.textures) ? (b.textures as unknown[]) : []
  if (textures.length !== 3 || !textures.every((t) => typeof t === 'string' && t.length > 0 && t.length <= TEXTURE_LIMIT_BYTES * 1.37 && b64.test(t))) {
    return { ok: false, code: 'E_BAD_REQUEST', message: 'Three swatch textures are required, each a small JPEG' }
  }
  const codes = (b.codes ?? {}) as Record<string, unknown>
  const rf = (b.roomFinishes ?? {}) as Record<string, unknown>
  return {
    ok: true,
    value: {
      room,
      picks: { doors, carcass, handle },
      codes: { doors: name(codes.doors, 20), carcass: name(codes.carcass, 20) },
      roomFinishes: { ceiling: name(rf.ceiling), walls: name(rf.walls), skirting: name(rf.skirting), flooring: name(rf.flooring) },
      textures: textures as [string, string, string],
    },
  }
}

/** The prompt as the handoff composes it (README §6), with the code beside a decor where the registry has one. */
export function composePrompt(r: RenderRequest): string {
  const withCode = (n: string, c?: string | null) => (c ? `${n} (Egger ${c})` : n)
  const spec = `doors: ${withCode(r.picks.doors, r.codes?.doors)}, carcass and interior: ${withCode(r.picks.carcass, r.codes?.carcass)}, handles: ${r.picks.handle}`
  const f = r.roomFinishes ?? {}
  const roomSpec = f.flooring ? `; room finishes — ceiling: ${f.ceiling ?? 'white'}, walls: ${f.walls ?? 'warm white'}, skirting: ${f.skirting ?? 'white'}, flooring: ${f.flooring}` : ''
  return `Photorealistic interior photograph of a ${r.room.toLowerCase()} in a UK home with bespoke fitted furniture made by a joinery workshop. Materials — ${spec}${roomSpec}. The first attached texture is the door finish, the second the carcass finish, the third the handle metal finish; apply them faithfully to the fitted furniture. Warm natural light, realistic proportions, no people, no text or watermarks. Landscape 4:3.`
}

export function geminiBody(prompt: string, textures: [string, string, string]) {
  return {
    contents: [{ parts: [{ text: prompt }, ...textures.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } }))] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  }
}

/** The image part of a generateContent reply as a data URL, or null when the model returned none. */
export function extractImage(json: unknown): string | null {
  const parts = ((((json as { candidates?: Array<{ content?: { parts?: unknown[] } }> })?.candidates ?? [])[0]?.content?.parts) ?? []) as Array<Record<string, unknown>>
  for (const p of parts) {
    const d = (p.inlineData ?? p.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined
    if (d?.data) return `data:${d.mimeType ?? d.mime_type ?? 'image/png'};base64,${d.data}`
  }
  return null
}

/** Best-effort limits in the isolate's memory (the estate's note-add pattern): per visitor per hour and for the site per day. */
export class RateLimiter {
  private visitors = new Map<string, number[]>()
  private day: number[] = []
  constructor(private perVisitorHour: number, private perDay: number, private now: () => number = Date.now) {}
  check(visitor: string): { ok: true } | RenderError {
    const t = this.now()
    const hour = (this.visitors.get(visitor) ?? []).filter((x) => t - x < 3_600_000)
    this.day = this.day.filter((x) => t - x < 86_400_000)
    if (hour.length >= this.perVisitorHour) { this.visitors.set(visitor, hour); return { ok: false, code: 'E_RATE_LIMIT', message: 'This visitor has made enough visuals for the hour' } }
    if (this.day.length >= this.perDay) return { ok: false, code: 'E_RATE_LIMIT', message: 'The site has made enough visuals for today' }
    hour.push(t); this.visitors.set(visitor, hour); this.day.push(t)
    return { ok: true }
  }
}

export interface RenderEnv { get(name: string): string | undefined }

/** One call, one retry; the distinct errors kept. */
export async function generate(r: RenderRequest, env: RenderEnv, fetchFn: typeof fetch = fetch, deadlineMs = 50_000): Promise<RenderOk | RenderError> {
  const key = env.get('GEMINI_API_KEY')
  if (!key) return { ok: false, code: 'E_NOT_CONFIGURED', message: 'The render key is not present on this deployment (GEMINI_API_KEY from the vault)' }
  const model = env.get('GEMINI_IMAGE_MODEL') || DEFAULT_MODEL
  const body = JSON.stringify(geminiBody(composePrompt(r), r.textures))
  const started = Date.now()
  let last: RenderError = { ok: false, code: 'E_UPSTREAM', message: 'Generation failed' }
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((res) => setTimeout(res, 1200))
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), Math.max(1000, deadlineMs - (Date.now() - started)))
    try {
      const res = await fetchFn(`${GEMINI_ENDPOINT}/${model}:generateContent`, { method: 'POST', signal: ctrl.signal, headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body })
      clearTimeout(t)
      if (res.status === 429) { last = { ok: false, code: 'E_RATE_LIMIT', message: 'The image service is rate-limiting' }; continue }
      if (!res.ok) { last = { ok: false, code: 'E_UPSTREAM', message: `The image service answered ${res.status}` }; if (res.status >= 400 && res.status < 500 && res.status !== 408) break; continue }
      const json = await res.json().catch(() => null)
      const image = extractImage(json)
      if (!image) { last = { ok: false, code: 'E_NO_IMAGE', message: 'No image came back' }; continue }
      return { ok: true, image, label: VISUALISATION, model }
    } catch {
      clearTimeout(t)
      last = { ok: false, code: 'E_UPSTREAM', message: 'The image service could not be reached' }
    }
  }
  return last
}
