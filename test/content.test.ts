// The content sections and their claims registers (the go-live rule), the partners, the legal records, the
// identity on every page, finance off, the social links, the reviews rule, the rights register, the page
// register that drives the nav and the sitemap — claude-code-session-2026-09-11-site-content-sections.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import { allAssets } from '@/lib/assets'
import { copyrightLine, IDENTITY, organisationJsonLd, socialLinks, tradingDisclosure, trademarkLine, urlOf } from '@/lib/identity'
import { LEGAL_IDS, legalHash, loadLegal, renderMarkdown } from '@/lib/legal'
import { publishableReviews, reviewPublishable, reviewsJsonLd } from '@/lib/reviews'
import { claimSlotId, faqHeld, heldReading, lineHeld, loadPartners, loadSection, loadSections, partnerFields, partnerPublishable, sectionSlots, SLOT_ID, type PartnerEntry, type Section } from '@/lib/sections'
import { pageRegister, sectionNav } from '@/lib/signpost'
import { CLAIM_SLOT_IDS, COPY_SLOT_IDS, IMAGE_SLOTS, SEED_SLOTS } from '@/lib/slots'

const sections = loadSections()
const partners = loadPartners()
const seedFile = JSON.parse(readFileSync('content/copy.seed.json', 'utf8')) as { slots: Record<string, string> }
const allCopyText = () => [...Object.values(seedFile.slots), ...sections.flatMap((s) => Object.values(sectionSlots(s)))].join('\n')

describe('the content sections — the copy family as data', () => {
  it('seven sections, each a declared page whose layout mirrors it (slug, nav, title) and whose route mounts SectionPage with its id', () => {
    expect(sections.map((s) => s.id).sort()).toEqual(['boards', 'fittings', 'handles', 'hardware', 'pricing', 'services', 'worktops'])
    for (const s of sections) {
      const layout = JSON.parse(readFileSync(`pages/${s.id}/layout.json`, 'utf8'))
      expect(layout.slug).toBe(s.slug)
      expect(layout.nav).toEqual(s.nav)
      expect(layout.title).toBe(s.title)
      expect(layout.kind).toBe('section')
      const route = readFileSync(`app${s.slug}/page.tsx`, 'utf8')
      expect(route).toContain(`<SectionPage id="${s.id}" />`)
      expect(s.source.document).toBe('site-copy-family')
      expect(s.source.sha256).toBe('68e5cd4a63a9eb854bec5a9de56ccdbd9c05f0b5c47f01e7612a00278becd435')
    }
  })
  it('every slot id fits the slot tables and is seeded once; every claim a line names is a register row; every [P] row has its closing slot', () => {
    for (const id of Object.keys(SEED_SLOTS)) expect(SLOT_ID.test(id), id).toBe(true)
    for (const s of sections) {
      const ids = new Set(s.claims.map((c) => c.id))
      expect(ids.size).toBe(s.claims.length)
      const lines = [...s.parts.flatMap((p) => [...(p.standfirst ? [p.standfirst] : []), ...p.blocks.flatMap((b) => b.lines)]), ...s.faq.flatMap((f) => f.a)]
      for (const l of lines) for (const c of l.claims ?? []) expect(ids.has(c), `${l.id} → ${c}`).toBe(true)
      for (const c of s.claims) if (c.status === 'P') expect(CLAIM_SLOT_IDS).toContain(claimSlotId(s.id, c.id))
      for (const c of s.claims) expect(['P', 'ours', 'sourced', 'general', 'dropped']).toContain(c.status)
    }
  })
  it('the go-live rule: a line whose claim is [P] is held; the closing line in the slot table releases it; a dropped claim holds for good', () => {
    const boards = loadSection('boards')
    const textures = boards.parts[0]!.blocks.find((b) => b.id === 'egger')!.lines.find((l) => l.id === 'sec.boards.egger.3')!
    expect(lineHeld(boards, textures, {}, partners)).toBe(true)
    expect(lineHeld(boards, textures, { [claimSlotId('boards', 'egger-textures')]: 'Egger decor collection 2026, synchronised-pore textures, p. 12' }, partners)).toBe(false)
    expect(lineHeld(boards, textures, { [claimSlotId('boards', 'egger-textures')]: '   ' }, partners)).toBe(true)
    const ours = boards.parts[0]!.blocks.find((b) => b.id === 'intro')!.lines[0]!
    expect(lineHeld(boards, ours, {}, partners)).toBe(false)
    const dropped: Section = { ...boards, claims: [...boards.claims, { id: 'x', claim: 'x', location: 'x', status: 'dropped', source: 'x' }] }
    expect(lineHeld(dropped, { id: 'sec.boards.t.1', text: 't', claims: ['x'] }, { [claimSlotId('boards', 'x')]: 'closed' }, partners)).toBe(true)
    expect(() => lineHeld(boards, { id: 'sec.boards.t.2', text: 't', claims: ['no-such-row'] }, {}, partners)).toThrow(/A_UNDECLARED/)
  })
  it('a FAQ item is held only when every answer line is held; a partly sourced answer keeps its sourced lines', () => {
    const boards = loadSection('boards')
    expect(faqHeld(boards, boards.faq.find((f) => f.id === 'guarantee')!, {}, partners)).toBe(true)
    const realWood = boards.faq.find((f) => f.id === 'real-wood')!
    expect(faqHeld(boards, realWood, {}, partners)).toBe(false)
    expect(realWood.a.map((l) => lineHeld(boards, l, {}, partners))).toEqual([false, true])
  })
  it('a partner renders only with consent and a review date not yet passed, and only its publishable fields; today every entry is held', () => {
    for (const p of partners) expect(partnerPublishable(p)).toBe(false)
    const ok: PartnerEntry = { id: 't', trade: 'T', name: 'N', phone: '1', email: 'e@x', publishable: ['trade', 'name', 'phone'], consent: '2026-09-14', reviewDate: '2099-01-01' }
    expect(partnerPublishable(ok, new Date('2026-09-15T00:00:00Z'))).toBe(true)
    expect(partnerPublishable({ ...ok, reviewDate: '2026-09-14' }, new Date('2026-09-15T00:00:00Z'))).toBe(false)
    expect(partnerPublishable({ ...ok, consent: null })).toBe(false)
    expect(partnerPublishable({ ...ok, reviewDate: null })).toBe(false)
    expect(partnerFields(ok).map(([f]) => f)).toEqual(['trade', 'name', 'phone'])
  })
  it('the held reading per section is consistent and the worktops partner section is gated', () => {
    for (const s of sections) {
      const r = heldReading(s, {}, partners)
      expect(r.total).toBe(r.lines + r.faq + r.partners + r.parts)
      expect(r.open.every((o) => o.startsWith('partner:') || s.claims.some((c) => c.id === o))).toBe(true)
    }
    const w = heldReading(loadSection('worktops'), {}, partners)
    expect(w.parts).toBe(1)
    expect(w.open).toContain('partner:omega-stone')
    expect(heldReading(loadSection('services'), {}, partners).partners).toBe(partners.length)
  })
  it('finance renders nowhere outside the legal records; no copy names Harrogate as the workshop', () => {
    const text = allCopyText()
    expect(text).not.toMatch(/\bfinance\b|703401|ideal4finance|introducer appointed representative/i)
    expect(text).not.toMatch(/Harrogate workshop|CNC in Harrogate|Sturij · Harrogate/)
    expect(text).toMatch(/Skelmanthorpe workshop/)
    expect(text).not.toContain('Woodland Close')
    expect(text).not.toContain('®')
  })
})

