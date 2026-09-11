# Present & review — deploy notes
_Productionisation of PRESENT-REVIEW-SPEC.md, rebuilt 2026-08-14 on the **Sprint 4 boards schema** (Mark's SQL, already applied)._

## Schema mapping (spec → boards model)
- Publication = immutable `board_versions` snapshot + `boards.published_version` pointer. **One live publication per board** (the spec said per wall — the boards schema pins one pointer per board; publish the composite wall, or use one board per wall).
- Clients are **anonymous** via `boards.share_token` — all client traffic goes through `/api/review/client` (service role validates the token). No client accounts.
- Notes → `board_notes` (author `client`/`designer`, `reply` non-null = green). Approvals → `approvals` keyed on `swatch_key` (= canvas item id).
- "All responses ready" → `boards.responded_at` (added by the delta migration).

## Files (map to spec prompts)
| Prompt | File |
|---|---|
| 1 — schema | `supabase/migrations/20260814_present_review.sql` (**delta**: `presentations` + `boards.responded_at`) |
| 2 — publish route | `api/review/publish.js` |
| 3 — narrative route | `api/present/narrative.js` |
| 4 — customer review page | `review.html` (client mode via `?t=<share_token>`, API + 8s polling) |
| 5 — designer replies + notify + sync-back | `review.html` (designer mode, magic link + Realtime) + `api/review/respond-done.js` + `review-sync.js` |
| 6 — save + share link | `api/present/save.js` + `api/p/[id].js` + `vercel.json` rewrite |
| — client API | `api/review/client.js` (token-validated GET/POST: notes, delete, approvals) |

All routes are dependency-free Vercel functions (plain `fetch`) — the repo stays build-free.

## Vercel env vars
- `SUPABASE_URL` — https://oqduxjquzbvetkcllymd.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`, `RESEND_FROM` (e.g. `Sturij <hello@sturij.com>`)
- `REVIEW_URL` — e.g. `https://sturij.com/review` (share links become `REVIEW_URL?t=<token>`)

## Client config
- `review.html`: paste the **anon key** into `CFG.supabaseAnonKey` (publishable; RLS enforces access).
- Canvas: set `window.STURIJ_SUPABASE = {url, anonKey, boardId}` before loading `review-sync.js`. It exposes `publishWallLive`, `fetchNarrative`, `savePresentation`, `listPresentations`, `notifyResponsesReady`, and runs the approval sync-back (canvas.js must expose `markItemApproved(itemId, approved)`).
- Notification email goes to `boards.client_email` — set it when creating the board.

## Steps
1. Run the delta migration (`presentations` + `responded_at`).
2. Enable Realtime on `board_notes`, `approvals`, `boards` (Database → Replication) for the designer's live view.
3. Set env vars; deploy repo (routes land under `/api/*`, `/p/:id` rewrite in `vercel.json`).
4. Paste anon key into `review.html`; enable the Email (magic link) auth provider for designers.
5. Test the round-trip: publish → client link → note → reply → respond-done email → approve → board tick.

## Behaviour notes
- Republish carries over unreplied notes to the new version and clears `responded_at`.
- Client "delete own note" = any unreplied client note on the link (no per-client identity by design).
- Designer's approval ticks are display-only; approval is the client's action.
