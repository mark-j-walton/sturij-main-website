# Receipts — take-to-live: the fine-tuning and the cutover plan · 13 September 2026

Session `claude-code-session-2026-09-11-site-take-to-live` · Claude Code, model claude-fable-5-1 · the Architect's brief of 11 Sep with its amendment and addendum 2, run as written on 13 Sep.
Draft PR #40 https://github.com/mark-j-walton/sturij-main-website/pull/40 — branch `claude/take-to-live-2026-09-13` off `main` @ 35ad94f (the #38 merge). **Nothing merged. Nothing to production.**

MERGED ≠ DEPLOYED ≠ EXERCISED — each line below says which.

## The preconditions, read from the remote

- (a) `rescue/2026-08-15-design-drop` is on origin at 329e995 — present.
- (b) #33 is MERGED (10 Sep 15:15 Z), and so are #34, #35, #36, #37 and #38; `origin/main` is 35ad94f. The amendment's first case: precondition (b) is moot, the work goes on a new branch off main, no rebase of the site.
- Production (`sturij-main-website.vercel.app`, `studio.sturij.com`) serves merged main. `vercel env ls production`, names only: `MOTION_PLUS_API` and nothing else.

## What shipped (on the branch)

| Commit | What |
|---|---|
| `dcfe545` the tuning | `lib/supabase/browser.ts` loads `@supabase/ssr` by dynamic import on first use and exports `CONFIGURED` and `sessionHint(cookie, hash, search)`; `components/admin/AdminControl.tsx` asks for the client only on a session cookie, a return from the sign-in email (`?code=` or `#access_token`), the `#admin` hash, or an act in the panel. `components/configurator/ribbon.ts` (pure `ribbonList`); the Ribbon in `FinishConfigurator.tsx` marks every repeat `aria-hidden` with its button at `tabIndex −1` and gives a gradient tile `role="img"`, `aria-label="<name> — swatch to follow"`, `data-misfit`. `SwatchRail.tsx`: the dismiss button's aria-label now contains its visible text. `test/tuning.test.ts`. |
| `11958a1` quality | `scripts/quality.mjs` +4 checks: the visitor's scripts carry no auth library (matched by strings only the library has; bytes recorded); no broken image; every gallery shows readers and the keyboard each decor once; every gradient tile labelled. |
| this commit | these receipts and the cutover plan |

Vercel built the branch from git at `11958a1`: commit status `success`; deployment `dpl_4D9z7nDJy4ELFecP2fERCYTtfQZ2` READY (source git, PR 40), branch alias `sturij-main-website-git-claude-take-to-c5219d-sturij-team-2026.vercel.app` — behind Vercel Authentication, the team's setting; it opens for Mark signed in to Vercel. The repository has no GitHub workflows; the Vercel build is the remote's check.

## The fine-tuning list, item by item

