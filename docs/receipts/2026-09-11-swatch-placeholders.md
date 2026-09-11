# Receipts — the swatch placeholders and the remix · 11 September 2026

Session `claude-code-session-2026-09-11-swatch-placeholders` · Claude Code, model claude-fable-5-1 · on the spine front (the public site), from Mark's two mocks and his example roundel PNG.
Branch `claude/swatch-placeholders-2026-09-11` off main `5d19287` (main carries #33–#36) — PR #37, MERGED by Mark at 08:55 UTC (merge `5067fd0`, on production at 08:55:35). The same-day follow-up below is on branch `claude/range-montage-2026-09-11` off that merge, its own draft PR. Nothing merged or deployed by this session.

## What Mark asked (restated)

Beside every remixable image block, four very transparent placeholders mark where a visitor's swatches (up to four, from the roundel generator in the range) will land; a made swatch replaces its placeholder in position so the function is obvious; tapping a swatch remixes that block's own image into that block's own room type (wardrobes → bedroom, media walls → living room, each card → its room), true to the scheme, the rest of the room's colours and furnishings complementing the selected finishes; one dismissible call-out per block, dismiss one and all dismiss, with the reminder toast. Another screen follows.

## What shipped (on the branch)

| Piece | Where | Note |
|---|---|---|
| The placeholders | `components/configurator/SwatchRail.tsx`, `public/brand/sturij-roundel-sample.png` (asset `brand.roundel-sample`) | four slots always; an empty slot is Mark's example roundel at opacity 0.14 (custom token `placeholder.opacity`; 0.3 on hover); tapping one scrolls to the range |
| The binding to the block | `components/Features.tsx`, `components/StackCards.tsx`, `app/page.tsx` | both features carry a rail on their outer side, bound to bedroom / living room; the stacking cards carry two rails flanking the pile (slots 1–2 left, 3–4 right), remixing the pinned card |
| The remix | `lib/render.ts` (`base`, `validateBase`, the remix prompt, the base as the first inline part), `app/api/render/route.ts` (`loadBase`: the server reads its own image, resized to 1024 JPEG), `components/configurator/VisualTarget.tsx` (`base` prop) | only the site's own images may be a base (`/showcase/…` or a public object in the `site-images` bucket); the prompt keeps room, camera, layout, furniture and light, re-finishes only the fitted furniture, and makes the rest complement the scheme (or uses the visitor's room finishes when chosen) |
| The call-out and the toast | `SwatchRail.tsx`, `components/configurator/Toast.tsx`, `ConfiguratorProvider` (`tipsDismissed`, `dismissTips`, `toast`; `localStorage` key `sturij_swatch_tips`) | one per block; dismissing one dismisses all; the toast reads "Remember: if you see a swatch, you can remix the image and the room type with your created swatches." for seven seconds |
| Declarations | `artifacts/swatch-rail.json`, `design/sturij-public/DESIGN.md` (two custom tokens → 39), `assets/sources.json` | the rail's properties, capabilities, tokens and its reference to Mark's mocks |

## What was measured (first pass)

Local production build, 11 Sep 2026 (`reports/quality-2026-09-11T06-22-58-383Z.json`):

| Check | Result |
|---|---|
| vitest | 48 / 48 (the remix prompt; the base allowlist refuses `..` and other hosts, accepts the showcase and the bucket; five parts with the base first) |
| typecheck | clean |
| token audit | 0 one-offs over 50 files; 39 custom tokens |
| bundle scan · key-shape scan | 0 · 0 |
| quality run | 29 / 29 — four rails on load with 4 + 4 + 2 + 2 placeholders and no swatches; three call-outs → 0 on one dismissal; the toast present with the reminder |
| Lighthouse / (mobile · desktop) | 78 · 100 · 100 · 100 (LCP 4.6 s, CLS 0) · 99 · 100 · 100 · 100 |
| Lighthouse /calculator (mobile · desktop) | 79 · 100 · 100 · 100 · 99 · 100 · 100 · 100 |

Screenshots checked: the four faint roundels beside each feature image with the call-out; two and two flanking the stacking cards.

## Follow-up, the same day — the range, the minis, the montage

Mark's third mock (the range section, Photoshop over a screenshot) and a message mid-turn with three supplier montages, then `blum.zip` on his Desktop. Mark merged #37 while this was being built, so the follow-up went to its own branch and draft PR off the merge.

### What Mark asked (restated)

The main finish carousel inside the page width like the minis, its edges faded rather than cut; the four placeholders beside the roundel in the range; the three inactive mini galleries dimmed less — the swatch colours were lost — trying a light/white frost instead of the dark; the same call-out on the range. Then: the montage whose squares reveal the image underneath should show a different image when the visitor comes back up, from three supplier montages (Hendel & Hendel handles, Egger/Cleaf boards, Blum hardware); the alignment of images to squares may need thought.

