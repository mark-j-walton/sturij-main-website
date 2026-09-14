// The enquiry: validated here, then posted to sturij-web's enquiry function — the customer table's front
// door (public.enquiry; the function's contract read 10 Sep 2026: name, email required; phone, postcode,
// project, message, website honeypot, source, page). The visitor's composed swatch and visualised room
// travel inside the message text: the function has no column for them, and the function's contract is not
// this repository's to change — a finding for the enquiry type (form-surface §5.1).
//
// SWATCHES AND BAND (11 Sep 2026, 4edd148f): the function gained `swatches` and `band` columns and
// validation (sturij PR #63) — every swatch the visitor kept for this enquiry now travels by reference
// (doors decor id and code, carcass id, handle finish id — never a name; the function resolves names from
// the registry for the team email), and the calculator's guide travels as {from, to, currency,
// tableVersion}. The free-text `finishes`/`guide` fields still travel too, for the message's human-reading
// summary — the structured fields are additive, not a replacement.
import { CONTACT } from './contact'

export const DEFAULT_ENQUIRY_FUNCTION_URL = 'https://bcpmgpktmuaicjessseg.supabase.co/functions/v1/enquiry'
export const ENQUIRY_SOURCE = 'sturij.com'

/** One swatch, by reference only — exactly the shape the function validates (sturij: supabase/functions/enquiry/swatches.ts). */
export interface SwatchRef { doorsDecorId: string; doorsDecorCode: string; carcassId: string; handleFinishId: string }
/** The calculator's guide at enquiry time — a band, never the priced job. */
export interface BandRef { from: number; to: number; currency: string; tableVersion: number | string | null }

export interface EnquiryInput {
  name: string
  email: string
  phone?: string | null
  postcode?: string | null
  room?: string | null
  notes?: string | null
  website?: string | null
  finishes?: string | null
  visualisedRoom?: string | null
  /** The calculator's guide line — configuration, width, tier and the band (never a single figure). */
  guide?: string | null
  page?: string | null
  /** At most four (the collector's own limit); a malformed entry is dropped, not refused — this is our own
   * client's data, not raw user text, so the honest response to a shape we didn't expect is to omit it. */
  swatches?: SwatchRef[] | null
  band?: BandRef | null
}

const STRING_FIELDS = ['name', 'email', 'phone', 'postcode', 'room', 'notes', 'website', 'finishes', 'visualisedRoom', 'guide', 'page'] as const
type StringField = (typeof STRING_FIELDS)[number]

/** The enquiry after validation: every text field a string (empty when absent), plus the structured swatches and band. */
export type EnquiryValue = { [K in StringField]: string } & { swatches: SwatchRef[]; band: BandRef | null }
export type Validated = { ok: true; value: EnquiryValue } | { ok: false; error: string }

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const cleanId = (v: unknown, max = 80): string | null => { const s = clean(v, max); return s || null }

/** Structural only — the same shape the function itself validates; a bad entry is dropped, not refused,
 * because this is our own client's data. At most four, matching the collector's MAX_SWATCHES. */
function cleanSwatches(v: unknown): SwatchRef[] {
  if (!Array.isArray(v)) return []
  const out: SwatchRef[] = []
  for (const raw of v.slice(0, 4)) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const doorsDecorId = cleanId(r.doorsDecorId)
    const doorsDecorCode = cleanId(r.doorsDecorCode, 40)
    const carcassId = cleanId(r.carcassId)
    const handleFinishId = cleanId(r.handleFinishId)
    if (doorsDecorId && doorsDecorCode && carcassId && handleFinishId) out.push({ doorsDecorId, doorsDecorCode, carcassId, handleFinishId })
  }
  return out
}

function cleanBand(v: unknown): BandRef | null {
  if (!v || typeof v !== 'object') return null
  const b = v as Record<string, unknown>
  const from = typeof b.from === 'number' ? b.from : null
  const to = typeof b.to === 'number' ? b.to : null
  if (from === null || to === null || from > to) return null
  const currency = typeof b.currency === 'string' ? b.currency.slice(0, 8) : 'GBP'
  const tableVersion = typeof b.tableVersion === 'number' || typeof b.tableVersion === 'string' ? b.tableVersion : null
  return { from, to, currency, tableVersion }
}