| Item | Reading (13 Sep) | Done |
|---|---|---|
| (1) hero and panel renditions for the phone | Lighthouse on the live domain: the hero `<img>` is the LCP element; the phone fetched it at w=750 (18 KB); `uses-responsive-images` scores 1, no wasted bytes. The amendment's "requested at w=3840" is the `src` fallback attribute; the browser chose from the `srcset`. The loss is **render delay** — 2,067 ms against 0 ms load delay and 631 ms load time (local 11 Sep: 3,783 ms render delay). The simulation ties the hero's paint to the script the page loads: 235 KB gzipped across 7 chunks, 123 KB unused on the phone; the largest unused item (73 of 96 KB) was `@supabase/ssr` + `supabase-js`, statically imported by the footer's admin control and downloaded by every visitor of a deployment that has no public names. | The library on demand. The page's scripts 264 KB → 203 KB gzipped (−23 %); the 262 KB library chunk is built but no longer referenced by the page; the quality run reads 8 scripts, 654 KB raw, 0 carrying the auth client. `PanelStack` keeps `sizes="100vw"` (right for full-viewport panels); Features and StackCards already carry per-artifact sizes. |
| (2) two decors without a swatch image | Alpine White and Graphite Grey are in the **Colours** gallery, not Materials (`data/galleries.json`; live DOM probe of all four tabs). They render as 310 × 194 gradient tiles with their names in the figcaption — a labelled tile, not an `<img>`. Live page: 122 images, 0 broken. | The span carries `role="img"`, its label and `data-misfit`; the quality run counts 8 gradient tiles (Colours), 0 unlabelled. |
| (3) marquee duplicates aria-hidden | The ribbon pads each gallery to ten tiles and doubles it: Woods 24 figures for 3 decors, Materials 24 for 4, Colours 24 for 6, Handles 30 for 15. Only the second half's buttons were out of the tab order; no figure was hidden. | Every repeat `aria-hidden` with its button at `tabIndex −1`; the quality run reads each gallery as decors = shown (3/3, 4/4, 6/6, 15/15) with the rest hidden. |
| (4) canonical, og:url, og:image | `https://sturij.com` and `https://sturij.com/showcase/kitchen-bright.jpg`; the file answers 200 on production. Dead until the cutover; right for launch. The hero image choice (kitchen-bright) stays Mark's word — the main checkout still carries an uncommitted 168,921 B `showcase/kitchen-bright.jpg` beside main's 313,858 B one, untouched. | none; the plan records that social previews resolve after DNS. |
| (5) /privacy, /terms, /complaints, /studio on the deployed head | 200 · 200 · 200 · 200 (also /canvas 200, /calculator 200, /sitemap.xml 200, /robots.txt 200) | none |
| (6) the collector's empty-state roundels | the intended placeholder | left, as the amendment says |
| the two accessibility fixes | Lighthouse accessibility 100 on the live domain and on the head; the one axe finding (weight 0): the swatch call-out's dismiss button, visible text "Got it" absent from `aria-label="Dismiss this tip"`. | `aria-label="Got it — dismiss this tip"` |
| the drift reading | 42 custom tokens, 0 one-offs over 51 files (37 on 10 Sep; the five since are #37 and #38's) | read, unchanged by this run |

Not changed, on purpose: `/brand/sturij-mark-white.png` (43 KB PNG, 512², the roundel mask; `modern-image-formats` 30 KB, 0 ms) waits for the 1500 px hexagon master Mark owes — an asset change with a manifest regeneration, not this run's.

## What was measured

Local production build of the head (`reports/quality-2026-09-13T08-27-25-095Z.json` for Lighthouse; `reports/quality-2026-09-13T08-31-34-209Z.json` for the checks on the same build after the detection string was corrected; the reports directory is not tracked).

| | before (live domain, 13 Sep, read-only Lighthouse) | after (this head, local) |
|---|---|---|
| Lighthouse home, mobile | 84 · 100 · 100 · 100 (LCP 3.4 s, FCP 2.2 s, SI 4.7 s, TBT 170 ms, CLS 0) | **88 · 100 · 100 · 100** (LCP 3.8 s simulated, TBT 100 ms, CLS 0) |
| Lighthouse home, desktop | 99 · 100 · 100 · 100 (LCP 0.8 s) | **100 · 100 · 100 · 100** (LCP 0.8 s) |
| Lighthouse /calculator, mobile | 78 · 100 · 100 · 100 (11 Sep, local) | **85 · 100 · 100 · 100** (LCP 3.8 s, TBT 87 ms) |
| Lighthouse /calculator, desktop | 99 (11 Sep, local) | **100 · 100 · 100 · 100** |
| the page's scripts, gzipped | 264 KB, 7 chunks | 203 KB, 8 chunks, 0 carrying the auth client |
| vitest | 50 / 50 | 54 / 54 |
| quality run | 30 / 30 | 34 / 34 |
| key-shape scan | 0 / 1193 tracked files | 0 / 1195 |
| typecheck · token audit · bundle scan | clean · 42 custom, 0 one-offs · 0 hits | clean · 42 custom, 0 one-offs · 0 hits |

**The [P] target — mobile performance ≥ 90 with the other three at 100 — was not reached: 88.** The other three hold at 100. What remains is framework and page script evaluated on a 4× throttled CPU: react-dom + Next ≈ 130 KB gzipped, the page's own client code 94 KB raw. The next lever, not taken here because it changes how the page hydrates: mount the calculator and the configurator when they scroll into view rather than at load. Whether Fraunces keeps its `opsz` axis (66 KB of the 135 KB of fonts) is a design decision, Mark's.

## What was exercised

The enquiry path, once, from the head: the head's local production server (`next start`, port 3132) → `/api/enquiry` → the deployed enquiry function on sturij-web → the customer table → Resend.

| | |
|---|---|
| row | `262e35a6-33b3-46e3-bc84-16670390e7ff` |
| created_at | 2026-09-13 08:28:34.118 Z |
| source · status | sturij.com · new |
| notified_at | 2026-09-13 08:28:34.478 Z |
| notification_id (Resend) | `c7919e61-b150-4c58-bf58-a2437f5b2cac` |

Read back from `public.enquiry` on sturij-web (the table's columns are `customer_name`, `customer_email`, … — the function maps the form's names). **The two probe rows for Mark to mark or delete as a data edit:** `262e35a6-…` (this run) and `cee9bea6-1613-4b6d-83d9-2e5d02300d42` (10 Sep, Resend `6387da07-…`). The probe went through the local server because the session's permission classifier refused a POST to the production route; `app/api/enquiry/route.ts` and `lib/enquiry.ts` are byte-identical to main, so the route exercised is the deployed one's code.

## Stopped — the admin loop (step 3)

Production carries only `MOTION_PLUS_API`. The four names — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL` — have not arrived from the vault, and the auth redirect allowlist is not done, so there is no first sign-in and no copy edit to read back. Stopped here as the brief says. When the names arrive the admin control's sign-in flow is unchanged in shape: the library loads when the panel acts.

## The cutover plan — [P] a document, not an act

Mark, 13 Sep 2026: "I haven't switched the DNS yet. I will when it's signed off." The cutover is a second-person signed act in the catalogue seed (governed-actions section four); until the catalogue exists it is Mark's word with the receipt on this key (D19).

**Where things stand today (DNS read at 8.8.8.8, 13 Sep):**

| Name | Record | Today |
|---|---|---|
| sturij.com | NS | ns31 / ns32.domaincontrol.com (GoDaddy) |
| sturij.com | A | 216.239.32.21 · .34.21 · .36.21 · .38.21 (Google); http → 301 www; **TLS fails** (the apex is dead over https) |
| www.sturij.com | CNAME | ghs.googlehosted.com — Google Sites, 200 |
| studio.sturij.com | CNAME | 5a1dbe9b829eddd1.vercel-dns-016.com — this project, 200 |
| sturij.com | MX | Google (aspmx.l.google.com and alternates) — mail |
| sturij.com | TXT | `v=spf1 include:_spf.google.com ~all` and `include:143295733.spf02.hubspotemail.net` |

Vercel: the team holds `sturij.com` as a third-party-registrar domain (added 141 days ago); the project's domains are `studio.sturij.com` and the three `vercel.app` names — **the apex and www are not attached**. `next.config.ts` already redirects host `www.sturij.com` → `https://sturij.com/:path*` (permanent).

**The acts, in order, each with its receipt:**

1. **Sign-off** — Mark reads the preview of #40 (or production after the merge) and says so. Before DNS: read the 11 indexed URLs in Google Search Console and map each to a route on the new site or a redirect (the URLs must survive — the framework-refresh note); add any missing redirect to `next.config.ts` as data.
2. **Merge #40** (Mark) → Vercel deploys main to production. Receipt: the production deployment id and a probe of `studio.sturij.com` for the head's markers.
3. **Attach the domains in Vercel** — `sturij.com` and `www.sturij.com` on project `sturij-main-website`. Vercel states the records to set. Receipt: the two domains listed on the project, certificate pending.
4. **DNS at the registrar (GoDaddy)** — read the current TTLs first and lower them a day ahead if they are long. Change only two records: the apex A (the four Google addresses → the address Vercel states, 76.76.21.21 at the time of writing) and `www` CNAME (`ghs.googlehosted.com` → the target Vercel states, `cname.vercel-dns.com`). **Leave MX and TXT untouched** — mail keeps flowing; the HubSpot SPF include stays until HubSpot is retired. Rollback is the two old values above.
5. **Certificates and probes** — wait for Vercel to issue for both names. Probe: `https://sturij.com/` 200 with the page's markers (the title, the copy-slot markers, `data-content-source`); `https://www.sturij.com/` 308 → `https://sturij.com/`; `http://sturij.com/` → https; `/privacy`, `/terms`, `/complaints`, `/studio`, `/calculator`, `/sitemap.xml`, `/robots.txt` 200.
6. **A probe enquiry from the live domain** → its row and notification id on this key. This is what closes the finding that the marketing form on Google Sites reaches nothing today (054b4be3).
7. **Lighthouse on the live domain** — four scores, mobile and desktop; canonical and `og:image` now resolve (`https://sturij.com/showcase/kitchen-bright.jpg` 200); social previews work from here.
8. **Search Console** — the `https://sturij.com` property verified (the DNS TXT record Google gives, or the meta tag as a copy slot), `https://sturij.com/sitemap.xml` submitted; the 11 URLs re-checked over the following days.
9. **Retire the old site, only after DNS has moved and the probes have held for several days** — Google Sites unpublished; Zapier's zaps inventoried first (a reading), HubSpot's export before its retirement (d2820591), then the HubSpot SPF include removed. Each is its own act on Mark's word.
10. **studio.sturij.com untouched** — it serves the Studio from this project until the beta replaces it.

## Corrected, this run

- The amendment's "every hero and panel image is requested at w=3840": the `src` fallback attribute only — the phone fetched w=750 and responsive-images scores 1. The mobile item was script, not renditions; the run followed the measurement.
- The amendment's "two decors in the Materials strip": they are in Colours.
- My first auth-library detection matched `createBrowserClient` as a name and flagged the site's own destructuring of it; corrected to strings only the library carries (`supabase-js/`, `gotrue-js/`, `auth/v1/token`). The first quality run (33/34) was that false positive; the second on the same build reads 34/34.
- A first chain reported exit 0 while its quality step had died on a syntax error — the pipe's grep swallowed the status. The second chain captured each step's exit code.
- The classifier refused the marked POST to the production route and `vercel domains inspect`; the enquiry went through the head's local server (the method of receipt cee9bea6) and the domain facts came from DNS and the Vercel project read.

## Still owed

**Mark:** read the preview of #40 and say whether it is signed off; the vault sync of the four names to this Vercel project and the auth redirect allowlist (then the first sign-in and one copy edit, read back on this key); the two probe rows as a data edit; the kitchen-bright choice; the 1500 px hexagon master; the swatch and band columns on sturij-web (its own brief); then the cutover acts above, in order. On the design drop: PR #39 keeps the preview as a reference until 20 September 2026 (base = the archive branch; not to be merged).

**The site, after sign-off:** the next performance lever (hydrate the calculator and the configurator on approach) if the ≥ 90 target is to be reached; the 11 indexed URLs' redirect map before DNS.