describe('the legal records — rendered byte-faithful', () => {
  it('the privacy and complaints snapshots hash to the record; the terms are the published page, awaiting a record', () => {
    for (const id of LEGAL_IDS) {
      const r = loadLegal(id)
      expect(legalHash(r.content), id).toBe(r.sha256)
      expect(r.version).toBe(1)
    }
    expect(loadLegal('privacy').brainId).toBe('049b7311-9358-467e-af4c-77655b3781c3')
    expect(loadLegal('complaints').brainId).toBe('95074afa-c89b-4194-bd53-a8e9ea9d4349')
    expect(loadLegal('terms').source).toBe('published-page')
    expect(loadLegal('terms').brainId).toBeNull()
    for (const id of LEGAL_IDS) { expect(existsSync(`app/${id}/page.tsx`)).toBe(true); expect(existsSync(`legacy/legal-2026-02-03/${id}.html`)).toBe(true); expect(existsSync(`public/${id}.html`)).toBe(false) }
  })
  it('the renderer emits every character escaped and rewords nothing', () => {
    expect(renderMarkdown('**a** [b](https://x.y) <c> & d')).toBe('<p><strong>a</strong> <a href="https://x.y" rel="noopener noreferrer">b</a> &lt;c&gt; &amp; d</p>')
    expect(renderMarkdown('## H\n\n- one\n    - nested\n- two\n\n1. first\n\n---\n\npara')).toBe('<h2>H</h2>\n<ul>\n<li>one</li>\n<ul>\n<li>nested</li>\n</ul>\n<li>two</li>\n</ul>\n<ol>\n<li>first</li>\n</ol>\n<hr>\n<p>para</p>')
    expect(renderMarkdown('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>')
    const html = renderMarkdown(loadLegal('privacy').content)
    expect(html).toContain('Wycliffe House')
    expect(html).not.toContain('<script')
  })
})

describe('the identity — one NAP everywhere', () => {
  it('the trading disclosure, the copyright line and the trade-mark rule', () => {
    const d = tradingDisclosure()
    for (const s of ['Sturij is a trading name of Storage Innovation Limited', '12903072', 'England and Wales', '7 Woodland Close, Wetherby LS22 6BJ', 'VAT 366695249']) expect(d).toContain(s)
    expect(copyrightLine(2026)).toBe('© 2026 Storage Innovation Limited, trading as Sturij')
    expect(trademarkLine('')).toBeNull()
    expect(trademarkLine('<b>UK00004012345</b>')).toBe('Sturij® is a registered trade mark of Storage Innovation Limited (UK00004012345).')
    expect(trademarkLine('not a number')).toBeNull()
    expect(IDENTITY.workshop.locality).toBe('Skelmanthorpe')
    expect(IDENTITY.workshop.postcode).toBe('HD8 9GA')
  })
  it('the structured data pairs the legal name with the trading name and carries the workshop and the profiles as sameAs', () => {
    const links = socialLinks({ facebook: SEED_SLOTS['footer.social.facebook'], instagram: SEED_SLOTS['footer.social.instagram'], linkedin: SEED_SLOTS['footer.social.linkedin'] })
    expect(links.map((l) => l.id)).toEqual(['facebook', 'instagram', 'linkedin'])
    expect(links.map((l) => l.href)).toEqual(['https://www.facebook.com/SturijWardrobes', 'https://www.instagram.com/sturij_wardrobes/', 'https://www.linkedin.com/company/sturij/'])
    expect(urlOf('javascript:alert(1)')).toBeNull()
    expect(urlOf('https://x.y/"onclick')).toBeNull()
    const ld = organisationJsonLd('https://sturij.com', 'd', links.map((l) => l.href)) as { '@graph': Array<Record<string, unknown>> }
    const org = ld['@graph'][0]!, biz = ld['@graph'][1]!
    expect(org['@type']).toBe('Organization'); expect(org.legalName).toBe('Storage Innovation Limited'); expect(org.name).toBe('Sturij'); expect((org.sameAs as string[]).length).toBe(3)
    expect(biz['@type']).toBe('HomeAndConstructionBusiness'); expect((biz.address as { postalCode: string }).postalCode).toBe('HD8 9GA'); expect(biz.telephone).toBe('+441937326011')
    expect(SEED_SLOTS['footer.trustpilot']).toBe(''); expect(SEED_SLOTS['footer.trademark']).toBe('')
  })
  it('no platform script, no embed, no pre-ticked consent on the form', () => {
    const src = readdirSync('components', { recursive: true }).map(String).filter((f) => /\.tsx$/.test(f)).map((f) => readFileSync(`components/${f}`, 'utf8')).join('\n')
    expect(src).not.toMatch(/connect\.facebook\.net|platform\.instagram\.com|platform\.linkedin\.com|widget\.trustpilot\.com|invitejs\.trustpilot/)
    const form = readFileSync('components/EnquiryBand.tsx', 'utf8')
    expect(form).not.toMatch(/type="checkbox"|defaultChecked|marketing/i)
  })
})

describe('the reviews rule', () => {
  it('nothing renders and no structured data is emitted without permission and a date; a third party is never marked up', () => {
    expect(publishableReviews()).toEqual([])
    expect(reviewsJsonLd('https://sturij.com')).toBeNull()
    expect(reviewPublishable({ id: 'r', customer: 'A', text: 't', date: '2026-09-01', permission: null })).toBe(false)
    expect(reviewPublishable({ id: 'r', customer: 'A', text: 't', date: '2026-09-01', permission: '2026-09-02' })).toBe(true)
    expect(reviewPublishable({ id: 'r', customer: 'A', text: 't', date: '2026-09-01', permission: '2026-09-02', withdrawn: '2026-09-03' })).toBe(false)
    const file = JSON.parse(readFileSync('content/reviews.json', 'utf8')) as { rules: { thirdPartyMarkup: string; requires: string[] }; reviews: unknown[] }
    expect(file.rules.thirdPartyMarkup).toBe('never')
    expect(file.rules.requires).toEqual(['customer', 'text', 'date', 'permission'])
    expect(file.reviews).toEqual([])
  })
})

describe('the page register — the nav and the sitemap derive from it', () => {
  it('the seven sections in order, every register slug in the sitemap, no hand-written sitemap', async () => {
    expect(sectionNav().map((s) => s.slug)).toEqual(['/boards', '/hardware', '/fixtures-and-fittings', '/handles', '/lighting-and-services', '/worktops', '/how-we-price'])
    const urls = (await sitemap()).map((e) => e.url)
    for (const p of pageRegister()) expect(urls).toContain(p.slug === '/' ? 'https://sturij.com/' : `https://sturij.com${p.slug}`)
    expect(existsSync('public/sitemap.xml')).toBe(false)
    expect(pageRegister().length).toBeGreaterThanOrEqual(13)
  })
  it('the rights register has a row for every asset a slot renders, and counts what is still [P]', () => {
    const rights = JSON.parse(readFileSync('assets/rights.json', 'utf8')) as { rows: Array<{ asset: string; class: string; status: string }> }
    const byId = new Map(rights.rows.map((r) => [r.asset, r]))
    for (const a of allAssets()) expect(byId.has(a.id), a.id).toBe(true)
    for (const id of Object.values(IMAGE_SLOTS)) expect(byId.has(id), id).toBe(true)
    for (const r of rights.rows) expect(['system', 'supplier', 'commercial', 'project-photograph', 'brand', 'system-procedural']).toContain(r.class)
    expect(rights.rows.filter((r) => r.status === 'P').length).toBeGreaterThan(0)
  })
  it('the copy slots a page reads are seeded and declared', () => {
    for (const id of COPY_SLOT_IDS) expect(SEED_SLOTS[id]).toBeDefined()
  })
})
