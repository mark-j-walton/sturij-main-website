import { Copy, type Slot } from './Copy'
import { AdminControl } from './admin/AdminControl'
import { SocialLinks } from './SocialLinks'
import { CONTACT } from '@/lib/contact'
import { copyrightLine, IDENTITY, tradingDisclosure, trademarkLine, urlOf, workshopLine } from '@/lib/identity'
import { sectionNav } from '@/lib/signpost'

export interface FooterSlots {
  tagline: Slot
  social: { facebook: Slot; instagram: Slot; linkedin: Slot }
  /** The Trustpilot profile URL — a link is a link (addendum 6); empty until Mark supplies it. */
  trustpilot: Slot
  /** The UK trade-mark registration number — ® renders only once it is here (addendum 2). */
  trademark: Slot
}

/**
 * §12 The footer (artifacts/site-footer.json): the wordmark and tagline; the signpost, derived from the page
 * register; the contact; the legal pages; the social links; the reviews link once its URL is on record; the
 * trading disclosures on every page (addendum 5, item 1) with the registered office here and nowhere else;
 * the © line with the year — and the admin control that signs an admin in and turns editing on.
 */
export function SiteFooter({ logo, tagline, social, trustpilot, trademark }: { logo: string } & FooterSlots) {
  const sections = sectionNav()
  const trustpilotUrl = urlOf(trustpilot.value)
  const tm = trademarkLine(trademark.value)
  return (
    <footer className="foot" data-artifact="site-footer">
      <div className="wrap">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={273} height={98} />
          <Copy slot={tagline} className="mono" />
          <SocialLinks urls={{ facebook: social.facebook.value, instagram: social.instagram.value, linkedin: social.linkedin.value }} />
        </div>
        <div className="mono links">
          <a href="/#wardrobes">Wardrobes</a> · <a href="/#media">Media walls</a> · <a href="/#range">Finishes</a> · <a href="/calculator">Guide price</a> · <a href="/blog">Blog</a> · <a href="/#enquire">Book a visit</a><br />
          {sections.map((s, i) => <span key={s.slug}>{i ? ' · ' : ''}<a href={s.slug}>{s.label}</a></span>)}
          {sections.length > 0 && <br />}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a><br />
          <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/complaints">Complaints</a> · <a href="/accessibility">Accessibility</a> · <a href="/studio">Studio</a>
          {trustpilotUrl && <><br /><a href={trustpilotUrl} target="_blank" rel="noopener noreferrer" data-reviews-link="trustpilot">Read our reviews on Trustpilot</a></>}
        </div>
        <AdminControl />
        <div className="mono disc" data-trading-disclosure>
          <span data-disclosure>{tradingDisclosure()}</span><br />
          <span data-nap>Workshop: {workshopLine()} · {IDENTITY.phone.display} · {IDENTITY.email}</span><br />
          {tm && <><span data-trademark>{tm}</span><br /></>}
          <span data-copyright>{copyrightLine()}</span>
        </div>
      </div>
    </footer>
  )
}
