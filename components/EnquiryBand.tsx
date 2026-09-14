'use client'
// §11 "Book a design visit" — posts to sturij-web's enquiry function through /api/enquiry (the customer
// table's front door, mail-gate G5). Every swatch the visitor composed travels with it, by reference
// (11 Sep 2026, 4edd148f) — each with its thumbnail and a remove control; removing one drops it from THIS
// enquiry only, never from the collector (the visitor can still visualise it, or send it on the next one).
// A failed post shows the phone number and the mailbox — never a silent loss.
import { useMemo, useState, type FormEvent } from 'react'
import { Copy, type Slot } from './Copy'
import { CONTACT } from '@/lib/contact'
import type { BandRef, SwatchRef } from '@/lib/enquiry'
import { finishNames, fullSpec, useConfigurator, type Swatch } from './configurator/ConfiguratorProvider'

export type EnquiryReply =
  | { ok: true; id: string; reference?: string; notified?: unknown; acknowledged?: unknown }
  | { ok: false; error: string; fallback?: { phone: string; email: string } }

/** The swatch's decor/carcass/handle by reference, or null if the decor carries no code — the function
 * requires one (it cross-checks it against the registry); a codeless swatch still travels as free text
 * in the message, it just cannot travel structured. */
function swatchRef(s: Swatch): SwatchRef | null {
  const { doors, carcass, handle } = s.picks
  if (!doors.code) return null
  return { doorsDecorId: doors.id, doorsDecorCode: doors.code, carcassId: carcass.id, handleFinishId: handle.id }
}

function bandRef(guide: { band: { from: number; to: number; currency: string }; tableVersion: number } | null): BandRef | null {
  if (!guide) return null
  return { from: guide.band.from, to: guide.band.to, currency: guide.band.currency, tableVersion: guide.tableVersion }
}

export function EnquiryBand({ kicker, title, body, submit, note }: { kicker: Slot; title: Slot; body: Slot; submit: Slot; note: Slot }) {
  const { swatches, visuals, guide } = useConfigurator()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [detail, setDetail] = useState<string>('')
  // Local to this form only — removing a swatch here never touches the collector's own state (W4: the
  // visitor's work in the range is never lost because of a choice made at the form).
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(() => new Set())
  const included = useMemo(() => swatches.filter((s) => !excluded.has(s.n)), [swatches, excluded])
  const remove = (n: number) => setExcluded((prev) => new Set(prev).add(n))

  const spec = included.length ? included.map((s) => fullSpec(s)).join(' | ') : null
  const lastRoom = visuals.length ? visuals[visuals.length - 1]!.room.label : null

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = e.currentTarget
    const data = new FormData(f)
    const body = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      postcode: String(data.get('postcode') ?? ''),
      room: String(data.get('room') ?? ''),
      notes: String(data.get('notes') ?? ''),
      website: String(data.get('website') ?? ''),
      finishes: spec,
      visualisedRoom: lastRoom,
      guide: guide?.line ?? null,
      swatches: included.map(swatchRef).filter((s): s is SwatchRef => s !== null),
      band: bandRef(guide),
      page: typeof location !== 'undefined' ? location.href : undefined,
    }
    setState('sending')
    try {
      const r = await fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = (await r.json().catch(() => null)) as EnquiryReply | null
      if (!r.ok || !j || !j.ok) throw new Error((j && !j.ok && j.error) || 'failed')
      setState('sent')
      setDetail(j.reference || j.id.slice(0, 8).toUpperCase())
      f.reset()
    } catch (err) {
      setState('failed')
      setDetail(err instanceof Error ? err.message : 'failed')
    }
  }

  return (
    <section className="band enq" id="enquire" data-artifact="enquiry-form">
      <div className="wrap">
        <Copy slot={kicker} as="div" className="kicker reveal" />
        <Copy slot={title} as="h2" className="lead reveal" />
        <Copy slot={body} as="p" className="sub reveal" />
        <form className="form reveal" onSubmit={onSubmit} noValidate={false}>
          <div className="field"><label htmlFor="f-name">Name</label><input id="f-name" name="name" autoComplete="name" placeholder="Sam Ainsworth" required maxLength={200} /></div>
          <div className="field"><label htmlFor="f-email">Email</label><input id="f-email" name="email" type="email" autoComplete="email" placeholder="sam@example.com" required maxLength={320} /></div>
          <div className="field"><label htmlFor="f-post">Postcode</label><input id="f-post" name="postcode" autoComplete="postal-code" placeholder="HG1 2AB" maxLength={20} /></div>
          <div className="field"><label htmlFor="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autoComplete="tel" placeholder="07700 900123" maxLength={60} /></div>
          <div className="field full"><label htmlFor="f-room">What&rsquo;s the room?</label><input id="f-room" name="room" placeholder="Bedroom alcove" maxLength={120} /></div>
          <div className="field full"><label htmlFor="f-notes">Anything else</label><textarea id="f-notes" name="notes" placeholder="Rough sizes, finishes you like, photos to follow…" maxLength={4000} /></div>
          <div className="hp" aria-hidden="true"><label htmlFor="f-website">Leave this blank</label><input id="f-website" name="website" tabIndex={-1} autoComplete="off" /></div>

          {included.length > 0 ? (
            <ul className="enq-swatches full" data-enquiry-swatches>
              {included.map((s) => (
                <li className="enq-swatch" key={s.n}>
                  <img src={s.thumb} width={40} height={40} alt="" aria-hidden="true" />
                  <span>{finishNames(s.picks)}</span>
                  <button type="button" onClick={() => remove(s.n)} aria-label={`Remove ${finishNames(s.picks)} from this enquiry`}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="enq-empty full" data-enquiry-empty>
              No swatch composed yet — pick a door, a carcass and a handle in the range above and it will travel with your enquiry.
            </p>
          )}
          {guide && <div className="enq-spec" data-enquiry-guide>Your guide travels with this: {guide.line}</div>}

          <button className="submit" type="submit" disabled={state === 'sending' || state === 'sent'}>
            {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : <Copy slot={submit} />}
          </button>
          <Copy slot={note} as="div" className="note" />
          {state === 'sent' && <div className="enq-result" role="status">Thanks — your enquiry is in (ref {detail}). We&rsquo;ll be in touch within a working day.</div>}
          {state === 'failed' && (
            <div className="enq-result fallback" role="alert" data-enquiry-fallback>
              Sorry, that didn&rsquo;t send. Please call <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a> or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> — nothing you typed has been lost from this page.
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
