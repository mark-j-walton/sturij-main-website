# Receipts — the swatch placeholders and the remix · 11 September 2026

Session `claude-code-session-2026-09-11-swatch-placeholders` · Claude Code, model claude-fable-5-1 · on the spine front (the public site), from Mark's two mocks and his example roundel PNG.
Branch `claude/swatch-placeholders-2026-09-11` off main `5d19287` (main carries #33–#36). Draft PR: see the branch's PR on GitHub. Nothing merged or deployed by this session.

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

## What was measured

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

## Not exercised

- The remix itself against the model: the deployment carries no `GEMINI_API_KEY`, so `/api/render` answers `E_NOT_CONFIGURED` here and on production. The prompt, the parts and the base allowlist are tested; the first real remix is the receipt still owed, once the vault names reach the project.

## Corrected during the session

- Mark's "roundel" PNG is a composed example swatch, not a mask; it became the placeholder ghost itself (which reads better than a flat hexagon) — the hexagon mask stays on the roundel and the montage.
- The stack rails sat under the pinned cards, hiding their call-out; the rails now layer above the cards.
- The quality script's new check used a page the run had already closed; it now opens its own.

## Still owed

- Mark: the vault names on the Vercel project (the remix, the render and the admin login all wait on them); the next screen he mentioned; his read of the four layouts and the route name from the calculator PR.
