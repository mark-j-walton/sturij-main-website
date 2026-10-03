# sturij.com — the public site

The Sturij public site (bespoke fitted furniture, made in Skelmanthorpe, Yorkshire), rebuilt on the page platform's rules from the
Claude Design handoff of 9 September 2026 (`design_handoff_sturij_public_site`). Next.js on Vercel; the Studio
and the Canvas pages are served unchanged from `public/` at their existing URLs (studio.sturij.com/studio, /canvas).

## What is where

| Thing | Where | Rule |
|---|---|---|
| The DESIGN.md instance (tokens, two layers) | `design/sturij-public/DESIGN.md` | every value in the build resolves to it — `npm run check:tokens` refuses a one-off (`T_ONE_OFF`) |
| Generated tokens | `app/tokens.css` (built by `scripts/build-tokens.mjs`, not versioned) | components bind `var(--…)` only |
| The page's declaration | `pages/home/layout.json` | the sections in order and the slots each takes |
| Artifacts (self-declaring components) | `artifacts/*.json` ↔ `components/**` | the configurator is one artifact (`finish-configurator`), no second implementation |
| Motion recipes with reduced-motion mappings | `motion/recipes.json` | the page applies the mapping; nothing writes animation code |
| Assets by id | `assets/sources.json` → `assets/manifest.json` (`scripts/measure-assets.mjs`) | a page holds no asset; `next/image` derives renditions, never the master |
| Copy slots (seed) | `content/copy.seed.json` | live values: `site_content_slots` on sturij-web, highest version per slot |
| Image slots | `lib/slots.ts` `IMAGE_SLOTS` | live values: sturij-assets `media` rows in `public-media/site/slots/` (`lib/slot-store.ts`), written through `asset-ingest` by `/api/slots/image` |
| The materials feed (one registry) | `public/materials.json` ← `scripts/materials-feed.mjs` from sturij-assets, selected by id in `data/range.json`; `data/rooms.json` for room finishes | read at build from sturij-assets' public `registry-showcase` (published rows, no key), else the committed snapshot stands; no decor named in code; held finishes are labelled tiles |
| The enquiry door | `app/api/enquiry` → sturij-web `enquiry` function | the customer table; a failed post shows the phone and the mailbox |
| The render door | `app/api/render` | server-side, `GEMINI_API_KEY` from the vault by name; every image labelled VISUALISATION |
| The admin login + editing mode | `components/admin/AdminControl.tsx`, `supabase/migrations/20260910150000_site_slots.sql` | Supabase Auth on sturij-web; `site_admin` allowlist; append-only versions; audit by trigger |
| The legacy static site | `public/` (served), `legacy/index-2026-08-18.html` (parked, not served) | retired only on Mark's word |

## Run

```bash
npm install
npm run dev
```

Names the deployment reads (values from the vault, never here — see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`, `ENQUIRY_FUNCTION_URL`,
`RENDER_LIMIT_PER_VISITOR_HOUR`, `RENDER_LIMIT_PER_DAY`, `STURIJ_ASSETS_ANON_KEY`, `ASSET_INGEST_TOKEN` (server only; optional
`STURIJ_ASSETS_URL`). Without the first two the page renders from the seeds and the admin sign-in says so; without
`STURIJ_ASSETS_ANON_KEY` the image slots render their seeds; without `ASSET_INGEST_TOKEN` an image save is refused; without the Gemini key the Visualise flow answers `E_NOT_CONFIGURED`.

## Verify

```bash
npm run verify          # key-shape scan, typecheck, tests, token audit
npm run build && npm run check:bundle
npm run quality         # builds, starts, drives the page headlessly, measures renditions, runs Lighthouse; writes reports/
```

## Admin

Footer → **Admin** → the email on your Sturij admin account → the link or the code → **Start editing**. Click a
photo to replace it (JPG/WebP/PNG/AVIF ≤ 800 KB, ≥ 800 px wide; refused with the reason otherwise). Click any text
to edit; Enter saves, Escape cancels. Every save is a new version with an audit row; visitors see it within a
minute. Nothing lives in a visitor's browser.
