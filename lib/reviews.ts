// First-party reviews as records (content/reviews.json; addendum 6). A review renders only with the customer's
// permission on record and a date; the count and the average are readings; structured data is emitted only from
// qualifying rows, and never for a third party's score.
import data from '@/content/reviews.json'

export interface Review {
  id: string
  customer: string
  text: string
  date: string
  rating?: number
  /** ISO date the customer ticked publish consent on the completion certificate — required. */
  permission: string | null
  withdrawn?: string | null
  project?: string
}

export const REVIEW_RULES = data.rules

export function allReviews(): Review[] {
  return data.reviews as Review[]
}

/** A review may be shown: permission on record, a date, the customer's name, the text, and not withdrawn. */
export function reviewPublishable(r: Review): boolean {
  return !!(r.permission && r.date && r.customer && r.text && !r.withdrawn)
}

export function publishableReviews(): Review[] {
  return allReviews().filter(reviewPublishable)
}

/** The reading: how many qualify and their average rating, when enough carry one. */
export function reviewReading(): { count: number; average: number | null } {
  const rs = publishableReviews()
  const rated = rs.filter((r) => typeof r.rating === 'number')
  const average = rated.length >= REVIEW_RULES.aggregateRatingMinimum ? Math.round((rated.reduce((n, r) => n + (r.rating as number), 0) / rated.length) * 10) / 10 : null
  return { count: rs.length, average }
}

/** Review + AggregateRating structured data from qualifying first-party rows only; null when nothing qualifies. */
export function reviewsJsonLd(site: string): Record<string, unknown> | null {
  const rs = publishableReviews()
  if (rs.length === 0) return null
  const { average, count } = reviewReading()
  const rated = rs.filter((r) => typeof r.rating === 'number')
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    review: rs.map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.customer }, datePublished: r.date, reviewBody: r.text, ...(typeof r.rating === 'number' ? { reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 } } : {}) })),
    ...(average !== null ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: average, reviewCount: rated.length, bestRating: 5 } } : {}),
    ...(average === null ? {} : { _count: count }),
  }
}
