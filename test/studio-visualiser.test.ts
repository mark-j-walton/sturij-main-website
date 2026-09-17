// The Studio's Visualise opens the visualiser itself (Mark, 17 Sep 2026): the whole visualiser full-screen
// over the Studio, with a Close back to the scheme, and the room-type renders kept below it in the menu.
// The Studio is a static page (public/studio.js), so these read its source; the behaviour is exercised in a
// browser and recorded in the PR.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const js = readFileSync('public/studio.js', 'utf8')
const css = readFileSync('public/studio.css', 'utf8')
const html = readFileSync('public/studio.html', 'utf8')

describe("the Studio's Visualise opens the visualiser itself", () => {
  it('frames the visualiser\'s embed page at a fixed https address', () => {
    expect(js).toContain("var VISUALISER_EMBED='https://sturij.vercel.app/#/embed/visualiser';")
  })

  it('sets the frame\'s address only from that constant — nothing from the page\'s URL reaches it', () => {
    const open = js.slice(js.indexOf('function openVisualiser('), js.indexOf('function closeVisualiser('))
    expect(open).toContain('view.src=VISUALISER_EMBED')
    expect(open.match(/\.src=/g)).toHaveLength(1)
    expect(open).not.toMatch(/location|search|hash|URLSearchParams|localStorage/)
  })

  it('puts "Open the visualiser" first in the Visualise menu, then the eight room renders', () => {
    const menu = js.slice(js.indexOf("m.innerHTML='"), js.indexOf("m.addEventListener('click'"))
    const open = menu.indexOf('data-open="visualiser"')
    const rooms = menu.indexOf('ROOM_TYPES.map')
    expect(open).toBeGreaterThan(-1)
    expect(rooms).toBeGreaterThan(open)
    expect(js).toContain("var ROOM_TYPES=['Kitchen','Bedroom','Living room','Home office','Boot room','Utility room','Dressing room','Media room'];")
  })

  it('keeps the room renders working: a room item still runs the render', () => {
    const start = js.indexOf("m.addEventListener('click'")
    const handler = js.slice(start, js.indexOf("document.addEventListener('pointerdown'", start))
    expect(handler.length).toBeGreaterThan(100) // the slice found the handler
    expect(handler).toContain("e.target.closest('button[data-open=\"visualiser\"]')")
    expect(handler).toContain("closest('button[data-room]')")
    expect(handler).toContain('runVisualise()')
    expect(js).toContain('function runVisualise(){')
  })

  it('opens as a dialog with a Close, and closing returns focus to the Studio', () => {
    expect(js).toContain("setAttribute('role','dialog')")
    expect(js).toContain("setAttribute('aria-modal','true')")
    expect(js).toContain('close.onclick=closeVisualiser')
    expect(js).toMatch(/function closeVisualiser\(\)\{[\s\S]*?\.focus\(\);/)
  })

  it('has its styles: hidden until opened, full-screen above the Studio', () => {
    expect(css).toMatch(/\.visframe\{position:fixed;inset:0;z-index:1000;display:none/)
    expect(css).toContain('.visframe.on{display:flex}')
    expect(css).toContain('.visframe-view{')
    expect(html).toContain('title="Open the visualiser, or render this scheme as a photoreal room (Nano Banana)"')
  })
})
