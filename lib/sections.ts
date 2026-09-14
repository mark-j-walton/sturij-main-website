// The content sections (content/sections/*.json) — the copy family from the brain (site-copy-family, doc
// caa74546) as data: every line a copy slot the admin's versioned slot tables can override, every claim a
// register row, every partner an entry with consent and a review date. THE GO-LIVE RULE: a line whose claim
// is [P] renders nothing — it is held, not shown; when Mark closes the row (a data edit: the closing line saved
// in the slot table under claim.<section>.<row>) the line appears. A partner renders only its publishable
// fields, only with consent on record, only until its review date. Nothing is hidden from people for crawlers:
// a held line is absent from the DOM; its outline exists for the admin alone.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type ClaimStatus = 'P' | 'ours' | 'sourced' | 'general' | 'dropped'
export interface Claim { id: string; claim: string; location: string; status: ClaimStatus; source: string; sourcedOn?: string; note?: string }
export interface Line { id: string; text: string; claims?: string[]; partner?: string; title?: string }
export type BlockKind = 'prose' | 'maker' | 'list' | 'closing' | 'statement' | 'partners'
export interface Block { id: string; kind: BlockKind; title?: string; lines: Line[]; partner?: string }
export interface Part { id: string; kicker?: string; heading: string; standfirst?: Line; blocks: Block[]; partner?: string }
export interface FaqItem { id: string; q: string; a: Line[] }
export interface Section {
  id: string
  slug: string
  nav: { group: string; label: string; order: number }
  title: string
  description: string
  source: { document: string; version: number; part: string; sha256: string }
  parts: Part[]
  faq: FaqItem[]
  claims: Claim[]
  /** Copy used elsewhere on the site — e.g. the pricing line under the calculator's band. */
  extra?: Record<string, string>
}

export interface PartnerEntry {
  id: string
  trade: string
  name: string
  town?: string
  contact?: string
  phone?: string
  email?: string
  website?: string
  blurb?: string
  publishable: string[]
  /** ISO date the partner consented to be named, or null — required before anything renders. */
  consent: string | null
  /** ISO date after which the entry stops rendering until re-affirmed — required. */
  reviewDate: string | null
  registrationOnRecord?: string
  note?: string
}

const DIR = 'content/sections'
const PARTNERS_FILE = 'content/partners.json'

export function loadSections(dir = DIR): Section[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Section)
}

export function loadSection(id: string): Section {
  const s = loadSections().find((x) => x.id === id)
  if (!s) throw new Error(`A_UNDECLARED: section ${id} has no file under ${DIR}`)
  return s
}

export function loadPartners(file = PARTNERS_FILE): PartnerEntry[] {
  if (!existsSync(file)) return []
  return (JSON.parse(readFileSync(file, 'utf8')) as { entries: PartnerEntry[] }).entries
}

/** The slot id under which Mark's closing line for a claim lands in the slot table. */
export const claimSlotId = (section: string, claimId: string) => `claim.${section}.${claimId}`

/** A partner may be named: consent recorded, a review date recorded, and the review date not yet passed. */
export function partnerPublishable(p: PartnerEntry | undefined, today = new Date()): boolean {
  if (!p || !p.consent || !p.reviewDate) return false
  return new Date(p.reviewDate + 'T23:59:59Z').getTime() >= today.getTime()
}

/** Only the fields the entry marks publishable, in their declared order. */
export function partnerFields(p: PartnerEntry): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const f of p.publishable) {
    const v = (p as unknown as Record<string, unknown>)[f]
    if (typeof v === 'string' && v.trim()) out.push([f, v])
  }
  return out
}

export interface HeldReading { lines: number; faq: number; partners: number; parts: number; total: number; open: string[] }

/**
 * Whether a line is held: any of its claims is [P] without a closing line in the slot table, or its partner
 * may not be named. `closures` is the slot map (claim.<section>.<id> → Mark's line).
 */
export function lineHeld(section: Section, line: Line, closures: Record<string, string>, partners: PartnerEntry[], today = new Date()): boolean {
  if (line.partner && !partnerPublishable(partners.find((p) => p.id === line.partner), today)) return true
  for (const cid of line.claims ?? []) {
    const row = section.claims.find((c) => c.id === cid)
    if (!row) throw new Error(`A_UNDECLARED: line ${line.id} names claim ${cid}, which is not in the ${section.id} register`)
    if (row.status === 'dropped') return true
    if (row.status === 'P' && !(closures[claimSlotId(section.id, cid)] ?? '').trim()) return true
  }
  return false
}

