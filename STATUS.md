# Sturij — Project status & handover
_Written 2026-08-14 · design workspace "Design system decisions needed"_

## What this project is
A working front-end prototype suite for Sturij's designer tooling, built to the light **paper/gold pattern language** (`PATTERNS.md`): paper #F7F4EE, ink #1D1D1D, gold #D4A01B, Cormorant Garamond + IBM Plex Mono. The dark sage/gold **shell design system** is used only for shell-family surfaces (mobile companion). Everything runs on localStorage; Supabase specs exist for productionising. `commit-set/` mirrors every deliverable for pushing to `mark-j-walton/sturij-main-website`.

## Delivered — files & features

### Pairing Studio (`studio.html/css/js`)
- Vertical material panels (Walls, Ceiling, Skirting, Boards, Carcass, Worktops, Floors) with consistent black tabs, drawer-style filter dropdowns (multi-select colour bars, Egger finish/style cascades), wall paper/paint toggle
- Favourites drawer (translucent, bottom-docked), suggested pairings tray (floating, minimise/close), post-it notes that stick to scroll and reveal sample names
- Photo (multi-panel snapshot incl. post-its), zip export (scheme photo + large swatch per visible panel), share URL (hash-encoded), Snip tool, gold 1px separators
- **Visualise** → POSTs scheme photo + up to 14 labelled swatch refs to `sturij.vercel.app/api/render` (Nano Banana), `scenario:'pairing-studio'`, room-type picker; render lands in shortlist

### Canvas whiteboard (`canvas.html/css/js` + `canvas-fx/chat/menu/saver.js`)
- Infinite pan/zoom board; walls (versioned containers, publish, dock-to-doc, pages), swatches, stacks (drag-to-stack, swipe browse), post-its, text, image library, projects switcher, undo/redo
- Floor plans: draw tool (45°/50mm snap, shoelace area, ported from visualiser geometry), doors/windows with swing arcs (ported from PlanView.tsx), wall colours/styles/widths, zones, grids, pins with photo lightboxes
- Furniture palette (top-down SVG symbols, 8 categories) with drag-drop placement
- **Wardrobe builder — real carcass engine** ported verbatim from `sturij-visualiser/src/carcass/{engine,cutlist}.ts`: derived interior, bay division, Blum reveals (5/0/2/2/5), full cut list (sides, central panels, cross members, base, applied back, fronts, drawer boxes, shelves) → board m² +15% waste, hinges/runners/rails, joiner days → price. Built units become palette thumbs, snap to sibling units + plan walls, and self-price in the estimator
- **Info modal / estimators**: Paint (age/condition/finish, tins, time allowance), Wallpaper (rolls from drops), Wardrobes (engine-built + catalogue units), Estimate (room type, scope checkboxes, per-zone hard/soft flooring, pattern wastage — straight 8% / diagonal 12% / herringbone 15% / chevron 20% / tile 10%, Standard/Premium/Custom £, decorator+fitter days, room budget), Guides
- **Present** → renders walls to slides, Claude writes title/intro/captions/close, branded deck with materials schedule, print-to-PDF
- **Publish** → wall version to customer review; approvals sync back to board's approved doc
- Motion-style container language (top title bar, bottom-right resize lines, circle-X), colour picker, dot-grid depth background, glass screensaver, radial submenu, effects playground (ForceField-style tweakables)

### Customer review (`review.html`)
Customer/designer role toggle; published wall versions; click-to-drop yellow post-its; designer replies turn notes green; "All responses ready" notification banner; material approval ticks flow back to the board.

### Chat (`chat.html`, `chat-core.js`, `customer.html`, canvas drawer)
Designer hub (assistant + customer threads, project assignment, status, end-of-chat summaries), customer mobile thread, shared localStorage store.

### Mobile companion (`mobile.html`) — shell design system
iPhone bezel on desktop, native fill on phone/iPad. Tabs: Today (diary/tasks/news), Capture (photo/files → project inbox), Projects (inbox accept/delete → library, viewer), Record (meeting recorder, Meeting/Follow-up skills, AI summary, ACTION lines → tasks), Chat.

### Specs written for Claude Code (in `commit-set/`)
- `CHAT-SPEC.md` — Supabase chat backend (sessions/messages, realtime, uploads, notifications, brain archiving)
- `PRESENT-REVIEW-SPEC.md` — presentations + review round-trip: 4 tables + RLS, routes, Resend notifications, verbatim narrative prompt, **6 numbered Claude Code prompts**
- `SPRINT4-SUPABASE.md` — board persistence
- `PATTERNS.md` — the pattern statement governing all studio/canvas surfaces

## Planned, not delivered
1. **Chat Sprint 2** — real Supabase backend replacing localStorage bridge (spec ready)
2. **Review/present productionisation** — run the 6 prompts in PRESENT-REVIEW-SPEC.md (spec ready)
3. **Deploy side**: add live origin to `RENDER_ALLOWED_ORIGINS` on the sturij Vercel project; add `scenario==='pairing-studio'` prompt branch in `render.js` (current prompt language is wardrobe-specific)
4. **design.md** for the main Sturij design system — Mark to do in office
5. **Design-system reconciliation** — customer-facing Sturij project's system vs shell system vs PATTERNS.md; current ruling: PATTERNS.md for studio/canvas/chat/review, shell for shell-family (mobile, TradeAI hub)
6. **Estimator handoff** from original studio brief (stub route `/estimator` only)
7. **Mobile app backend** (capture → Supabase inbox) if the prototype earns it
8. **Presentation builder extensions**: PPTX export, per-wall page ordering
9. Post-it drop bug reported on the **published** site — believed fixed locally; re-test after next push

## Known conventions
- One live publication per wall (republish carries open notes)
- Engine-built wardrobe units store `spec:{id,price,cols,parts,area,tier}` on the canvas item; legacy flat-model units are dropped on load
- `github.md` = sync receipt; refresh `## Last sync` every repo-touching turn
- All prices are labelled planning allowances, never quotes

---

## Prompt for the next chat

> Continue the Sturij designer-tooling project. Read `STATUS.md` at the project root first — it lists everything delivered and pending. The workspace holds the Pairing Studio (`studio.html`), the canvas whiteboard (`canvas.html` + canvas-*.js), customer review (`review.html`), chat (`chat.html`), and the mobile companion (`mobile.html`); `commit-set/` mirrors deliverables for the `mark-j-walton/sturij-main-website` repo, and `github.md` records repo sync state. All studio/canvas surfaces follow `PATTERNS.md` (paper/gold, Cormorant Garamond + IBM Plex Mono); the mobile app follows the attached shell design system. The wardrobe builder runs the real carcass engine ported from `sturij-visualiser/src/carcass/` in the `mark-j-walton/sturij` repo — keep porting real logic from that repo rather than inventing stand-ins. Next priorities: [pick one] (a) chat Sprint 2 per CHAT-SPEC.md, (b) review/present productionisation per PRESENT-REVIEW-SPEC.md, (c) the render.js pairing-studio prompt branch, (d) design-system reconciliation. Work economically, verify with ready_for_verification, keep commit-set/ in sync, and treat all prices as planning allowances.
