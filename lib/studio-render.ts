// The Studio's render, from its own origin. The Studio, the Canvas and the Chat (public/studio.js, canvas.js,
// chat.html) were written against the visualiser's endpoint (sturij repo, sturij-visualiser/api/render.js) and
// called it cross-site at sturij.vercel.app. Since 1 Oct 2026 that project sits behind Vercel Authentication,
// so every cross-site call gets a 401 with no CORS headers and the Studio cannot render. This is the same
// contract, served by this project, so the call never leaves studio.sturij.com and carries the password the
// reviewer already entered.
//
// Contract (unchanged for the callers):
//   POST { base: dataURL, prompt: string, requestId: string, swatches?: [{label, image: dataURL}] (<=13 + base = 14),
//          scenario?: string, geminiModel?: string, imageSize?: '1K'|'2K'|'4K' }
//   200  { outputs: [{ model, image, latencyMs, note }], failures: [], totalMs }
//   502  { outputs: [], failures: [{ model, error }], totalMs }
//   4xx/503 { error }
//
// The prompt is used as sent: every caller here sends scenario 'pairing-studio', a complete sectioned prompt of
// its own, which the visualiser also uses verbatim; 'template:<slug>@<version>' prompts are filled by the client
// before sending, so the server never resolves a template. Lab-only 'generate' mode (no frame) is refused, as
// the visualiser refuses it in production.
import { DEFAULT_MODEL, requestImage, type RenderEnv } from '@/lib/render'

export const MODELS = ['gemini-3-pro-image', 'gemini-3-pro-image-preview', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'] as const
export const MAX_IMAGES = 14
export const PROMPT_CAP = 6000
export const LABEL_CAP = 200
const IMAGE_SIZES = ['1K', '2K', '4K'] as const
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/

export interface StudioRenderRequest {
  base: string
  prompt: string
  requestId: string
  swatches: Array<{ label: string; image: string }>
  scenario: string | null
  geminiModel: string | null
  imageSize: (typeof IMAGE_SIZES)[number] | null
}

export type StudioReject = { ok: false; status: number; error: string }

export function validateStudioRender(body: unknown): { ok: true; value: StudioRenderRequest } | StudioReject {
  if (!body || typeof body !== 'object') return { ok: false, status: 400, error: 'the request was not readable' }
  const b = body as Record<string, unknown>
  if (b.mode === 'generate') return { ok: false, status: 403, error: 'generate mode is disabled in production' }
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : ''
  const requestId = typeof b.requestId === 'string' ? b.requestId.trim().slice(0, 120) : ''
  if (typeof b.base !== 'string' || !b.base || !prompt || !requestId) {
    return { ok: false, status: 422, error: 'conditioning frame (base) required — the pipeline never generates from text alone' }
  }
  if (!DATA_URL.test(b.base)) return { ok: false, status: 422, error: 'the conditioning frame must be an image data URL' }
  const raw = Array.isArray(b.swatches) ? b.swatches : []
  const swatches: Array<{ label: string; image: string }> = []
  for (const s of raw.slice(0, MAX_IMAGES - 1)) {
    const sw = (s ?? {}) as Record<string, unknown>
    if (typeof sw.image !== 'string' || !DATA_URL.test(sw.image)) return { ok: false, status: 422, error: 'every reference swatch must be an image data URL' }
    swatches.push({ label: String(sw.label ?? 'Material reference').slice(0, LABEL_CAP), image: sw.image })
  }
  const geminiModel = typeof b.geminiModel === 'string' && (MODELS as readonly string[]).includes(b.geminiModel) ? b.geminiModel : null
  const imageSize = typeof b.imageSize === 'string' && (IMAGE_SIZES as readonly string[]).includes(b.imageSize) ? (b.imageSize as StudioRenderRequest['imageSize']) : null
  return {
    ok: true,
    value: {
      base: b.base,
      prompt: prompt.slice(0, PROMPT_CAP),
      requestId,
      swatches,
      scenario: typeof b.scenario === 'string' ? b.scenario.slice(0, 120) : null,
      geminiModel,
      imageSize,
    },
  }
}

/** The model: the whitelisted pick, else GEMINI_IMAGE_MODEL when it is itself on the whitelist, else the default. */
export function pickModel(r: StudioRenderRequest, env: RenderEnv): string {
  const fromEnv = env.get('GEMINI_IMAGE_MODEL')
  return r.geminiModel || (fromEnv && (MODELS as readonly string[]).includes(fromEnv) ? fromEnv : null) || DEFAULT_MODEL
}

const inline = (dataUrl: string) => {
  const m = DATA_URL.exec(dataUrl)!
  return { inline_data: { mime_type: m[1], data: m[2] } }
}

/** The visualiser's request body: the frame as Image 1, each reference numbered and labelled after it. */
export function studioGeminiBody(r: StudioRenderRequest, env: RenderEnv) {
  const parts: Array<Record<string, unknown>> = [{ text: r.prompt }, { text: 'Image 1 — the scene to edit:' }, inline(r.base)]
  r.swatches.forEach((sw, i) => {
    parts.push({ text: `Image ${i + 2} — ${sw.label}:` })
    parts.push(inline(sw.image))
  })
  return {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: r.imageSize || env.get('GEMINI_IMAGE_SIZE') || '2K' } },
  }
}

export interface StudioRenderResult {
  status: number
  body:
    | { outputs: Array<{ model: string; image: string; latencyMs: number; note: string | null }>; failures: Array<{ model: string; error: string }>; totalMs: number }
    | { error: string }
}

export async function studioRender(r: StudioRenderRequest, env: RenderEnv, fetchFn: typeof fetch = fetch, deadlineMs = 56_000): Promise<StudioRenderResult> {
  const key = env.get('GEMINI_API_KEY')
  if (!key) return { status: 503, body: { error: 'render provider not configured — add GEMINI_API_KEY to the Vercel project env' } }
  const geminiModel = pickModel(r, env)
  const model = 'gemini/' + geminiModel
  const started = Date.now()
  const out = await requestImage(key, geminiModel, JSON.stringify(studioGeminiBody(r, env)), fetchFn, deadlineMs)
  const totalMs = Date.now() - started
  if (out.ok) return { status: 200, body: { outputs: [{ model, image: out.image, latencyMs: totalMs, note: out.note || null }], failures: [], totalMs } }
  return { status: 502, body: { outputs: [], failures: [{ model, error: out.message.slice(0, 300) }], totalMs } }
}

/** Same origin only: this deployment's own host, studio.sturij.com, the project's Vercel URLs, and RENDER_ALLOWED_ORIGINS. */
export function studioOriginOk(req: Request, env: RenderEnv): boolean {
  const host = req.headers.get('host') ?? ''
  const origin = req.headers.get('origin') ?? ''
  const ref = origin || req.headers.get('referer') || ''
  let refUrl: URL
  try { refUrl = new URL(ref) } catch { return false }
  if (refUrl.protocol !== 'https:' && !(refUrl.protocol === 'http:' && (refUrl.hostname === 'localhost' || refUrl.hostname === '127.0.0.1'))) return false
  if (host && refUrl.host === host) return true
  const hosts = new Set(['studio.sturij.com'])
  for (const n of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) { const v = env.get(n); if (v) hosts.add(v) }
  if (hosts.has(refUrl.host) && refUrl.protocol === 'https:') return true
  const allowed = (env.get('RENDER_ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return allowed.includes(refUrl.origin)
}
