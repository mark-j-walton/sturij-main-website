# Receipts — the content sections, the claims registers, the legal pages, the identity · 13 September 2026

Session `claude-code-session-2026-09-11-site-content-sections` · Claude Code, model claude-fable-5-1 · the Architect's brief of 11 Sep with addenda 1–7c, run as written on 13 Sep on Mark's paste.
Draft PR #42 https://github.com/mark-j-walton/sturij-main-website/pull/42 — branch `claude/content-sections-2026-09-13` off `claude/materials-feed-2026-09-13` @ c8dc87e (stacked on #41; GitHub retargets to `main` when #41 merges). **Nothing merged. Nothing to production.**

MERGED ≠ DEPLOYED ≠ EXERCISED — each line below says which.

## The records read whole, through the door

| Record | Where | Version · hash | Used for |
|---|---|---|---|
| `site-copy-family` | Sturij Marketing, doc caa74546 | v1 · `68e5cd4a…becd435` (41,789 B) | the eight parts → the seven sections as data |
| `page-platform` | Verryfy, doc 60313c61 | v2 (locked) · `aa9a31be…` | S5 layouts, S8 the reading, S12 |
| Privacy & Data Protection Policy — Condensed | Notion, doc 049b7311, `notion:114a32ca2c0d4ad5a256f63a943d82a9` | v1 · `160f1ea8…65b87e` | /privacy, byte-faithful |
| Compliments & Complaints Policy — Condensed | Notion, doc 95074afa, `notion:022071c65f304e38b1902d676bc4c629` | v1 · `aaa934e9…45013` | /complaints, byte-faithful |
| The terms and conditions | **no record in the brain** — searched by title, by phrase and through the question door; the Sturij Marketing collection's 13 rows are marketing-app documents and artifact-vault summaries | — | /terms renders the page as published on sturij.com (3 Feb 2026; text extracted without rewording, sha `3e449c10…`), labelled as awaiting its record; filing it is a proposal |

## What shipped (on the branch)

