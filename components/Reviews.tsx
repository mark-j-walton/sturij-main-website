import { publishableReviews, reviewReading, reviewsJsonLd } from '@/lib/reviews'

/**
 * The reviews section (artifacts/reviews.json): first-party reviews with permission on record — genuine, dated,
 * from an identifiable customer — never edited. Renders nothing until a row qualifies; the structured data is
 * emitted only from qualifying rows. A paid third-party widget would slot into this same section without a re-cut.
 */
export function Reviews({ site }: { site: string }) {
  const rs = publishableReviews()
  if (rs.length === 0) return null
  const { count, average } = reviewReading()
  const ld = reviewsJsonLd(site)
  return (
    <section className="band reviews" id="reviews" data-artifact="reviews" data-count={count} data-average={average ?? ''}>
      <div className="wrap">
        <div className="kicker reveal">What our customers say</div>
        <h2 className="lead reveal">In their words.</h2>
        <ul className="reviewlist">
          {rs.map((r) => (
            <li key={r.id} className="review reveal" data-review={r.id}>
              <blockquote>{r.text}</blockquote>
              <div className="who mono">{r.customer}{r.project ? ` · ${r.project}` : ''} · <time dateTime={r.date}>{r.date}</time>{typeof r.rating === 'number' ? ` · ${r.rating}/5` : ''}</div>
            </li>
          ))}
        </ul>
        {average !== null && <p className="reviewsum mono">{count} reviews · average {average} of 5</p>}
      </div>
      {ld && <script type="application/ld+json" data-jsonld="reviews" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}
    </section>
  )
}
