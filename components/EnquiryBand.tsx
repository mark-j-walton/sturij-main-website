'use client'
// §11 "Book a design visit" — posts to sturij-web's enquiry function through /api/enquiry (the customer
// table's front door, mail-gate G5). The visitor's composed swatch and room travel with it as data. A
// failed post shows the phone number and the mailbox — never a silent loss.
import { useState, type FormEvent } from 'react'
import { Copy, type Slot } from './Copy'
import { CONTACT } from '@/lib/contact'
import { fullSpec, useConfigurator } from './configurator/ConfiguratorProvider'

export type EnquiryReply = { ok: true; id: string; notified?: unknown } | { ok: false; error: string; fallback?: { phone: string; email: string } }

export function EnquiryBand({ kicker, title, body, submit, note }: { kicker: Slot; title: Slot; body: Slot; submit: Slot; note: Slot }) {
  const { latestSwatch, visuals, guide } = useConfigurator()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [detail, setDetail] = useState<string>('')
  const spec = latestSwatch ? fullSpec(latestSwatch) : null
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
      page: typeof location !== 'undefined' ? location.href : undefined,
    }
    setState('sending')
    try {
      const r = await fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = (await r.json().catch(() => null)) as EnquiryReply | null
      if (!r.ok || !j || !j.ok) throw new Error((j && !j.ok && j.error) || 'failed')
      setState('sent')
      setDetail(j.id)
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
          {spec && <div className="enq-spec" data-enquiry-spec>Your swatch travels with this: {spec}{lastRoom ? ` · visualised as a ${lastRoom.toLowerCase()}` : ''}</div>}
          {guide && <div className="enq-spec" data-enquiry-guide>Your guide travels with this: {guide.line}</div>}
          <button className="submit" type="submit" disabled={state === 'sending' || state === 'sent'}>
            {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : <Copy slot={submit} />}
          </button>
          <Copy slot={note} as="div" className="note" />
          {state === 'sent' && <div className="enq-result" role="status">Thanks — your enquiry is in (ref {detail.slice(0, 8)}). We&rsquo;ll be in touch within a working day.</div>}
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
