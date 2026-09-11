# Sturij — Work Areas Specification v3.0
**Date:** 15 Aug 2026 · **Status:** current build truth · supersedes v2.x
Companion docs: `DESIGN.md` (visual standards) · `COMPONENTS-LIB.md` (component inventory) · `commit-set/` (deployable mirror)

---

## 1. The three work areas

One product, three rooms, one shared visual language (paper, ink, gold — full palette and treatments in `DESIGN.md`).

| Area | File | Purpose |
|---|---|---|
| **Materials** | `studio.html` (+`studio.css/js`) | Pairing studio: boards, paints, worktops, wallpapers, handles, floors. Build a scheme. |
| **Studio** | `canvas.html` (+`canvas.css/js`) | Infinite project canvas: swatch/photo cards, walls, plans, notes — arrange a project. |
| **Creative** | `creative.html` | Research, moodboards/galleries, presentations, social, news, to-dos. |

Support pages: `collection.html` (3D stock surf), `news.html` (news feed), `chat.html`, `mobile.html`, `review.html` (client review flow).

## 2. Global navigation & chrome (all three pages)

- **Work-area slider** — Materials · Studio · Creative pill, top-right of the header (TabSelect port: sliding gold indicator, springy ease), with the **small round × close** button to its right (30px, icon-only). Page transition = iris wash from the click point (`workarea-nav.js`).
- **Action bar** (`action-bar.js`) — embossed pill, top-right under the header: **Layout · Share · Notes** + menus **People** (Contacts/Suppliers/Advisors), **Library** (Links/Materials/Brands), **Settings** (Colour/Screensaver/Backgrounds/Canvas animation). ⋯ collapses; state persists. Unbuilt items confirm "coming soon" via ink slip.
- **Command palette** (`command-palette.js`) — ⌘K on all pages; pages contribute commands via `window.SturijCommands.push()`. Studio tools & search live here (their header buttons were removed).
- **Recording pill** (`rec-indicator.js`) — bottom-centre ink pill whenever any recording runs; sets `body.sturij-rec`.
- **Share sheet** (`share-sheet.js`) — `openShareSheet()`; action-bar Share and board viewer use it.

### Studio header (Materials page) specifics
- Header right: slider + × only. **Search, Visualise, Tools, Boards, Share buttons deleted** — all reachable via ⌘K / voice / action bar; `window.openSearch()` and `window.openStudioTools()` are the programmatic entries.
- Thin contextual bar (cbar): hints on the left; **Photo · Snip · Talk** as 24px grey icon dots on the right — toggle-group behaviour (gold indicator slides behind the active one, fades after ~2.6s), gold pulse while recording.

## 3. Materials (studio.html)

- Board/paint/worktop/wallpaper/handle/floor pickers; side drawers per material; floor rail along the bottom; suggest tray.
- **Paint disc** (Motion ColorPicker port) — docked bottom-right, standing on the floor rail when a floor is set (`body.hasfloor` lifts it).
- **Search drawer** (`#sdraw`) — keyword + voice search over the whole catalogue; opens via ⌘K or `openSearch()`.
- **Visualise** — photoreal room render (Nano Banana endpoint), room type remembered (`sturij-vis-room`); now triggered from ⌘K ("Visualise") / voice; progress via `SturijProgress`.
- **3D board viewer** (`board-viewer.js`) — ⌘K "3D board viewer" or `data-board3d` buttons; registry `showcase/boards3d/boards.json` (9 boards). Tilt/drag 3D board, edge grain, light slider, **bottom action bar: Add to canvas · ♥ Favourite · Share · Order sample** (stores: `sturij.projectAssets`, `sturij.boardFaves`, `sturij.sampleOrders`).

## 4. Studio (canvas.html)

- Infinite pannable canvas, paper background, layer bands (§11 DESIGN.md): background fx → walls → wall-locked items → cards → furniture → chrome.
- **Container standard** (DESIGN.md §4): paper card, floating shadow, gold under-glow selected, pillow buttons (P1), ⤡ resize grip → 🔒 when locked, − minimise / × to home, proportional content scaling with degrade stop.
- **Tilt cards** — swatch/photo cards get the pointer-tilt (maxTilt 15, spring 200/20).
- **Compare reveal** (`compare-reveal.js`) — select two photos → ⌘K "Compare selected photos" → drag-line reveal card.
- Radial + menu (top-right), paint flower, walls with lock/inherit, plan containers.

## 5. Creative (creative.html)

- **MegaMenu nav** — Research · Moodboards · Presentations · Social.
- **Galleries** (`creative-gallery.js`) — add-gallery card → title/summary form → photo strips (drag-scroll carousel, embossed ‹ ›, morphing dots, lightbox with thumbnail rail).
- **To-dos** (`creative-todos.js`) — paper list: drag-reorder, swipe right = done (confetti), swipe left = delete, `creative-create.js` add button.
- **Stock surf** (`collection.html`) — 3D velocity-linked plane wave of `showcase/stock/stock.json`; front-five numbering; click → send to project assets (stays in gallery).
- **News feed** (`news.html`) — paper news page, gold tags, Cormorant headlines.
- **Footer** — links panel with scroll reveal; scroll reveals across sections (24px rise, canonical spring).
- **Research module** (spec'd, build pending): prompt tool → agent-gathered PDF reports → taster in designer chat → shelf library; feeds the shared brain; exportable if the designer leaves.

## 6. Component library (`COMPONENTS-LIB.md` is the ledger)

**Mounted:** command palette, radial menu, work-area slider+wash, action bar, board viewer, paint disc, tilt cards, compare, galleries/carousel/lightbox, to-dos+swipe, confetti, share sheet, rec pill, status badges, scroll reveals, stock surf.
**Shelved (lib-only, load-and-call):** dialog, dropdown+context menu, radio, tabs (underline + segmented), toggle-group+toolbar, toasts (action + notification stack), progress bar/ring, accordion, cursor, hero glows, bobble hover.
All vanilla ports of the Motion+/Radix examples, Motion UMD via CDN, spring language preserved (420/24 radial, 500/35 indicators, 200/7 bobble, etc).

## 7. Data & persistence

- localStorage: `sturij.projectAssets`, `sturij.boardFaves`, `sturij.sampleOrders`, `sturij.abar`, `sturij-vis-room`, work-area + misc UI state.
- Registries (swap to DB later, no component change): `showcase/boards3d/boards.json`, `showcase/stock/stock.json`, `showcase/paints/paints.json`.
- Supabase schema (Sprint 4, applied): `boards`, `board_versions` (immutable), `board_notes`, `approvals`; owner-only RLS; client access via share-token edge functions. API routes spec'd in `commit-set/PRESENT-REVIEW-DEPLOY.md`.

## 8. Deployment

`commit-set/` mirrors every live file and is the hand-off to Claude Code for upload (studio.sturij.com). `github.md` tracks repo `mark-j-walton/sturij-main-website@main`.

## 9. Open items

1. Search/Visualise replacement header treatment (Mark to supply code).
2. Action-bar destinations: Contacts, Suppliers, Advisors, Links, Brands, Colour, Screensaver, Backgrounds, Canvas animation pages.
3. Creative Research module build (spec agreed).
4. Talk (voice control) beyond search — full command grammar.
5. Floor-plan room view on canvas (walls/skirting/ceiling toggle, camera) — spec'd in DESIGN.md, build pending.
6. Framer bridge — components page exported (`Sturij Components.html`); Framer agent setup on Mark's machine.