### What shipped (same branch)

| Piece | Where | Note |
|---|---|---|
| The carousel inside the page | `app/site.css` (`.galmain`), token `mask.fade-x` | max-width 1180 like the minis; an 8% fade at both edges by CSS mask, no hard cut |
| The minis lifted | `app/site.css` (`.gmini`), token `glass.mini-frost` | ribbon opacity .32 → .62, saturation and brightness nearer full; a light frost (rgba(250,248,242,.09), 1px backdrop blur) over each in place of the dark dimming; both variants screenshotted — the frost reads lighter and keeps the colours, so it stays |
| The range rail | `SwatchRail.tsx` (variant `range`, `tipAt`), `FinishConfigurator.tsx` (`.eb-round`), tokens `placeholder.opacity-on-dark` (0.22) | the same artifact, a third variant: four 64px placeholders beside the roundel where the session's swatches collect; a made swatch there sends the visitor to the first remixable block; an empty one to the galleries; the call-out sits under the last slot, clear of the tabs on desktop; on the phone it covers the tabs until dismissed (dismiss-all still applies) |
| The montage rotation | `components/Montage.tsx`, `lib/slots.ts` (`montage.image`, `montage.image-2`, `montage.image-3`), `pages/home/layout.json`, `assets/sources.json` (kind `partner`), `public/showcase/montage-*.jpg`, `artifacts/montage.json` | a random one of the three per visit; when the visitor scrolls back above the montage with every tile closed, the next takes its place unseen, so the next reveal is a different image; six rows, columns from the image's aspect (2:1 → 12×6) so the tiles stay square and nothing is stretched; the tiles paint a next/image rendition ≤ 2048px, never the master; the other two preload only once the montage is near; the admin's `data-image-slot` follows the image shown |
| The supplier images | `blum.zip` → `montage-handles.jpg`, `montage-boards.jpg`, `montage-hardware.jpg` | 3000×1500 masters resized to 2400×1200 (boards 1.38 MB → 567 KB) to sit under the 800 KB asset limit |
| Tests and checks | `test/assets.test.ts` (+2), `scripts/quality.mjs` (8b counts five rails / sixteen placeholders; 8c drives the montage to the end and back and expects the swap), `scripts/check-tokens.mjs` (`--ar` runtime) | |

### What was measured (second pass)

Local production build, 11 Sep 2026 (`reports/quality-2026-09-11T09-11-55-795Z.json`):

| Check | Result |
|---|---|
| vitest | 50 / 50 |
| typecheck | clean |
| token audit | 0 one-offs over 50 files; 42 custom tokens |
| bundle scan · key-shape scan | 0 · 0 |
| quality run | 30 / 30 — five rails on load with 4 + 4 + 4 + 2 + 2 placeholders; four call-outs → 0 on one dismissal with the toast; the montage: 3 images, 12 columns, 72 square tiles, all 72 on at the end of the track, back above it 0 on and the image swapped (1 → 0), the tiles painting a rendition |
| Lighthouse / (mobile · desktop) | 84 · 100 · 100 · 100 (LCP 4.2 s, CLS 0) · 99 · 100 · 100 · 100 — mobile up from 78: the montage no longer loads a master |
| Lighthouse /calculator (mobile · desktop) | 78 · 100 · 100 · 100 · 99 · 100 · 100 · 100 |

Screenshots checked (1440 and 390): the carousel inside the page with soft edges; the minis with and without the frost side by side; the four placeholders beside the roundel with the call-out under them; the montage at 12×6 with the handles image on desktop and the Blum image on the phone (a different random pick).

### Corrected on the way

- The calculator's elevation drew its SVG gradient ids from a module counter, which differed between server and client (a hydration mismatch in the dev overlay, on main since PR #36); the ids now come from `useId`.
- The three images Mark pasted mid-turn were not retrievable from the transcript (a mid-turn message is not persisted until the turn ends); the zip on his Desktop was the way in.

## Not exercised

- The remix itself against the model: the deployment carries no `GEMINI_API_KEY`, so `/api/render` answers `E_NOT_CONFIGURED` here and on production. The prompt, the parts and the base allowlist are tested; the first real remix is the receipt still owed, once the vault names reach the project.

## Corrected during the first pass

- Mark's "roundel" PNG is a composed example swatch, not a mask; it became the placeholder ghost itself (which reads better than a flat hexagon) — the hexagon mask stays on the roundel and the montage.
- The stack rails sat under the pinned cards, hiding their call-out; the rails now layer above the cards.
- The quality script's new check used a page the run had already closed; it now opens its own.

## Still owed

- Mark: the vault names on the Vercel project (the remix, the render and the admin login all wait on them); his read of the range call-out's position on the phone (it covers the tabs until dismissed); the four layouts and the route name from the calculator PR.
