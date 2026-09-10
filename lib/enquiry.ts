// The enquiry: validated here, then posted to sturij-web's enquiry function — the customer table's front
// door (public.enquiry; the function's contract read 10 Sep 2026: name, email required; phone, postcode,
// project, message, website honeypot, source, page). The visitor's composed swatch and visualised room
// travel inside the message text: the function has no column for them, and the function's contract is not
// this repository's to change — a finding for the enquiry type (form-surface §5.1).
import { CONTACT } from './contact'

export const DEFAULT_ENQUIRY_FUNCTION_URL = 'https://bcpmgpktmuaicjessseg.supabase.co/functions/v1/enquiry'
export const ENQUIRY_SOURCE = 'sturij.com'

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
  page?: string | null
}

/** The enquiry after validation: every field a string (empty when absent). */
export type EnquiryValue = { [K in keyof Required<EnquiryInput>]: string }
export type Validated = { ok: true; value: EnquiryValue } | { ok: false; error: string }

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

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
      page: clean(b.page, 500),
    },
  }
}

/** The message the CRM receives: the visitor's notes, then the swatch and the room as a labelled block. */
export function composeMessage(v: EnquiryValue): string {
  const lines: string[] = []
  if (v.notes) lines.push(v.notes)
  if (v.finishes) lines.push(`Finishes composed on ${ENQUIRY_SOURCE}: ${v.finishes}`)
  if (v.visualisedRoom) lines.push(`Visualised as: ${v.visualisedRoom} (a generated visualisation, not a photograph)`)
  return lines.join('\n\n').slice(0, 5000)
}

export interface FunctionPayload {
  name: string; email: string; phone: string; postcode: string; project: string; message: string; website: string; source: string; page: string
}

export function toFunctionPayload(v: EnquiryValue): FunctionPayload {
  return { name: v.name, email: v.email, phone: v.phone, postcode: v.postcode, project: v.room, message: composeMessage(v), website: v.website, source: ENQUIRY_SOURCE, page: v.page }
}

export type EnquiryOutcome =
  | { ok: true; status: number; id: string; notified: unknown }
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
  const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; notified?: unknown; error?: string } | null
  if (!res.ok || !json?.ok || !json.id) {
    return { ok: false, status: res.status >= 400 && res.status < 500 ? res.status : 502, error: json?.error || `The enquiry service answered ${res.status}`, fallback: FALLBACK }
  }
  return { ok: true, status: 200, id: json.id, notified: json.notified ?? null }
}
