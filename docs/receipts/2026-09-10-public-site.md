# Receipts — the public site rebuilt · 10 September 2026

Session `claude-code-session-2026-09-10-public-site` · Claude Code, model claude-fable-5-1 · the brief run as written.
Draft PR: https://github.com/mark-j-walton/sturij-main-website/pull/33 · branch `claude/public-site-2026-09-10` · nothing merged, nothing on production.
Preview (the branch alias Vercel assigns): https://sturij-main-website-git-claude-public-s-e97e69-sturij-team-2026.vercel.app — the project's Vercel Authentication is ON for every non-custom domain, so the preview opens for Mark signed in to Vercel and refuses an anonymous probe; a Protection Bypass for Automation secret in the vault is what lets a session run Lighthouse against it.

MERGED ≠ DEPLOYED ≠ EXERCISED — each line below says which.

## What shipped (on the branch)

| Step | Where | State |
|---|---|---|
| 1 · The sturij-public DESIGN.md instance, the token pipeline, the scaffold | `design/sturij-public/DESIGN.md`, `scripts/build-tokens.mjs`, `scripts/check-tokens.mjs`, `next.config.ts` | on the branch; audit 0 one-offs over 42 files; 37 custom tokens (drift reading) |
| 2 · The page, section by section | `app/page.tsx`, `app/site.css`, `components/*`, `pages/home/layout.json`, `motion/recipes.json`, `artifacts/*.json`, `assets/manifest.json`, `content/copy.seed.json` | on the branch; 51 copy slots, 11 image slots, 13 artifacts, 13 recipes |
| 3 · The configurator as one artifact | `components/configurator/*`, `data/galleries.json`, `data/rooms.json` | on the branch; 7 of 13 decors by Egger code, the rest on the misfit list |
| 4 · The render, server-side | `app/api/render`, `lib/render.ts` | on the branch; answers `E_NOT_CONFIGURED` until the key name reaches the deployment |
| 5 · The enquiry | `app/api/enquiry`, `lib/enquiry.ts` | on the branch; **exercised** once against the live function (below) |
| 6 · The admin login + editing mode | `components/admin/*`, `app/api/revalidate`, `supabase/migrations/20260910150000_site_slots.sql` | on the branch; the migration **applied and probed** on sturij-web; not yet exercised |
| 7 · Quality | `test/*`, `scripts/check-bundle.mjs`, `scripts/quality.mjs` | on the branch; numbers below |

## What was measured

Local production build (`next build` + `next start`, 10 Sep 2026, `reports/quality-2026-09-10T14-52-58-762Z.json`):

| Check | Result |
|---|---|
| vitest | 36 / 36 |
| typecheck | clean |
| key-shape scan (tracked files) | 0 hits / 1168 files |
| bundle scan (editor scaffolding, visitor key handling, key shapes, model endpoint in client chunks) | 0 hits |
| quality run | 23 / 23 |
| veil release after load | 656 ms (cap 2.5 s) |
| images served | 37, all renditions, largest 213 KB; no master served |
| third-party requests from the page | none |
| reduced motion | marquees static, reveals shown |
| phone (390 px) horizontal overflow | 0 px |
| Lighthouse mobile | performance 81 · accessibility 100 · best practices 100 · SEO 100 (LCP 4.2 s, CLS 0, TBT 124 ms) |
| Lighthouse desktop | performance 99 · accessibility 100 · best practices 100 · SEO 100 (LCP 0.85 s) |

Mobile LCP is the hero photograph; 89 % of it is render delay on the throttled CPU, not load. Preload and `fetchpriority=high` are in place. A fine-tuning line, not a defect.

## What was exercised

- **The enquiry path, end to end.** One marked probe through the site's route to sturij-web's live `enquiry` function: row `cee9bea6-1613-4b6d-83d9-2e5d02300d42` in `public.enquiry` (created 2026-09-10 14:45:57 UTC, source `sturij.com`, status `new`), Resend message `6387da07-5de1-4566-83c6-0d9f2435221a` recorded on the row (`notified_at` 14:45:57.719 UTC). The table went from 3 rows to 4. Safe to archive.

## What was deployed (not yet exercised)

- **The slot tables on sturij-web** (`bcpmgpktmuaicjessseg`), applied by migration and read back: `site_admin` (2 rows: Mark's two auth users), `site_content_slots`, `site_image_slots`, `site_slot_audit`, the two `_current` views; RLS on all four; six table policies and two storage policies; the `site-images` bucket (public read, 819 200-byte limit); four triggers (versions assigned by the database, audit row per save). No admin write has happened yet — that needs the deployment to carry the public names and Mark to sign in.

## What was corrected during the session

- The handoff was not on the desktop; it was inside `Favorites\Downloads\Hero text readability solution.zip` (Claude Design names the zip after the design).
- The first preview build failed: `app/tokens.css` is generated, not versioned, and the build script did not generate it. `npm run build` now runs the generator first.
- A stale local server on the quality port served an old build once (Windows `kill()` leaves the child alive); the quality script now refuses a busy port and kills the process tree.
- The nav CTA's gold read 4.25:1 on charcoal; it now uses accent-hi (5.4:1). Gallery tiles had `role=button` on `<figure>`; they now carry a real button. The swatch rails carry `role=group`.

## Findings for the record

- The enquiry function requires an email; the handoff's form had none — added. The function has no column for the composed swatch; it travels in the message text, labelled. The function is unchanged.
- The registry (sturij-assets) holds codes for 7 of the 13 gallery decors; Natural Dimaro Walnut, Cassis, Caramel Beige and Soft Beige are in it without a code; Alpine White and Graphite Grey are not in it; the 15 handle finishes are procedural swatches, not products. All on the misfit list in `data/galleries.json`.
- The Vercel project carried one env name (`MOTION_PLUS_API`); the vault sync does not reach it.
- Config Mono is a Typekit face; the instance names IBM Plex Mono (the handoff's own fallback), self-hosted.
- The hexagon mask: the brand pack's 512 px PNG stands in for the 1500 px+ master the handoff asked for.

## Still owed

By Mark:
- A vault sync destination for this Vercel project carrying `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL` (and `RENDER_ALLOWED_ORIGINS` if the render is to be called from elsewhere).
- Supabase Auth on sturij-web: the preview origin and `https://sturij.com` on the redirect allowlist (the emailed code works without it).
- The first admin sign-in and one image and one copy edit on the preview — the receipt that exercises the slot tables (an audit row with his email).
- The fine-tuning list on the preview (copy edits he can now make himself; layout, timing and tokens by a line each).
- The 1500 px+ hexagon master; the registry codes and the handle finish family.
- Then, as separate acts: the domain cutover, and the retirements (Zapier inventoried first, HubSpot exported first, Google Sites after the cutover).

By the next session (on Mark's word):
- The connection to the image asset library (the sturij-assets records and the showcase files under one id) — "get it working first" was the order.
- Lighthouse and the quality run against the preview once it builds — blocked from a session by Vercel Authentication on previews until a Protection Bypass for Automation secret is in the vault (Mark's act); the numbers above are the local production build.
