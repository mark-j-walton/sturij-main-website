// The doors: the enquiry post and its fallback; the render route's validation, prompt, rate limit,
// retry, labelling and distinct errors; the copy sanitiser; the editing mode's refusals; the migration's shape.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { composeMessage, DEFAULT_ENQUIRY_FUNCTION_URL, postEnquiry, toFunctionPayload, validateEnquiry } from '@/lib/enquiry'
import { POST as enquiryRoute } from '@/app/api/enquiry/route'
import { composePrompt, extractImage, generate, RateLimiter, validateRenderRequest, VISUALISATION } from '@/lib/render'
import { copyText, sanitizeCopy } from '@/lib/copy'
import { checkImageMeta, IMAGE_LIMIT_BYTES } from '@/components/admin/validate'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const b64 = Buffer.from('jpeg-bytes-of-a-swatch').toString('base64')
const textures: [string, string, string] = [b64, b64, b64]

describe('the enquiry — sturij-web\'s customer table through the site route', () => {
  it('requires a name and a valid email (the function\'s contract)', () => {
    expect(validateEnquiry({ name: '', email: 'x@y.z' })).toMatchObject({ ok: false })
    expect(validateEnquiry({ name: 'Sam', email: 'not-an-email' })).toMatchObject({ ok: false })
    expect(validateEnquiry({ name: 'Sam', email: 'sam@example.com' })).toMatchObject({ ok: true })
  })
  it('carries the visitor\'s swatch and visualised room inside the message, labelled as data', () => {
    const v = validateEnquiry({ name: 'Sam', email: 'sam@example.com', notes: 'Alcove 2.4m', finishes: 'Bookmatch Oak · Reed Green · Satin Brass', visualisedRoom: 'Bedroom', room: 'Bedroom alcove' })
    if (!v.ok) throw new Error(v.error)
    const msg = composeMessage(v.value)
    expect(msg).toContain('Alcove 2.4m')
    expect(msg).toContain('Finishes composed on sturij.com: Bookmatch Oak · Reed Green · Satin Brass')
    expect(msg).toContain('Visualised as: Bedroom (a generated visualisation, not a photograph)')
    const payload = toFunctionPayload(v.value)
    expect(payload.project).toBe('Bedroom alcove')
    expect(payload.source).toBe('sturij.com')
  })
  it('returns the row id and the notification outcome when the function accepts', async () => {
    const fetchFn = vi.fn(async () => json({ ok: true, id: 'row-1', notified: { sent: true, id: 'msg-1' } }))
    const out = await postEnquiry({ name: 'Sam', email: 's@e.com', phone: '', postcode: '', project: '', message: '', website: '', source: 'sturij.com', page: '' }, DEFAULT_ENQUIRY_FUNCTION_URL, fetchFn as unknown as typeof fetch)
    expect(out).toMatchObject({ ok: true, id: 'row-1', notified: { sent: true, id: 'msg-1' } })
    expect(fetchFn).toHaveBeenCalledWith(DEFAULT_ENQUIRY_FUNCTION_URL, expect.objectContaining({ method: 'POST' }))
  })
  it('never loses an enquiry silently: a 500 and an unreachable service both return the phone and the mailbox', async () => {
    const failing = vi.fn(async () => json({ error: 'Could not record the enquiry' }, 500))
    const out = await postEnquiry({ name: 'Sam', email: 's@e.com', phone: '', postcode: '', project: '', message: '', website: '', source: 'sturij.com', page: '' }, DEFAULT_ENQUIRY_FUNCTION_URL, failing as unknown as typeof fetch)
    expect(out).toMatchObject({ ok: false, status: 502, fallback: { phone: '01937 326011', email: 'contact@sturij.com' } })
    const down = vi.fn(async () => { throw new TypeError('fetch failed') })
    const out2 = await postEnquiry({ name: 'Sam', email: 's@e.com', phone: '', postcode: '', project: '', message: '', website: '', source: 'sturij.com', page: '' }, DEFAULT_ENQUIRY_FUNCTION_URL, down as unknown as typeof fetch)
    expect(out2).toMatchObject({ ok: false, error: 'The enquiry service could not be reached' })
  })
  it('the route answers a honeypot as accepted without calling the function, and refuses a missing email with 400', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const r1 = await enquiryRoute(new Request('http://x/api/enquiry', { method: 'POST', body: JSON.stringify({ name: 'Bot', email: 'b@b.b', website: 'http://spam' }) }))
    expect(r1.status).toBe(200)
    expect(await r1.json()).toMatchObject({ ok: true, id: 'declined' })
    expect(spy).not.toHaveBeenCalled()
    const r2 = await enquiryRoute(new Request('http://x/api/enquiry', { method: 'POST', body: JSON.stringify({ name: 'Sam' }) }))
    expect(r2.status).toBe(400)
    expect(await r2.json()).toMatchObject({ ok: false, fallback: { email: 'contact@sturij.com' } })
    spy.mockRestore()
  })
})