export function validateEnquiry(body: unknown): Validated {
  if (!body || typeof body !== 'object') return { ok: false, error: 'The enquiry was not readable' }
  const b = body as Record<string, unknown>
  const name = clean(b.name, 200)
  const email = clean(b.email, 320)
  if (!name) return { ok: false, error: 'A name is required' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'A valid email address is required' }
  return {
    ok: true,
    value: {
      name,
      email,
      phone: clean(b.phone, 60),
      postcode: clean(b.postcode, 20),
      room: clean(b.room, 120),
      notes: clean(b.notes, 4000),
      website: clean(b.website, 200),
      finishes: clean(b.finishes, 400),
      visualisedRoom: clean(b.visualisedRoom, 60),
      guide: clean(b.guide, 300),
      page: clean(b.page, 500),
      swatches: cleanSwatches(b.swatches),
      band: cleanBand(b.band),
    },
  }
}

/** The message the CRM receives: the visitor's notes, then the swatch and the room as a labelled block. */
export function composeMessage(v: EnquiryValue): string {
  const lines: string[] = []
  if (v.notes) lines.push(v.notes)
  if (v.finishes) lines.push(`Finishes composed on ${ENQUIRY_SOURCE}: ${v.finishes}`)
  if (v.visualisedRoom) lines.push(`Visualised as: ${v.visualisedRoom} (a generated visualisation, not a photograph)`)
  if (v.guide) lines.push(`Guide from the calculator: ${v.guide} — a guide, not a quote`)
  return lines.join('\n\n').slice(0, 5000)
}

export interface FunctionPayload {
  name: string; email: string; phone: string; postcode: string; project: string; message: string; website: string; source: string; page: string
  // Optional: postEnquiry forwards whatever is given as JSON; the function treats an absent field as
  // none (supabase/functions/enquiry/swatches.ts). Existing fixtures that predate this need no change.
  swatches?: SwatchRef[]; band?: BandRef | null
}

export function toFunctionPayload(v: EnquiryValue): FunctionPayload {
  return { name: v.name, email: v.email, phone: v.phone, postcode: v.postcode, project: v.room, message: composeMessage(v), website: v.website, source: ENQUIRY_SOURCE, page: v.page, swatches: v.swatches, band: v.band }
}

export type EnquiryOutcome =
  | { ok: true; status: number; id: string; reference: string; notified: unknown; acknowledged: unknown }
  | { ok: false; status: number; error: string; fallback: { phone: string; email: string } }

export const FALLBACK = { phone: CONTACT.phoneDisplay, email: CONTACT.email }

/** Posts to the function; any failure — refused, errored, unreachable — is reported with the fallback, never swallowed. */
export async function postEnquiry(payload: FunctionPayload, url: string = process.env.ENQUIRY_FUNCTION_URL || DEFAULT_ENQUIRY_FUNCTION_URL, fetchFn: typeof fetch = fetch): Promise<EnquiryOutcome> {
  let res: Response
  try {
    res = await fetchFn(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  } catch {
    return { ok: false, status: 502, error: 'The enquiry service could not be reached', fallback: FALLBACK }
  }
  const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; reference?: string; notified?: unknown; acknowledged?: unknown; error?: string } | null
  if (!res.ok || !json?.ok || !json.id) {
    return { ok: false, status: res.status >= 400 && res.status < 500 ? res.status : 502, error: json?.error || `The enquiry service answered ${res.status}`, fallback: FALLBACK }
  }
  // reference falls back to the old client-side slice for a function version that predates it — never absent.
  return { ok: true, status: 200, id: json.id, reference: json.reference || json.id.slice(0, 8).toUpperCase(), notified: json.notified ?? null, acknowledged: json.acknowledged ?? null }
}