export function partHeld(section: Section, part: Part, partners: PartnerEntry[], today = new Date()): boolean {
  return !!part.partner && !partnerPublishable(partners.find((p) => p.id === part.partner), today)
}

export function blockHeld(section: Section, block: Block, closures: Record<string, string>, partners: PartnerEntry[], today = new Date()): boolean {
  if (block.partner && !partnerPublishable(partners.find((p) => p.id === block.partner), today)) return true
  if (block.kind === 'partners') return false
  return block.lines.length > 0 && block.lines.every((l) => lineHeld(section, l, closures, partners, today))
}

/** A FAQ item is held when every line of its answer is held — a question with no answer is not shown. */
export function faqHeld(section: Section, item: FaqItem, closures: Record<string, string>, partners: PartnerEntry[], today = new Date()): boolean {
  return item.a.every((l) => lineHeld(section, l, closures, partners, today))
}

/** The held-line count per page — the reading on the declaration block and on the receipt. */
export function heldReading(section: Section, closures: Record<string, string>, partners: PartnerEntry[], today = new Date()): HeldReading {
  const open = new Set<string>()
  let lines = 0, faq = 0, parts = 0
  for (const part of section.parts) {
    if (partHeld(section, part, partners, today)) { parts++; open.add(`partner:${part.partner}`); continue }
    if (part.standfirst && lineHeld(section, part.standfirst, closures, partners, today)) { lines++; part.standfirst.claims?.forEach((c) => open.add(c)) }
    for (const b of part.blocks) {
      if (b.kind === 'partners') continue
      for (const l of b.lines) if (lineHeld(section, l, closures, partners, today)) { lines++; l.claims?.forEach((c) => open.add(c)); if (l.partner) open.add(`partner:${l.partner}`) }
    }
  }
  for (const item of section.faq) for (const l of item.a) if (lineHeld(section, l, closures, partners, today)) { faq++; l.claims?.forEach((c) => open.add(c)) }
  const partnerBlocks = section.parts.flatMap((p) => p.blocks).filter((b) => b.kind === 'partners')
  const heldPartners = partnerBlocks.length ? partners.filter((p) => !partnerPublishable(p, today)).length : 0
  heldPartners && partners.filter((p) => !partnerPublishable(p, today)).forEach((p) => open.add(`partner:${p.id}`))
  return { lines, faq, partners: heldPartners, parts, total: lines + faq + heldPartners + parts, open: [...open].sort() }
}

/** Every copy slot a section seeds: the kicker, heading and standfirst of each part, every line, every FAQ question and answer line, the extras — and the claim slots (empty until Mark closes a row). */
export function sectionSlots(section: Section): Record<string, string> {
  const slots: Record<string, string> = {}
  for (const part of section.parts) {
    if (part.kicker !== undefined) slots[`sec.${section.id}.${part.id}.kicker`] = part.kicker
    slots[`sec.${section.id}.${part.id}.heading`] = part.heading
    if (part.standfirst) slots[part.standfirst.id] = part.standfirst.text
    for (const b of part.blocks) {
      if (b.title) slots[`sec.${section.id}.${b.id}.title`] = b.title
      for (const l of b.lines) { slots[l.id] = l.text; if (l.title) slots[`${l.id}.title`] = l.title }
    }
  }
  for (const item of section.faq) {
    slots[`sec.${section.id}.faq.${item.id}.q`] = item.q
    for (const l of item.a) slots[l.id] = l.text
  }
  for (const [k, v] of Object.entries(section.extra ?? {})) slots[`sec.${section.id}.${k}`] = v
  for (const c of section.claims) if (c.status === 'P') slots[claimSlotId(section.id, c.id)] = ''
  return slots
}

/** Every slot every section seeds — merged into the site's seed by lib/slots.ts. */
export function allSectionSlots(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of loadSections()) for (const [k, v] of Object.entries(sectionSlots(s))) {
    if (k in out) throw new Error(`A_UNDECLARED: slot ${k} is seeded twice`)
    out[k] = v
  }
  return out
}

/** Every slot id must match the slot tables' constraint (site_content_slots.slot_id ~ '^[a-z0-9.-]{2,80}$'). */
export const SLOT_ID = /^[a-z0-9.-]{2,80}$/