describe('the render — server-side, labelled, limited', () => {
  const req = { room: 'Bedroom', picks: { doors: 'Bookmatch Oak', carcass: 'Reed Green', handle: 'Satin Brass' }, codes: { doors: 'H1316', carcass: 'U604' }, roomFinishes: { ceiling: 'Pure White', walls: 'Sage Green', skirting: 'Oak', flooring: 'Oak Plank' }, textures }
  it('validates the four channels: a page room, three names, three small JPEG textures', () => {
    expect(validateRenderRequest(req)).toMatchObject({ ok: true })
    expect(validateRenderRequest({ ...req, room: 'Garage' })).toMatchObject({ ok: false, code: 'E_BAD_REQUEST' })
    expect(validateRenderRequest({ ...req, textures: [b64, b64] })).toMatchObject({ ok: false, code: 'E_BAD_REQUEST' })
    expect(validateRenderRequest({ ...req, textures: ['not base64!!', b64, b64] })).toMatchObject({ ok: false, code: 'E_BAD_REQUEST' })
  })
  it('composes the prompt as the handoff does, with the registry code beside a decor and no-text rule', () => {
    const v = validateRenderRequest(req)
    if (!v.ok) throw new Error(v.message)
    const p = composePrompt(v.value)
    expect(p).toContain('a bedroom in a UK home')
    expect(p).toContain('doors: Bookmatch Oak (Egger H1316)')
    expect(p).toContain('carcass and interior: Reed Green (Egger U604)')
    expect(p).toContain('flooring: Oak Plank')
    expect(p).toContain('no text or watermarks')
  })
  it('refuses without the key as E_NOT_CONFIGURED and never calls the model', async () => {
    const fetchFn = vi.fn()
    const v = validateRenderRequest(req); if (!v.ok) throw new Error()
    expect(await generate(v.value, { get: () => undefined }, fetchFn as unknown as typeof fetch)).toMatchObject({ ok: false, code: 'E_NOT_CONFIGURED' })
    expect(fetchFn).not.toHaveBeenCalled()
  })
  it('labels every image VISUALISATION, retries once, and keeps the distinct errors', async () => {
    const v = validateRenderRequest(req); if (!v.ok) throw new Error()
    const env = { get: (n: string) => (n === 'GEMINI_API_KEY' ? 'test-key' : undefined) }
    const good = json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }] })
    const ok = vi.fn(async () => good.clone())
    const r1 = await generate(v.value, env, ok as unknown as typeof fetch)
    expect(r1).toMatchObject({ ok: true, label: VISUALISATION, image: 'data:image/png;base64,AAAA', model: 'gemini-3.1-flash-image' })
    expect((ok.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ 'x-goog-api-key': 'test-key' })
    const flaky = vi.fn().mockResolvedValueOnce(json({ error: 'busy' }, 503)).mockResolvedValueOnce(good.clone())
    expect(await generate(v.value, env, flaky as unknown as typeof fetch)).toMatchObject({ ok: true })
    expect(flaky).toHaveBeenCalledTimes(2)
    const empty = vi.fn(async () => json({ candidates: [{ content: { parts: [{ text: 'cannot' }] } }] }))
    expect(await generate(v.value, env, empty as unknown as typeof fetch)).toMatchObject({ ok: false, code: 'E_NO_IMAGE' })
    const limited = vi.fn(async () => json({}, 429))
    expect(await generate(v.value, env, limited as unknown as typeof fetch)).toMatchObject({ ok: false, code: 'E_RATE_LIMIT' })
    expect(extractImage({})).toBeNull()
  })
  it('limits per visitor per hour and the site per day', () => {
    let t = 0
    const lim = new RateLimiter(2, 3, () => t)
    expect(lim.check('a')).toMatchObject({ ok: true })
    expect(lim.check('a')).toMatchObject({ ok: true })
    expect(lim.check('a')).toMatchObject({ ok: false, code: 'E_RATE_LIMIT' })
    expect(lim.check('b')).toMatchObject({ ok: true })
    expect(lim.check('c')).toMatchObject({ ok: false, code: 'E_RATE_LIMIT' })
    t = 3_600_001
    expect(lim.check('a')).toMatchObject({ ok: false }) // the day is still full
    t = 86_400_001
    expect(lim.check('a')).toMatchObject({ ok: true })
  })
})

