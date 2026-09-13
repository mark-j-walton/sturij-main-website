// The legal pages render their records byte-faithful (content/legal/<id>.json — the snapshot of the current
// version of each document, with the door's sha256; a test recomputes it). Nothing here is edited on the
// site; a change is a new version of the record, proposed for Mark's tick, re-snapshotted, re-rendered.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

export type LegalSource = 'brain' | 'published-page'
export interface LegalRecord {
  id: string
  brainId: string | null
  externalId: string | null
  collection: string | null
  title: string
  version: number
  createdAt: string
  lastUpdated: string | null
  sha256: string
  source: LegalSource
  sourceNote: string
  content: string
}

export const LEGAL_IDS = ['privacy', 'terms', 'complaints'] as const
export type LegalId = (typeof LEGAL_IDS)[number]

export function loadLegal(id: LegalId): LegalRecord {
  const file = `content/legal/${id}.json`
  if (!existsSync(file)) throw new Error(`A_UNDECLARED: legal record ${id} has no snapshot at ${file}`)
  return JSON.parse(readFileSync(file, 'utf8')) as LegalRecord
}

/** The door's rule: the sha256, hex, lower-case, of the body (these records carry no REFS line, so the whole content). */
export function legalHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Inline markdown: bold, links (http(s) and mailto only) — on escaped text. */
function inline(text: string): string {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_m, t: string, u: string) => `<a href="${u}"${u.startsWith('http') ? ' rel="noopener noreferrer"' : ''}>${t}</a>`)
}

/**
 * A small, faithful renderer for the records' markdown: headings, paragraphs, rules, bullet and numbered lists
 * with one level of nesting, bold and links. Every character of the text is emitted (escaped); nothing is
 * reworded. Unknown constructs render as paragraphs, never dropped.
 */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let para: string[] = []
  const stack: Array<'ul' | 'ol'> = []
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = [] } }
  const closeLists = (depth = 0) => { while (stack.length > depth) out.push(`</${stack.pop()}>`) }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) { flushPara(); closeLists(); continue }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) { flushPara(); closeLists(); const n = h[1]!.length; out.push(`<h${n}>${inline(h[2]!)}</h${n}>`); continue }
    if (/^---+$/.test(line.trim())) { flushPara(); closeLists(); out.push('<hr>'); continue }
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line)
    if (li) {
      flushPara()
      const depth = Math.floor(li[1]!.length / 4) + 1
      const kind: 'ul' | 'ol' = /^\d+\.$/.test(li[2]!) ? 'ol' : 'ul'
      if (stack.length > depth) closeLists(depth)
      if (stack.length < depth) { while (stack.length < depth) { out.push(`<${kind}>`); stack.push(kind) } }
      else if (stack[depth - 1] !== kind) { out.push(`</${stack.pop()}>`); out.push(`<${kind}>`); stack.push(kind) }
      out.push(`<li>${inline(li[3]!)}</li>`)
      continue
    }
    if (stack.length) closeLists()
    para.push(line)
  }
  flushPara(); closeLists()
  return out.join('\n')
}

/** The plain text of the record for a reading or a search — headings and lists flattened. */
export function legalText(md: string): string {
  return md.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^---+$/gm, '').replace(/\n{2,}/g, '\n').trim()
}
