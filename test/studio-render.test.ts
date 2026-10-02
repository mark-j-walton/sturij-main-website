// The Studio renders from its own origin (since 1 Oct 2026 the visualiser at sturij.vercel.app answers every
// cross-site call with a 401, so the Studio's render failed for everyone). app/api/studio-render serves the
// visualiser's own contract (sturij-visualiser/api/render.js): same origin only, the frame required, the
// prompt and image count capped, the model whitelisted, Gemini called with the key by name. Gemini is mocked.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/studio-render/route'
import { MAX_IMAGES, PROMPT_CAP, studioGeminiBody, studioOriginOk, validateStudioRender } from '@/lib/studio-render'

const PX = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=='
const VALID = { base: PX, prompt: 'CONTEXT\nA kitchen.', requestId: 'studio-1', swatches: [{ label: 'Walls — paint', image: PX }], scenario: 'pairing-studio' }
const env = (vars: Record<string, string> = {}) => ({ get: (n: string) => vars[n] })

function req(body: unknown, headers: Record<string, string> = { host: 'studio.sturij.com', origin: 'https://studio.sturij.com' }) {
  return new Request('https://studio.sturij.com/api/studio-render', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
}
const geminiOk = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'done' }, { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } }] } }] }), { status: 200 })

describe('the route answers only its own origin', () => {
  it('accepts studio.sturij.com calling itself', () => {
    expect(studioOriginOk(req(VALID), env())).toBe(true)
  })
  it("accepts the project's own deployment URL calling itself", () => {
    expect(studioOriginOk(req(VALID, { host: 'sturij-main-website-abc.vercel.app', origin: 'https://sturij-main-website-abc.vercel.app' }), env())).toBe(true)
  })
  it('falls back to the Referer when a browser omits Origin on a same-origin POST', () => {
    expect(studioOriginOk(req(VALID, { host: 'studio.sturij.com', referer: 'https://studio.sturij.com/studio' }), env())).toBe(true)
  })
  it('rejects a foreign origin with 403', async () => {
    const res = await POST(req(VALID, { host: 'studio.sturij.com', origin: 'https://evil.example' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'forbidden' })
  })
  it('rejects a call with neither Origin nor Referer (a bare curl)', async () => {
    const res = await POST(req(VALID, { host: 'studio.sturij.com' }))
    expect(res.status).toBe(403)
  })
})

describe('the visualiser contract: frame required, caps enforced', () => {
  it('refuses a render without a conditioning frame (422)', () => {
    const v = validateStudioRender({ ...VALID, base: undefined })
    expect(v).toMatchObject({ ok: false, status: 422 })
  })
  it('refuses a frame that is not an image data URL', () => {
    expect(validateStudioRender({ ...VALID, base: 'https://example.com/a.jpg' })).toMatchObject({ ok: false, status: 422 })
  })
  it('refuses Lab-only generate mode, as the visualiser does in production', () => {
    expect(validateStudioRender({ ...VALID, mode: 'generate' })).toMatchObject({ ok: false, status: 403 })
  })
  it('caps the prompt and keeps at most 14 images, the frame counting as one', () => {
    const v = validateStudioRender({ ...VALID, prompt: 'x'.repeat(PROMPT_CAP + 500), swatches: Array.from({ length: 20 }, (_, i) => ({ label: 'S' + i, image: PX })) })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.prompt.length).toBe(PROMPT_CAP)
    expect(v.value.swatches.length).toBe(MAX_IMAGES - 1)
    const parts = studioGeminiBody(v.value, env()).contents[0]!.parts as Array<Record<string, unknown>>
    expect(parts.filter((p) => 'inline_data' in p).length).toBe(MAX_IMAGES)
  })
  it('whitelists the model, with gemini-3.1-flash-image as the default', () => {
    const v = validateStudioRender({ ...VALID, geminiModel: 'some-other-model' })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.geminiModel).toBeNull()
    const p = validateStudioRender({ ...VALID, geminiModel: 'gemini-3-pro-image' })
    if (!p.ok) throw new Error(p.error)
    expect(p.value.geminiModel).toBe('gemini-3-pro-image')
  })
})