describe('copy slots — free text with a small allowance', () => {
  it('keeps br, em, strong and the two spans; strips everything else including event handlers', () => {
    expect(sanitizeCopy('Built to your walls.<br>Not to a range.')).toBe('Built to your walls.<br>Not to a range.')
    expect(sanitizeCopy('One product. <span class="claret">Three thousand ways.</span>')).toBe('One product. <span class="claret">Three thousand ways.</span>')
    expect(sanitizeCopy('<img src=x onerror=alert(1)>hi<script>alert(1)</script>')).toBe('hi')
    expect(sanitizeCopy('<span class="evil" onclick="x()">t</span>')).toBe('t')
    expect(sanitizeCopy('<a href="javascript:alert(1)">link</a>')).toBe('link')
  })
  it('closes the mutation door: a tag split by a stripped tag does not re-form, and a stray < is text', () => {
    for (const evil of ['<scr<script>ipt>alert(1)</scr<script>ipt>', '<<script>script>alert(1)<</script>/script>', '<img/src=x onerror=alert(1)//>', '<svg><script>alert(1)</script></svg>']) {
      const out = sanitizeCopy(evil)
      expect(out, evil).not.toMatch(/<[a-zA-Z/]/)
    }
    expect(sanitizeCopy('2400 <br> 1500 and a < b')).toBe('2400 <br> 1500 and a &lt; b')
  })
  it('gives the plain text for the reading', () => {
    expect(copyText('Wardrobes &amp; bedrooms<br>x')).toBe('Wardrobes & bedrooms\nx')
  })
})

describe('the editing mode\'s refusals and the migration\'s shape', () => {
  it('refuses a wrong type and an oversized file with the reason', () => {
    expect(checkImageMeta('image/gif', 1000, 'a.gif')).toMatchObject({ ok: false, reason: expect.stringContaining('use JPG, WebP, PNG or AVIF') })
    expect(checkImageMeta('image/jpeg', IMAGE_LIMIT_BYTES + 1, 'big.jpg')).toMatchObject({ ok: false, reason: expect.stringContaining('the limit is 800 KB') })
    expect(checkImageMeta('image/webp', 100, 'ok.webp')).toEqual({ ok: true })
  })
  it('the migration is append-only with RLS, an admin gate, database-assigned versions, an audit trigger and the bucket', () => {
    const sql = readFileSync('supabase/migrations/20260910150000_site_slots.sql', 'utf8')
    for (const t of ['site_admin', 'site_content_slots', 'site_image_slots', 'site_slot_audit']) expect(sql).toContain(`alter table public.${t} enable row level security`)
    expect(sql).not.toMatch(/for (update|delete)/i)
    expect(sql).toMatch(/create trigger site_content_slots_version before insert/)
    expect(sql).toMatch(/create trigger site_image_slots_audit after insert/)
    expect(sql).toContain("insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)")
    expect(sql).toContain('public.site_is_admin()')
    expect(sql).toContain('bytes between 1 and 819200')
  })
})
