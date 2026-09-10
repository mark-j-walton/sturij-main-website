'use client'
// §12 + the addendum: the admin login on the footer. A small sign-in (Supabase Auth on sturij-web, Mark's
// existing account, an email link or code) that turns on EDITING MODE for a signed-in admin only: every
// content photo gets the dashed outline and the chip (native size · displayed size · the limit) and a
// click opens a picker; every content text is a slot — click to edit in place, save. Images go to the
// site-images bucket and a site_image_slots row; copy to site_content_slots; every save is audited by the
// database (a publish content act at the login class); nothing lives in the visitor's browser.
import { useCallback, useEffect, useRef, useState } from 'react'
import { publicSupabase } from '@/lib/supabase/browser'
import { COPY_LIMIT, sanitizeCopy } from '@/lib/copy'
import { validateImageFile, IMAGE_LIMIT_BYTES } from './validate'

type Status = 'unconfigured' | 'checking' | 'signed-out' | 'link-sent' | 'signed-in' | 'admin'

export function AdminControl() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('checking')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<{ text: string; err?: boolean } | null>(null)
  const [editing, setEditing] = useState(false)
  const chips = useRef<HTMLElement[]>([])
  const publishTimer = useRef<number | null>(null)
  const say = (text: string, err = false) => setMessage({ text, err })

  const refresh = useCallback(async () => {
    const sb = publicSupabase()
    if (!sb) { setStatus('unconfigured'); return }
    const { data } = await sb.auth.getSession()
    if (!data.session) { setStatus('signed-out'); return }
    const r = await fetch('/api/revalidate').then((x) => x.json()).catch(() => null) as { admin?: boolean; email?: string } | null
    setEmail(r?.email ?? data.session.user.email ?? '')
    setStatus(r?.admin ? 'admin' : 'signed-in')
  }, [])

  useEffect(() => {
    void refresh()
    if (location.hash === '#admin') setOpen(true)
    const sb = publicSupabase()
    const sub = sb?.auth.onAuthStateChange(() => { void refresh() })
    return () => sub?.data.subscription.unsubscribe()
  }, [refresh])

  const sendLink = async () => {
    const sb = publicSupabase()
    if (!sb || !email) return
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/#admin`, shouldCreateUser: false } })
    if (error) { say(error.message, true); return }
    setStatus('link-sent')
    say('Email sent — open the link, or enter the code from it here')
  }
  const verify = async () => {
    const sb = publicSupabase()
    if (!sb || !email || !code) return
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    if (error) { say(error.message, true); return }
    say('Signed in')
    void refresh()
  }
  const signOut = async () => { await publicSupabase()?.auth.signOut(); setEditing(false); setStatus('signed-out'); say('Signed out') }

  const publish = useCallback(() => {
    if (publishTimer.current) window.clearTimeout(publishTimer.current)
    publishTimer.current = window.setTimeout(async () => {
      const r = await fetch('/api/revalidate', { method: 'POST' }).then((x) => x.json()).catch(() => null) as { ok?: boolean; error?: string } | null
      say(r?.ok ? 'Published — visitors see it within a minute' : `Saved, but not republished: ${r?.error ?? 'no answer'}`, !r?.ok)
    }, 1200)
  }, [])

  // ---- editing mode: images ----
  const imageHosts = () => [...document.querySelectorAll<HTMLElement>('img[data-image-slot], [data-image-slot][data-slot-kind="background"]')]
  const hostOf = (el: HTMLElement) => (el.matches('[data-slot-kind="background"]') ? el : el.closest<HTMLElement>('.panel, .feat-img, .card, .vtarget') ?? el.parentElement ?? el)

  const decorate = useCallback((on: boolean) => {
    chips.current.splice(0).forEach((c) => c.remove())
    document.body.classList.toggle('copymode', on)
    for (const el of imageHosts()) {
      const host = hostOf(el)
      host.classList.toggle('imgmode-host', on)
      if (!on) continue
      const r = el.getBoundingClientRect()
      const chip = document.createElement('div')
      chip.className = 'imgmode-chip'
      chip.textContent = `${el.dataset.imageSlot} · ${el.dataset.native ?? '?'} px · shown ${Math.round(r.width)}×${Math.round(r.height)} · jpg/webp/png ≤ ${Math.round(IMAGE_LIMIT_BYTES / 1024)} KB${el.dataset.override ? ' · edited' : ''}`
      host.appendChild(chip)
      chips.current.push(chip)
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-copy-slot]')) {
      if (on) el.setAttribute('contenteditable', 'true'); else el.removeAttribute('contenteditable')
    }
  }, [])

  const uploadFor = useCallback(async (slotId: string, file: File) => {
    const sb = publicSupabase()
    if (!sb) return
    const v = await validateImageFile(file)
    if (!v.ok) { say(`Refused: ${v.reason}`, true); return }
    say(`Uploading ${file.name}…`)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `slots/${slotId}/${Date.now()}.${ext}`
    const up = await sb.storage.from('site-images').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
    if (up.error) { say(`Upload refused: ${up.error.message}`, true); return }
    const ins = await sb.from('site_image_slots').insert({ slot_id: slotId, asset_path: path, width: v.width, height: v.height, bytes: file.size, mime: file.type, alt: null })
    if (ins.error) { say(`Saved the file, but the slot row was refused: ${ins.error.message}`, true); return }
    say(`${slotId} replaced (${v.width}×${v.height}, ${Math.round(file.size / 1024)} KB)`)
    publish()
    setTimeout(() => location.reload(), 1800)
  }, [publish])

  useEffect(() => {
    if (!editing) { decorate(false); return }
    decorate(true)
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('.adm') || t.closest('[data-copy-slot]')) return
      const img = (t.closest('img[data-image-slot], [data-image-slot][data-slot-kind="background"]') as HTMLElement | null) ?? t.closest<HTMLElement>('.imgmode-host')?.querySelector<HTMLElement>('[data-image-slot]') ?? null
      if (!img) return
      e.preventDefault(); e.stopPropagation()
      const inp = document.createElement('input')
      inp.type = 'file'
      inp.accept = 'image/jpeg,image/png,image/webp,image/avif'
      inp.onchange = () => { const f = inp.files?.[0]; if (f) void uploadFor(img.dataset.imageSlot as string, f) }
      inp.click()
    }
    const originals = new WeakMap<HTMLElement, string>()
    const onFocus = (e: FocusEvent) => { const el = (e.target as HTMLElement).closest<HTMLElement>('[data-copy-slot]'); if (el) originals.set(el, el.innerHTML) }
    const onBlur = async (e: FocusEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-copy-slot]')
      if (!el) return
      const before = originals.get(el)
      const text = sanitizeCopy(el.innerHTML).slice(0, COPY_LIMIT)
      if (before === undefined || sanitizeCopy(before) === text) return
      el.innerHTML = text
      const sb = publicSupabase()
      if (!sb) return
      const slot = el.dataset.copySlot as string
      const ins = await sb.from('site_content_slots').insert({ slot_id: slot, text })
      if (ins.error) { say(`Edit refused for ${slot}: ${ins.error.message}`, true); el.innerHTML = before; return }
      say(`${slot} saved`)
      publish()
    }
    const onKey = (e: KeyboardEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-copy-slot]')
      if (!el) return
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur() }
      if (e.key === 'Escape') { const b = originals.get(el); if (b !== undefined) el.innerHTML = b; el.blur() }
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    document.addEventListener('keydown', onKey)
    const onResize = () => decorate(true)
    addEventListener('resize', onResize)
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onBlur); document.removeEventListener('keydown', onKey); removeEventListener('resize', onResize); decorate(false) }
  }, [editing, decorate, uploadFor])

  return (
    <>
      <button className={`ftog${editing ? ' on' : ''}`} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-admin-toggle>
        {status === 'admin' ? (editing ? 'Editing: on' : 'Admin') : 'Admin'}
      </button>
      {open && (
        <div className="adm" role="dialog" aria-label="Site admin" data-admin-panel>
          <button className="x" type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          <h4>Site admin</h4>
          {status === 'unconfigured' && <p>Sign-in is not switched on for this deployment: the project&rsquo;s public names (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) have not reached it from the vault yet.</p>}
          {status === 'checking' && <p>Checking…</p>}
          {(status === 'signed-out' || status === 'link-sent') && (
            <>
              <p>Sign in with the email on your Sturij admin account. You&rsquo;ll get a link and a code.</p>
              <input type="email" placeholder="you@sturij.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <div className="row"><button className="mbtn" type="button" onClick={sendLink}>Send the link</button></div>
              {status === 'link-sent' && (
                <>
                  <input inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
                  <div className="row"><button className="mbtn ghost" type="button" onClick={verify}>Use the code</button></div>
                </>
              )}
            </>
          )}
          {status === 'signed-in' && (
            <>
              <p>Signed in as {email} — this login is not a site admin, so editing stays off.</p>
              <div className="row"><button className="mbtn ghost" type="button" onClick={signOut}>Sign out</button></div>
            </>
          )}
          {status === 'admin' && (
            <>
              <p>Signed in as {email}.</p>
              <div className="row">
                <button className="mbtn" type="button" onClick={() => setEditing((v) => !v)} data-admin-editing={editing ? 'on' : 'off'}>{editing ? 'Stop editing' : 'Start editing'}</button>
                <button className="mbtn ghost" type="button" onClick={signOut}>Sign out</button>
              </div>
              {editing && <p>Click any photo to replace it (jpg, webp, png or avif, up to {Math.round(IMAGE_LIMIT_BYTES / 1024)} KB). Click any text to edit it; Enter saves, Escape cancels. Every save is versioned and audited.</p>}
            </>
          )}
          {message && <div className={`status${message.err ? ' err' : ''}`} role="status">{message.text}</div>}
        </div>
      )}
    </>
  )
}
