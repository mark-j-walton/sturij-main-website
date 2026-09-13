// The take-to-live tuning (13 Sep 2026): the ribbon meets each decor once for readers and the keyboard and
// renders a decor without a swatch image as a labelled tile; the auth library arrives on demand, so a
// visitor's scripts carry none of it.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ribbonList } from '@/components/configurator/ribbon'
import { sessionHint } from '@/lib/supabase/browser'

describe('the ribbon — each decor once', () => {
  it('pads to ten and doubles for the loop, with the decors as the first entries', () => {
    const three = ribbonList(['a', 'b', 'c'])
    expect(three.list).toHaveLength(24)
    expect(three.unique).toBe(3)
    expect(three.list.slice(0, 3)).toEqual(['a', 'b', 'c'])
    const sixteen = ribbonList(Array.from({ length: 16 }, (_, i) => i))
    expect(sixteen.list).toHaveLength(32)
    expect(sixteen.unique).toBe(16)
    expect(ribbonList([])).toEqual({ list: [], unique: 0 })
  })
  it('hides every repeat from readers with its button out of the tab order, and a gradient tile carries its name', () => {
    const src = readFileSync('components/configurator/FinishConfigurator.tsx', 'utf8')
    expect(src).toMatch(/const repeat = i >= unique/)
    expect(src).toMatch(/aria-hidden=\{repeat \? 'true' : undefined\}/)
    expect(src).toMatch(/tabIndex=\{repeat \? -1 : 0\}/)
    expect(src).toMatch(/className="sw" role="img" aria-label=\{`\$\{t\.name\} — swatch to follow`\}/)
  })
})

describe('the admin control — the auth library on demand', () => {
  it('loads the library only for a session cookie, a return from the sign-in email or the admin hash', () => {
    expect(sessionHint('', '', '')).toBe(false)
    expect(sessionHint('_ga=1; theme=dark', '#range', '?utm=x')).toBe(false)
    expect(sessionHint('sb-bcpmgpktmuaicjessseg-auth-token=abc', '', '')).toBe(true)
    expect(sessionHint('x=1; sb-bcpmgpktmuaicjessseg-auth-token.0=abc', '', '')).toBe(true)
    expect(sessionHint('', '#admin', '')).toBe(true)
    expect(sessionHint('', '#access_token=abc&refresh_token=def', '')).toBe(true)
    expect(sessionHint('', '', '?code=abc')).toBe(true)
  })
  it('imports @supabase/ssr dynamically and nowhere statically on the client', () => {
    const browser = readFileSync('lib/supabase/browser.ts', 'utf8')
    expect(browser).toMatch(/import\('@supabase\/ssr'\)/)
    expect(browser).not.toMatch(/^import .* from '@supabase\/ssr'/m)
    const admin = readFileSync('components/admin/AdminControl.tsx', 'utf8')
    expect(admin).not.toMatch(/from '@supabase\//)
    expect(admin).toMatch(/if \(!sessionHint\(document\.cookie, location\.hash, location\.search\)\)/)
  })
})
