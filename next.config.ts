import type { NextConfig } from 'next'

// The Studio, the Canvas and the legacy pages are served unchanged from public/ at the URLs they
// have today (studio.sturij.com/studio, /canvas, …). vercel.json's cleanUrls used to do this; with
// Next.js the clean URLs are explicit rewrites, so the list is data a test can read. The legal pages left
// this list on 13 Sep 2026: /privacy, /terms and /complaints are app routes rendering their records
// (components/LegalPage.tsx); the old static pages are parked under legacy/legal-2026-02-03.
export const LEGACY_PAGES = [
  'studio', 'canvas', 'chat', 'customer', 'review', 'mobile',
  'projects/mf', 'projects/oval', 'projects/vne',
] as const

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // sturij-assets, the one asset store: the admin's slot images (public-media/site/slots) and the materials
    // feed's swatches (catalog). Renditions are derived on request from the master there, never served as it.
    remotePatterns: [
      { protocol: 'https', hostname: 'uxdrokyxywwezorpvfsp.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async rewrites() {
    return {
      // /registry is served by app/registry/route.ts (a proxy that fixes the content-type), not a
      // rewrite: Supabase serves the registry-review function as text/plain, so a bare rewrite would
      // hand the browser HTML source instead of a rendered page.
      beforeFiles: [],
      afterFiles: LEGACY_PAGES.map((p) => ({ source: `/${p}`, destination: `/${p}.html` })),
      fallback: [],
    }
  },
  async redirects() {
    return [
      { source: '/:path*', has: [{ type: 'host', value: 'www.sturij.com' }], destination: 'https://sturij.com/:path*', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
