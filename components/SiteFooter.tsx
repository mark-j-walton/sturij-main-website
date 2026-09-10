import { Copy, type Slot } from './Copy'
import { AdminControl } from './admin/AdminControl'
import { CONTACT } from '@/lib/contact'

/** §12 The footer: the wordmark, the mono link row, the © line — and the admin sign-in that turns on editing. */
export function SiteFooter({ logo, tagline, copyright }: { logo: string; tagline: Slot; copyright: Slot }) {
  return (
    <footer className="foot" data-artifact="site-footer">
      <div className="wrap">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={273} height={98} />
          <Copy slot={tagline} className="mono" />
        </div>
        <div className="mono">
          <a href="#wardrobes">Wardrobes</a> · <a href="#media">Media walls</a> · <a href="#range">Finishes</a> · <a href="#enquire">Book a visit</a><br />
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a><br />
          <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/complaints">Complaints</a> · <a href="/studio">Studio</a>
        </div>
        <AdminControl />
        <Copy slot={copyright} className="mono" />
      </div>
    </footer>
  )
}
