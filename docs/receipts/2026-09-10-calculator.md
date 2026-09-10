# Receipts — the calculator artifact · 10 September 2026

Session `claude-code-session-2026-09-10-calculator` · Claude Code, model claude-fable-5-1 · the brief run as written.
Branch `claude/calculator-2026-09-10`, stacked on `claude/public-site-2026-09-10` (PR #35). Draft PR: see the branch's PR on GitHub. Nothing merged, nothing deployed by this session.

Precondition as found: the brief waited for the design-drop branch and a rebase of the public-site branch onto it. Neither had happened; instead Mark merged the public-site PRs (#33, #34) into main himself, so the restructure is on production and the drop will rebase onto main by its own brief. Proceeded on Mark's present word.

## What shipped (on the branch)

| Piece | Where | Note |
|---|---|---|
| The band table, versioned | `data/band-table.json` | v0, dated 2026-09-10, review 2026-12-10; sha256 of the canonical JSON `fdbda1df7f9817035f1462f90abf2678e6efe60ce5d3d5e5ac1f910d8b743f5a` (the file's bytes `a94a87db…f12fa7`) |
| The band, computed from the table only | `lib/band.ts`, `app/api/band/route.ts` | server-side; the reply carries the band and its derivation, never the formula; GET is the table's reading |
| The artifact | `artifacts/calculator.json`, `components/calculator/Calculator.tsx`, `components/calculator/Elevation.tsx`, `app/calculator.css` | configuration · tier · band; finishes read from the configurator; an SVG elevation at real proportions with the chosen board applied |
| The mounts | `app/page.tsx` (a section before the enquiry band), `app/calculator/page.tsx`, `pages/home/layout.json`, `pages/calculator/layout.json` | the route name is Mark's to change |
| The enquiry carries the band | `components/EnquiryBand.tsx`, `lib/enquiry.ts`, `ConfiguratorProvider` (`guide`) | "Guide from the calculator: … — a guide, not a quote" inside the message text (the function has no column; a recorded misfit) |
| The admin reading | `components/admin/AdminControl.tsx` | version, dated, review due, checksum shown to a signed-in admin |
| Content types | `artifacts/content-types.json` | configuration, tier, band |

## What the table carries (as the SPA had it)

- The fitted wardrobe run (DesignYours.priceGuide): bays = clamp(2…10, round((width − 200) / 500)); £980 + bays × £420; painted doors × 1.15; four layouts (Everyday wardrobe, His & Hers, Drawers in the middle, Dressing wall) that change the drawing, not the figure.
- Four pieces (site/data.ts): Bedside pair £165 + £0.18/mm × 2; Tall boy £320 + £0.32/mm; Window bench £380 + £0.24/mm; Hall console £290 + £0.22/mm.
- Three tiers with their lines: Standard × 1 (Egger matt boards · steel runners · 10-yr board guarantee); Signature × 1.35 (Feelwood textured decors · Blum Tandem soft-close · brass or black hardware); Atelier × 1.9 (Veneer & painted finishes · Häfele solid-metal fittings · hand-finished edges).
- The band: the SPA's own spread × 0.92 to × 1.10 around the figure, rounded to £5 at both ends (the brief; the SPA rounded the wardrobe guide to £50 and the pieces to £5 as a single figure).
- v0's declared compositions: the tier multipliers apply to every configuration (the SPA applied them to the pieces only); the painted uplift applies to fitted runs only (where the SPA had it). Both are lines in the table's notes, to be replaced by ranges derived from issued quotes.

## What was measured

Local production build, 10 Sep 2026 (`reports/quality-2026-09-10T21-37-08-090Z.json` and the run that followed):

| Check | Result |
|---|---|
| vitest | 47 / 47 (fixtures: tall boy 600 mm Standard £470 – £565; bedside pair 500 mm Signature £635 – £755; fitted 3200 mm Everyday Standard 6 bays £3,220 – £3,850, painted £3,705 – £4,430; tiers' lines; the route; the enquiry's guide line; the artifact and its two mounts) |
| typecheck | clean |
| token audit | 0 one-offs over 49 files; 37 custom tokens |
| bundle scan | 0 hits — no `perMm`, `perBay`, `"mult":` or `finishUplift` in any client chunk (a first build had them; fixed by passing the view data from the server page) |
| key-shape scan | 0 hits |
| quality run | 27 / 27 — /calculator prices £3,220 – £3,850 from the table, draws the elevation declared a drawing, no overflow at 390; /api/band reads v0, review 2026-12-10 |
| Lighthouse / (mobile · desktop) | 77 · 100 · 100 · 100 (LCP 4.6 s) · 98 · 100 · 100 · 100 |
| Lighthouse /calculator (mobile · desktop) | 78 · 100 · 100 · 100 (LCP 4.5 s, CLS 0, TBT 122 ms) · 98 · 100 · 100 · 100 (LCP 1.1 s) — `reports/quality-2026-09-10T21-39-00-242Z.json` |

## What was corrected

- A first build put the band table in a client chunk (the whole JSON import); the client artifact now receives its view data from the server page and the bundle scan enforces it.
- Three small mono labels used ink-faint on paper (2.8:1); they now use ink-muted — accessibility back to 100.
- Git Bash converts a bare `/calculator` argument to a Windows path (the MSYS trap the vault tooling already documents); the Lighthouse pass on that page runs with `MSYS_NO_PATHCONV=1`.

## Findings and misfits

- The SPA has four layouts where the brief said three internal options; carried as the SPA has them — Mark to name if the labels or the count are wrong.
- No elevation masters exist for wardrobes or the pieces (the door styler's masters are six door profiles); the preview is geometry drawn from data with the swatch as a pattern fill under a shading layer — the same mechanism, no photograph pretended.
- The enquiry table has no column for the band (nor the swatch); both travel in the message text until sturij-web gains the columns (Mark's word, its own line).

## Still owed

- Mark: the route name; the layout labels and count; three tiers confirmed; the merge after #35; the band table's review on 10 Dec 2026 or when issued quotes exist.
- The next session: the pricing manifest and quote records that turn v0's formulas into ranges from issued quotes; the Studio mount when the Studio lands on the core.