| Commit | What |
|---|---|
| `0e643dd` | The seven sections as pages on the core — `/boards`, `/hardware`, `/fixtures-and-fittings`, `/handles`, `/lighting-and-services`, `/worktops`, `/how-we-price` — each a layout (`pages/<id>/layout.json`) over `content/sections/<id>.json`; `lib/sections.ts` (the held logic, the claim-closing slots `claim.<section>.<row>`, the partner gate, the held reading); `components/SectionPage.tsx`, `Faq.tsx` (native `<details>`, FAQPage JSON-LD from the same visible items); `content/partners.json` (five entries, all held); the pricing short line under both calculator bands; the identity layer (`content/identity.json`, `lib/identity.ts`, the footer's disclosures on every page, the © line with the year, ® only with a registration number, Organization + LocalBusiness JSON-LD with sameAs); every "Harrogate" as the workshop → Skelmanthorpe; the legal pages (`lib/legal.ts`, `components/LegalPage.tsx`, `content/legal/*.json`, the old static pages parked under `legacy/legal-2026-02-03`); `/accessibility`; the social-links artifact (URLs as footer slots); the reviews artifact over `content/reviews.json`; `app/sitemap.ts` from the register; content types section/faq/claim/partner/identity/legal/review; four artifacts declared |
| `e0cc8fa` | `test/content.test.ts` (32 assertions across the go-live rule, the partners, the legal hashes, the identity, the reviews rule, the register, the rights register); the S5 block of `test/platform.test.ts` rewritten for the page register; `scripts/quality.mjs` +5 checks; `assets/rights.json` (45 rows, 21 [P]); `docs/proposals/2026-09-13-legal-next-versions.md`; two corrections (below) |
| this commit | the heading order on the section pages (h1 → h2 → h3), the wordmark pinned in the nav, the legal document's typography, a check-less quality run now fails, these receipts |

Vercel built each push from git: `0e643dd` success (`dpl_…HqxXoegXt5RjaemsBLqSnBqo9Zyv`), `e0cc8fa` success. The previews are behind Vercel Authentication (the team's setting). No GitHub workflows in this repository.

## The go-live rule — the held count per page (the reading on `<main data-held>`; read from the served build at 1440, 1024 and 390)

| Page | Held | Of which lines · FAQ lines · partner entries · gated parts | FAQ shown / in the register | The open rows |
|---|---|---|---|---|
| /boards | 9 | 5 · 4 · 0 · 0 | 6 / 8 | atelier-veneer, board-guarantee, cleaf-ranges, distributors-named, egger-one-collection, egger-textures, pfleiderer-line, sustainability |
| /hardware | 12 | 6 · 6 · 0 · 0 | 1 / 7 | adjustment, blum-facts, blumotion, hafele-atelier, hardware-warranty, push-to-open, runners-loads, tiers-hardware |
| /fixtures-and-fittings | 7 | 3 · 4 · 0 · 0 | 3 / 6 | hafele-atelier, hafele-facts, hafele-ranges, lighting-options, sugatsune |
| /handles | 8 | 5 · 3 · 0 · 0 | 3 / 6 | backplates, finishes-palette, fitting-warranty, hh-design, hh-guarantee, hh-materials |
| /lighting-and-services | 8 | 1 · 2 · 5 · 0 | 4 / 6 | lighting-dimming, lighting-options, the five partner entries (consent and review date) |
| /worktops | 7 | 3 · 3 · 0 · 1 | 4 / 7 | joins-bookmatch-viewing, partner-process, sintered-performance, the Omega Stone section (partner:omega-stone) |
| /how-we-price | 1 | 1 · 0 · 0 · 0 | 0 / 0 | supply-charge ("up to 10%" or fixed — Mark) |
| **total** | **52** | | | |

A held line is absent from the DOM; its empty outline (`.held`, display none) exists for the admin's editing mode, where it shows as a dashed box naming the row — Mark types the closing line in place and it lands in `site_content_slots` under `claim.<section>.<row>`; the line appears on the next revalidation. The quality run reads every section page and confirms no held line's text is in the page (`leaked 0` on all seven). Sentences were split at a [P] marker where one sat mid-sentence (the handles' backplates clause; the boards' Lawcris line) so the sourced half renders.

## What was measured (local production build of the head, `reports/quality-2026-09-13T22-18-48-291Z.json`)

| Check | Result |
|---|---|
| vitest | 86 / 86 (7 files; 32 new assertions in `test/content.test.ts`; the S5 block per layout) |
| typecheck | clean |
| key-shape scan | 0 / 1,255 tracked files |
| token audit | 45 custom tokens (the drift reading, unchanged from #41), 0 one-offs over 74 files |
| bundle scan | 0 hits |
| quality run | 41 / 41 (five new: every page in the register answers 200 with the disclosures and the NAP; every section page declares its held count and no held line is in the page; finance, the FRN and "Harrogate workshop" nowhere; the organisation JSON-LD on every page and FAQPage on every section with visible questions; a first visit sets no cookie and uses no storage) |
| the page register | 14 pages (home, calculator, seven sections, accessibility, three legal); the nav group and the footer row derive from it; `sitemap.xml` generated from it |
| three sizes (Playwright, 1440 · 1024 · 390) | all eleven new pages 200, no horizontal overflow, Fraunces on every h1, the disclosures and the NAP in every footer, three social links with `rel="noopener noreferrer"`, the FAQ accordion opens, 0 console errors |
| Lighthouse (this head) | home mobile 83 · 100 · 96 · 100 (LCP 4.4 s simulated; #41's head read 82–85 across runs, #40's 88 — the machine carried the other session's dev server and Lighthouse runs at the time); home desktop 100 · 100 · 100 · 100; /calculator mobile 85 · 100 · 96 · 100, desktop 100; /boards mobile 93 · 100 · 96 · 100 (LCP 3.1 s, TBT 130 ms) and desktop 100 · 100 · 100 · 100 after the heading-order fix (93 · 98 · 96 · 100 before it); /how-we-price mobile 92 · 98 · 96 · 100; /privacy mobile 91 · 100 · 96 · 100, desktop 100 |

The two Lighthouse flags: accessibility 98 on the section pages was `heading-order` (a block title at h3 under the part's h1) — fixed in this commit; best-practices 96 on every page was `image-aspect-ratio` on the nav wordmark: the audit measured it at 79 × 38 (2.08) against the file's 273 × 98 (2.79) on the phone viewport — the nav's flex row was squeezing the brand link. Pinned (`flex: 0 0 auto`); measured after the fix at 412, 390 and 1440: 105.8 × 38 and 139.3 × 50, the file's ratio, no overflow.

## Exercised

Nothing on production. The pages, the held rule, the partner gate, the legal rendering and the identity were exercised on the local production build (the quality run and the three-size probe above). Not exercised: an admin closing a row through the slot table (the deployment has no public names yet — take-to-live's owed item); the Vercel previews from outside (SSO).

## Corrected, this run

- The trade-mark registration pattern first allowed eight digits only; UK numbers run to eleven (`UK00003456789`) — widened.
- The registered office had crept into the legal page's identity line; addendum 1 puts it in the footer and nowhere else — removed from the legal page (the records' own text keeps it, byte-faithful).
- My content test's finance check matched "financial incentive" in the trades statement; tightened to the word "finance", the FRN, the broker's name and "introducer appointed representative" — the quality run's check likewise, after a shell pass silently stripped the regex's backslashes and left a check that could never match.
- A quality run that never reaches a check (a refused port) reported 0/0 and exited 0 — it now exits 1 and says so.
- The heading order on the section pages (h1 → h3) — fixed.
- **A second writer in the worktree.** `--wt-public-site` carried another session's uncommitted work (the materials-feed session continuing on the finish renders) beside this run's, with its dev server on :3160 — a breach of ONE writer. This session committed only its own paths, vacated to `--wt-content-sections`, and returned the shared worktree to `claude/materials-feed-2026-09-13` with that work untouched.
- The Bash tool truncates a command over about 6 KB; the generators and long documents went through script files and the file tool instead.

## Proposals on the key, none edited (docs/proposals/2026-09-13-legal-next-versions.md)

The privacy policy's next version (the controller as the ICO register shows it, the reference [P], the DPO line for Mark's decision, the processors as they now are, the photography clause aligned to 4b2489df, the Article 13 items, the cookies sentence); the terms' next version (file the published text as v1 first; the consumer-contract items and the bespoke exemption; deposits, payment after template, the supply charge as a term; guarantees with their guarantor; the finance clause dropped or dormant — Mark's; the "Sturij Innovation Limited" account-name slip); the complaints policy's ADR line (Mark's word); no cookies page while the inventory stays clean; the accessibility statement as built. [P] A solicitor's review of the terms and the privacy policy before the cutover — Mark's decision.

## Still owed

**Mark:** the closing lines for the 52 held rows, one by one in the admin editing mode once the public names reach the deployment (Part 8's list: Pfleiderer, Cleaf, Egger as the default, the Häfele ranges, Sugatsune's fittings, the H&H palette and collections, the Blum tiers, Häfele at Atelier, the lighting system, the quartz and sintered brands; the guarantees — the 10-year board guarantee's guarantor, the hardware and fitting warranties, H&H's lifetime terms; the options; the five partners' consent and review dates and Haus Creative's contact name; "up to 10%" or fixed; whether Lawcris is named); the Trustpilot profile URL and the Google Business Profile URL (footer slots; a link is a link); the ICO registration reference (for the privacy proposal); the UK trade-mark registration number (® stays off until then); the three platforms' official icons dropped into `public/brand/social/` from their brand resource centres; the terms filed as a record; the ticks on the proposals; the Google Business Profile aligned to the Skelmanthorpe NAP; from take-to-live, still: the four vault names, the redirect map (the old legal URLs keep answering at /privacy, /terms, /complaints), the cutover.

**Not this run's, by rule:** the acknowledgement email's footer (sturij-web's function); the theme of the render lab writing scene ids onto the rights rows; a consent banner (nothing needs one today).
