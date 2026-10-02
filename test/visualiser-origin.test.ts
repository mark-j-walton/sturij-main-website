// The visualiser moves to its own sturij.com address (decision, 2 Oct 2026): every surface is a sturij.com
// address behind one password pattern. The origin is written once, in public/visualiser-origin.js, and the
// Studio, the Canvas and the Chat read it; no page calls the old *.vercel.app address, which sits behind
// Vercel Authentication and showed reviewers a Vercel login inside the page. These read the static sources.
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (f: string) => readFileSync(`public/${f}`, 'utf8')
const config = read('visualiser-origin.js')
const studio = read('studio.js')
const canvas = read('canvas.js')
const chat = read('chat.html')

describe("the visualiser's origin is one constant", () => {
  it('is defined once, as the fixed https sturij.com address', () => {
    expect(config).toContain("window.STURIJ_VISUALISER_ORIGIN='https://visualiser.sturij.com';")
    expect(config.match(/STURIJ_VISUALISER_ORIGIN=/g)).toHaveLength(1)
  })

  it('is loaded before every script that reads it', () => {
    for (const [page, script] of [['studio.html', 'studio.js'], ['canvas.html', 'canvas.js'], ['chat.html', 'chat-core.js']] as const) {
      const html = read(page)
      const at = html.indexOf('<script src="visualiser-origin.js"></script>')
      expect(at, page).toBeGreaterThan(-1)
      expect(at, page).toBeLessThan(html.indexOf(`<script src="${script}"></script>`))
    }
  })

  it('is the only visualiser address in the Studio, the Canvas and the Chat', () => {
    expect(studio).toContain("var RENDER_ENDPOINT=VISUALISER_ORIGIN+'/api/render';")
    expect(canvas).toContain('var VISUALISER_ORIGIN=window.STURIJ_VISUALISER_ORIGIN;')
    expect(canvas).toContain("var RENDER_ENDPOINT=VISUALISER_ORIGIN+'/api/render';")
    expect(canvas).toContain("window.open(VISUALISER_ORIGIN+'/#/visualiser?plan='+payload,'_blank');")
    expect(chat).toContain("fetch(window.STURIJ_VISUALISER_ORIGIN+'/api/render',")
  })

  it('sends the visualiser\'s password cookie with every render call', () => {
    for (const [name, src] of [['studio.js', studio], ['canvas.js', canvas], ['chat.html', chat]] as const) {
      const calls = src.match(/fetch\((?:RENDER_ENDPOINT|window\.STURIJ_VISUALISER_ORIGIN\+'\/api\/render'),\{[^}]*/g) ?? []
      expect(calls.length, name).toBeGreaterThan(0)
      for (const call of calls) expect(call, name).toContain("credentials:'include'")
    }
  })

  it('leaves no *.vercel.app address in any public page or script', () => {
    const files = readdirSync('public').filter((f) => /\.(js|html|mjs)$/.test(f))
    for (const f of files) expect(read(f), f).not.toMatch(/vercel\.app/)
  })
})
