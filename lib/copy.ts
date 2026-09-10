// Copy slots: free text is content here, not a property (the CMS rule) — no vocabulary resolution. A slot's
// value is text with a small markup allowance so the handoff's line breaks and coloured words survive:
// <br>, <em>, <strong>, and <span class="em"> (gold) / <span class="claret">. Everything else is stripped.

const ALLOWED_SPAN_CLASSES = new Set(['em', 'claret'])

/** Reduce arbitrary HTML (a paste, a contentEditable's innerHTML) to the allowance. Pure; runs on the server and in the browser. */
const CANONICAL_TAG = /<(?:br|em|\/em|strong|\/strong|span class="(?:em|claret)"|\/span)>/y

/** After the rewrite only canonical tags may remain; every other `<` becomes text. Closes the mutation-XSS door (a tag split by a stripped tag re-forming). */
function escapeStrayAngles(html: string): string {
  let out = ''
  for (let i = 0; i < html.length; i++) {
    const ch = html[i]
    if (ch !== '<') { out += ch; continue }
    CANONICAL_TAG.lastIndex = i
    const m = CANONICAL_TAG.exec(html)
    if (m) { out += m[0]; i += m[0].length - 1 } else out += '&lt;'
  }
  return out
}

export function sanitizeCopy(input: string): string {
  const text = String(input ?? '')
  // Drop comments, scripts and styles whole.
  const stripped = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
  const openSpans: boolean[] = [] // per opened span: whether it was kept, so its closing tag follows the same fate
  return escapeStrayAngles(stripped.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase()
    const closing = whole.startsWith('</')
    if (tag === 'br') return closing ? '' : '<br>'
    if (tag === 'em' || tag === 'strong') return closing ? `</${tag}>` : `<${tag}>`
    if (tag === 'b') return closing ? '</strong>' : '<strong>'
    if (tag === 'i') return closing ? '</em>' : '<em>'
    if (tag === 'span') {
      if (closing) return openSpans.pop() ? '</span>' : ''
      const m = /class\s*=\s*["']?([a-zA-Z0-9_-]+)["']?/.exec(attrs)
      const cls = m?.[1]
      const kept = !!cls && ALLOWED_SPAN_CLASSES.has(cls)
      openSpans.push(kept)
      return kept ? `<span class="${cls}">` : '' // an unstyled span carries nothing
    }
    if (tag === 'div' || tag === 'p') return closing ? '<br>' : '' // block pastes become line breaks
    return ''
  })).replace(/(<br>\s*)+$/g, '').trim()
}

/** The plain text of a slot — for the reading, the audit row's checksum preview and the <title>. */
export function copyText(html: string): string {
  return sanitizeCopy(html).replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()
}

export const COPY_LIMIT = 2000
