import type { NextConfig } from 'next'

// The Studio, the Canvas and the legacy pages are served unchanged from public/ at the URLs they
// have today (studio.sturij.com/studio, /canvas, …). vercel.json's cleanUrls used to do this; with
// Next.js the clean URLs are explicit rewrites, so the list is data a test can read.
export const LEGACY_PAGES = [
  'studio', 'canvas', 'chat', 'customer', 'review', 'mobile',
  'complaints', 'privacy', 'terms',
  'projects/mf', 'projects/oval', 'projects/vne',
] as const

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // The bucket the admin editing mode uploads into (sturij-web's site-images); renditions are
    // derived on request from the master there, never served as the master.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/site-images/**' }],
  },
  async rewrites() {
    return {
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
