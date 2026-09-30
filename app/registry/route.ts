// studio.sturij.com/registry — the single gateway to the materials registry review UI
// (the finishes/variants + decors viewer: Handles / Sockets / Decors, Gallery / Matrix).
//
// The viewer is served by the registry-review edge function in the sturij-assets Supabase project.
// Supabase serves edge-function responses as `text/plain` with `nosniff`, so pointing a browser at
// the function (or a bare rewrite to it) shows the HTML source rather than a rendered page. This
// route fetches the viewer server-side and re-serves it as `text/html` so it renders. The viewer's
// own JS then reads the registry feeds (registry-showcase / staging-showcase) directly.

const VIEWER = 'https://uxdrokyxywwezorpvfsp.supabase.co/functions/v1/registry-review'

// Always reflect the currently-deployed viewer; do not statically cache at build time.
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetch(VIEWER, { cache: 'no-store' })
  } catch {
    return new Response('Registry viewer is unavailable (upstream unreachable).', {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  if (!upstream.ok) {
    return new Response(`Registry viewer is unavailable (upstream ${upstream.status}).`, {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  const html = await upstream.text()
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