describe('the reply has the shape the Studio, Canvas and Chat read', () => {
  const saved = { ...process.env }
  beforeEach(() => { process.env.GEMINI_API_KEY = 'test-value-not-a-key'; delete process.env.GEMINI_IMAGE_MODEL })
  afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals() })

  it('200 { outputs: [{ model, image, latencyMs, note }], failures: [], totalMs }, the key sent by header only', async () => {
    const fetchMock = vi.fn(async () => geminiOk())
    vi.stubGlobal('fetch', fetchMock)
    const res = await POST(req(VALID))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.outputs).toHaveLength(1)
    expect(j.outputs[0]).toMatchObject({ model: 'gemini/gemini-3.1-flash-image', image: 'data:image/png;base64,iVBORw0KGgo=', note: 'done' })
    expect(typeof j.outputs[0].latencyMs).toBe('number')
    expect(j.failures).toEqual([])
    expect(typeof j.totalMs).toBe('number')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-value-not-a-key')
    expect(url).not.toContain('test-value-not-a-key')
    const sent = JSON.parse(String(init.body))
    expect(sent.contents[0].parts[0].text).toBe(VALID.prompt) // pairing-studio prompts travel verbatim
    expect(sent.contents[0].parts[1].text).toBe('Image 1 — the scene to edit:')
    expect(sent.contents[0].parts[3].text).toBe('Image 2 — Walls — paint:')
  })

  it('502 { outputs: [], failures: [{ model, error }] } when the model returns no image', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'cannot' }] } }] }), { status: 200 })))
    const res = await POST(req(VALID))
    expect(res.status).toBe(502)
    const j = await res.json()
    expect(j.outputs).toEqual([])
    expect(j.failures[0].model).toBe('gemini/gemini-3.1-flash-image')
    expect(j.failures[0].error).toContain('No image came back')
  })

  it('503 { error } when the key is not on the deployment', async () => {
    delete process.env.GEMINI_API_KEY
    const res = await POST(req(VALID))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toContain('GEMINI_API_KEY')
  })

  it('422 { error } — the message the Studio shows — when the frame is missing', async () => {
    const res = await POST(req({ prompt: 'p', requestId: 'chat-1', scenario: 'pairing-studio' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toContain('conditioning frame')
  })
})

describe('the pages call the same-origin route', () => {
  const studio = readFileSync('public/studio.js', 'utf8')
  const canvas = readFileSync('public/canvas.js', 'utf8')
  const chat = readFileSync('public/chat.html', 'utf8')

  it('studio.js, canvas.js and chat.html post to /api/studio-render, relative', () => {
    expect(studio).toContain("var RENDER_ENDPOINT='/api/studio-render';")
    expect(canvas).toContain("var RENDER_ENDPOINT='/api/studio-render';")
    expect(chat).toContain("fetch('/api/studio-render',")
  })
  it('no page calls the walled visualiser render endpoint any more', () => {
    for (const src of [studio, canvas, chat]) expect(src).not.toContain('sturij.vercel.app/api/render')
  })
  it('no page carries the key or the model endpoint', () => {
    for (const src of [studio, canvas, chat]) {
      expect(src).not.toContain('GEMINI_API_KEY')
      expect(src).not.toContain('generativelanguage.googleapis.com')
      expect(src).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/)
    }
  })
  it("the visualiser's frame and Canvas's open-in-visualiser say plainly that it is unreachable, instead of a broken frame", () => {
    expect(studio).toContain('var VISUALISER_AVAILABLE=false;')
    expect(studio).toContain('The visualiser cannot open inside the Studio at the moment.')
    expect(canvas).toContain('var VISUALISER_AVAILABLE=false;')
    expect(canvas).toMatch(/if\(!VISUALISER_AVAILABLE\)\{toast\('The visualiser is not reachable/)
  })
})
