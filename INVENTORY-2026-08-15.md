# Studio components and modules — extraction inventory

**Read on 10 Sep 2026 by Claude Code (claude-fable-5-1), read-only.** Source: `C:/Users/markw/repos/_design-drop/commit-set` — the Claude Design commit pack of 14–15 Aug 2026 (339 files, 33 MB, not a git repository). Receipt: hashed against every branch of mark-j-walton/sturij-main-website — 14 files byte-identical to main, 13 differ (superset), 312 exist on no branch. Nothing here has been written to any repository.

**Brief (Mark, 10 Sep):** extract the components and modules. The new website will not ship the Studio product; the Studio's link from the public site is ignored. Do not touch sturij-main-website (another AI, public-site restructure live) or sturij-core-editor (another AI, page platform, nearly ready). Questions go to the architect.

**Shape of this inventory.** One row per thing that renders, with the page platform's five tests (spec v0.2 §"Sturij's build extracted by inventory"): T1 two-layer tokens or hard-coded values · T2 tags on components or authored nav · T3 JSON layout or nested cascade · T4 declared consumers or none · T5 content by type from a library or inline. Dispositions are **proposed**, not decided: EXTRACT (obeys or nearly obeys, goes into the core as a package) · WRAP (works, does not yet obey, migrates behind a layout JSON) · RETIRE (duplicate, with its lesson).

---

## A · The component library — 31 vanilla files

All are IIFEs that create their own DOM and inject their own CSS. All animate through `window.Motion` (Motion UMD 11.13.5 from jsdelivr) except where marked. **Every colour is a raw hex literal** — no file consumes a single CSS custom property, so T1 fails library-wide; the hex-to-role crosswalk is in §H. Consumers exist only as prose in COMPONENTS-LIB.md ("Mounted where"), so T4 fails library-wide but is declarable from that ledger.

### A1 · Shelved primitives — ported, never mounted (cleanest extraction)

| File | API (as documented in the file) | Motion | Host-mounted? | T5 | Proposed |
|---|---|---|---|---|---|
| accordion.js | `SturijAccordion(host, [{title,content}])` — one open at a time, height spring | animate | yes | inline | EXTRACT → artifact `accordion` |
| dialog.js | `SturijDialog({title,body,confirmLabel,cancelLabel}) → Promise<boolean>` — 3D blur entrance | animate | overlay | inline | EXTRACT → `dialog` (O1 modal) |
| dropdown.js | `SturijDropdown(trigger, items)` · `SturijContextMenu(target, items)` — submenus, shortcuts, checks, danger rows | animate | anchored | inline | EXTRACT → `menu` (P4). Also consumed by action-bar.js |
| radio.js | `SturijRadio(host,{options,value,onChange}) → {set,get}` — ring draw + dot spring | animate | yes | inline | EXTRACT → `radio` |
| tabs.js | `SturijTabs(host,{tabs,value,segmented?,onChange}) → {set,get}` — underline and segmented pill | animate | yes | inline | EXTRACT → `tabs` / `segmented` (P2) |
| toggle-group.js | `SturijToggleGroup(host,{options,value,multiple?,onChange})` · `SturijToolbar(host, sections)` | animate | yes | inline | EXTRACT → `toggle-group`, `toolbar` |
| toast-action.js | `SturijToast(msg,{detail,action,duration})` · `SturijNotify(title,{body,duration})` — stacked list | animate | fixed | inline | EXTRACT → `toast` (P9) |
| progress-bar.js | `SturijProgress(host) → {set,done}` · `SturijProgressRing(host,{size})` | none (CSS) | yes | — | EXTRACT → `progress`, `progress-ring`. **Name collision** with progress-ui.js (both assign `window.SturijProgress`) |
| cursor.js | `SturijCursor({labels}) → {destroy}` — gold dot, zone captions via `data-cursor-zone` | none | global | — | EXTRACT as policy-class (decorative) |
| hero-stagger.js | `SturijStagger(container,{interval,offsetY})` · `SturijGlow(host,{colors})` — prime-loop glows | animate | yes | — | EXTRACT → recipes `rise-fade` (stagger) + `glow` |
| bobble.js | `SturijBobble(tiles, opts) → {destroy}` — swept-collision velocity springs | none (own springs) | yes | — | EXTRACT as recipe `bobble` (policy) |

### A2 · Mounted chrome — loaded on the three work areas

| File | API | Deps | Storage | T2/T3 | Proposed |
|---|---|---|---|---|---|
| command-palette.js | ⌘K palette; `window.SturijCommands.push({group,label,keywords,kbd,run})`, `registerCommands()` | Motion | `sturij.workareas` | consumers declare commands (T4 pass by design); fixed overlay | EXTRACT → `command-palette`; the command registry is already a declaration |
| workarea-nav.js | Materials · Studio · Creative pill + iris wash; `setWorkareas(cfg)` config in localStorage | Motion | `sturij.workareas` | **authored nav** (T2 fail); fixed top-right | EXTRACT the segmented control + `wash` transition recipe; nav items must derive from tags (spec S-signpost), so the item list RETIRES |
| action-bar.js | Layout · Share · Notes + People/Library/Settings menus; ⋯ collapse | dropdown.js | `sturij.abar` | authored menu tree (T2 fail); fixed | EXTRACT as `toolbar` artifact; menu content from the signpost, not the file |
| share-sheet.js | `openShareSheet()`; auto-wires `[data-share]`; drag-to-dismiss | Motion, SturijCommands | — | fixed bottom | EXTRACT → `sheet` |
| rec-indicator.js | `SturijRec.show(label)/hide()`; sets `body.sturij-rec` | none | — | fixed bottom-centre | EXTRACT → `status-pill` |
| status-badge.js | `SturijBadge(host,opts) → {set,next}` enhance → processing → received → library | Motion | — | host | EXTRACT → `badge` (multi-state) |
| confetti.js | `SturijConfetti.burst(x,y,opts)`; `setCelebrate` admin-gated, off by default | Motion | `sturij.celebrate` | canvas overlay | EXTRACT as policy-class. Carries ISC attribution (canvas-confetti, Kiril Vatev) — keep the notice |
| canvas-menu.js | radial launcher Create · Plan · Library · Deliver → second arc of tools | Motion, SturijCommands | — | fixed top-right | EXTRACT → `radial-menu`; the tool list must come from declarations |
| studio-motion.js | watches drawers/modals/cards appear, lands them on the canonical spring; zero studio.js edits | Motion | — | — | EXTRACT **as recipe definitions, not a component** (the spring values are the brand's motion tokens: 340/26–28, 420/24 radial, 500/35 indicator, 200/7 bobble) |
| progress-ui.js | `SturijProgress.open(title, phases)/set/done/fail` — modal with phases | Motion | — | overlay | WRAP; rename to resolve the collision with progress-bar.js |

### A3 · Product-coupled — read a registry, a door, or a Studio/Canvas state

| File | API | Coupling | Proposed |
|---|---|---|---|
| board-viewer.js | `openBoardViewer(code)` — tilt/drag 3D specimen board, light slider, action bar: add to assets · favourite · share · order sample | `showcase/boards3d/boards.json` (9 boards); `sturij.projectAssets`, `sturij.boardFaves`, `sturij.sampleOrders` | WRAP — needs the materials registry door and the asset library; the 3D board itself EXTRACTS (also exists as `framer/Board3D.tsx`, React) |
| code-search.js | product-code autocomplete in the contextual bar → viewer; contributes a ⌘K command | same registry | WRAP with board-viewer |
| compare-reveal.js | `openCompare(srcA, srcB?)` before/after slider | Motion, SturijCommands | EXTRACT → `compare` (needs two image refs) |
| creative-gallery.js | gallery covers → title/summary → drag-drop upload; carousel, lightbox, grid reorder; photos persisted resized in localStorage | Motion, `toast()` | WRAP — content inline in localStorage (T5 fail) until the asset library exists; lightbox EXTRACTS (O2) |
| creative-todos.js | drag-reorder, swipe right = done (confetti), swipe left = delete | Motion, SturijConfetti | EXTRACT → `reorder-list` |
| creative-create.js | morphing "Create new" → 3×2 grid; calls `window.SturijCreate[label]` | Motion | EXTRACT → `create-button`; targets declared by consumers |
| chat-core.js | `SturijChat` shared by chat/customer/canvas drawer; prototype on localStorage + `window.claude.complete`; `window.STURIJ_CHAT_API` for real routes | `sj-chat-status`, `sturij-canvas` | RETIRE — CHAT-SPEC.md and the sturij-chat repo supersede it; keep the paper chat treatment as reference |
| canvas-chat.js | canvas chat drawer over chat-core | 4 DOM ids in canvas.html | RETIRE with chat-core |
| canvas-saver.js | glass-mark screensaver, three.js imported lazily from unpkg | `sturij-saver-rooms` | RETIRE (decorative; external runtime fetch) |
| canvas-fx.js | avatar menu, background personalisation, ambient effects (WebGL2 clouds, grain, hearth, field, wave) | `sturij.canvas.proj`, `sturij.navtips` | RETIRE the effects (spec: weather is not content); the avatar/background **settings card** pattern EXTRACTS |
| review-sync.js | opt-in Supabase bridge: `publishWallLive`, `notifyResponsesReady`, `savePresentation`, `listPresentations`, `fetchNarrative`; hard-codes project `oqduxjquzbvetkcllymd` | supabase-js UMD | RETIRE — superseded by the seven board edge functions on sturij-web (PR #54/#55); the project ref is not sturij-web |

---

## B · Modules inside canvas.js (2,538 lines, one file)

| Lines | Section | Proposed | Why |
|---|---|---|---|
| 1–172 | board state, `sturij.canvas.board` | WRAP | state shape becomes the scene document (spec S-canvas) |
| 173–259 | shelf docks — swatch containers | EXTRACT → container K3 | the shelf is a named container artifact |
| 260–419 | items — the container device (drag, resize grip ⤡/🔒, −/×, tilt) | EXTRACT → container K1/K2 | the heart of DESIGN.md §4 |
| 420–495 | pan & zoom | EXTRACT canvas primitive | |
| 496–526 | photos: button, drop, paste | EXTRACT canvas primitive | |
| 527–926 | floor plan geometry — "ported verbatim from sturij-visualiser plan.ts / polygon.ts" (400 lines) | RETIRE | source of truth is `sturij-visualiser/src/geometry`; a second copy drifts |
| 927–952 | live-view room cards | WRAP | the visualiser treatment |
| 953–973 | walls, notes, type tool | EXTRACT (wall S3, post-it A1, text) | |
| 974–1004 | glass right-click context menu | RETIRE | duplicate of dropdown.js `SturijContextMenu` |
| 1005–1115 | context bar (O4) | EXTRACT | the only place actions follow the cursor |
| 1116–1138 | marquee select | EXTRACT canvas primitive | |
| 1139–1190 | swatches from the studio scheme | RETIRE | Studio ↔ Canvas bridge; Studio not shipping |
| 1191–1269 | export selection at high resolution | WRAP | |
| 1270–1276 | clear | — | |
| 1277–1364 | AI on the board (Nano Banana via the visualiser endpoint) | WRAP | render door; the declaration already exists in the visualiser (VR4) |
| 1365–1432 | presentation builder | WRAP | present/review stream |
| 1433–1504 | persistent paint disc (Motion+ ColorPicker port) | EXTRACT → `colour-picker` | **duplicated** in studio.js 1643–1665 — one copy |
| 1505–1584 | radial paint picker | EXTRACT with the above | |
| 1585–1612 | publish a wall version for review | WRAP | Boards S4 territory |
| 1613–1729 | docs: dock walls, approved materials doc | WRAP | Boards S4 territory |
| 1730–1743 | studio inbox | RETIRE | Studio bridge |
| 1752–1974 | top-down furniture (8 SVG categories) incl. **carcass engine "ported from sturij-visualiser/src/carcass/{engine,cutlist}.ts"** at 1825 | RETIRE the engine copy; EXTRACT the furniture symbol set as assets | the engine lives in sturij-visualiser; the symbols are content |
| 1975–2006 | projects switcher | WRAP | |
| 2007–2073 | image library | WRAP | asset library replaces it |
| 2074–2120 | pins + lightbox | EXTRACT (pin A3, lightbox O2) | |
| 2121–2215 | trade plans | WRAP | |
| 2216–2538 | info modal: paint / wallpaper / wardrobe / estimate calculators + guides (323 lines) | WRAP | estimator numbers belong to the manufacturing settings surface (CANVAS-UX-SPEC §C prices are planning allowances) |

## C · Modules inside studio.js (1,716 lines)

The Studio is not shipping, so the default here is RETIRE; these sections carry something reusable:

| Lines | Section | Proposed | Why |
|---|---|---|---|
| 30–120 | Egger colour banding — a colour family per decor | EXTRACT → materials registry data | it is registry logic, not UI |
| 121–238 | room zones, walls Paint/Wallpaper, floor Hard/Carpet switches | RETIRE | Studio-specific |
| 272–289 | one method per panel: idle → tap → split into swatches | reference only | |
| 435–499 | favourites drawer (D2) | EXTRACT pattern → `favourites` | |
| 500–549 | rules-driven pairings (`showcase/suggest/complements.json`) | EXTRACT → pairing function, registry-side | the pairing function exists in at least three places across the estate; this is one |
| 623–699 | peel-off post-it tag → drop on a finish (A2 swatch tag) | EXTRACT with post-it A1 | |
| 700–926 | handles / sockets / taps drawers (D1 pattern ×3, registry-driven, drag onto scene) | EXTRACT one `drawer` artifact; RETIRE the two clones | three copies of one pattern |
| 927–964 | search drawer (keyword + voice) | WRAP | |
| 965–1133 | properties modal, panel toggles, drag-to-reorder panels | RETIRE | Studio layout |
| 1144–1251 | scheme persistence + share URL (hash-encoded state) | RETIRE | Studio state |
| 1252–1337 | snip: drag a region → shortlist | EXTRACT → `snip` (canvas tool) | |
| 1338–1368 | talk: one-shot voice commands | WRAP | open item 4 in SPEC-WORK-AREAS |
| 1381–1519 | tab drawers: multi-select colour-bar filters on every panel tab | EXTRACT → `filter-drawer` (chips P7 + colour bars) | |
| 1560–1632 | Visualise: sectioned, fact-led prompt to the Nano Banana endpoint (`scenario:'pairing-studio'`) | WRAP | the render declaration is the visualiser's; this is a second prompt author |
| 1643–1665 | paint disc | RETIRE | duplicate of canvas.js 1433 |

## D · Pages

| Page | Loads | Role | Proposed |
|---|---|---|---|
| studio.html/css/js | Motion, progress-ui, studio.js, studio-motion + 10 chrome files; Typekit kit `iwm1gcu` + Plex Mono | Materials work area (the Studio) | not shipping — reference for patterns only |
| canvas.html/css/js | Motion + 18 files; Plex Mono + **Source Serif 4** (the other pages use Cormorant Garamond) | Studio work area (the canvas) | modules per §B |
| creative.html | Motion + creative-* + chrome; inline CSS | Creative work area | MegaMenu, galleries, to-dos, footer scroll-reveals — EXTRACT the blocks |
| collection.html | Motion; inline | 3D stock surf over `stock.json` | policy-class block |
| news.html | Motion, workarea-nav, command-palette; inline | infinite-loading feed (P11) | EXTRACT → `feed` block |
| chat.html, customer.html, mobile.html | chat-core, rec-indicator; inline | chat prototype; mobile companion on the **shell** design system | RETIRE (superseded specs) |
| review.html | supabase-js; inline | customer review round-trip | WRAP into the boards stream |
| board-3d.html | inline only | standalone 3D specimen board for Framer embeds | EXTRACT with board-viewer |
| framer/Board3D.tsx | React + framer | native Framer code component | reference; not consumed by the site |

## E · Registries and assets

| Path | Shape | Consumed by | Proposed |
|---|---|---|---|
| showcase/boards3d/boards.json | `{note, boards[{code,name,range,tone,img,id}]}` (9) | board-viewer, code-search | registry input — one row per board in the materials registry |
| showcase/suggest/complements.json | `{_meta, bands, boards{…}, paints{…}}` | studio.js pairings | registry input — pairing matrix seed (PR #56 stream) |
| showcase/paints/paints.json | `[{name,hex}]` (Farrow & Ball names) | studio | registry input |
| showcase/stock/stock.json | `{note, items[{code,name,img}]}` | collection.html | registry input |
| showcase/finishes/boards.json | `[{file,name}]` (25) | studio | registry input |
| showcase/finishes/cleaf/catalogue.json + cleaf.json + **261 images** (rail/tile webp) | supplier Cleaf, scraped | studio drawers | assets — not components. Cleaf is not in the platform's first range (PQ7 = Egger) |

## F · Backend pieces (not components)

| Path | What | Hazard |
|---|---|---|
| api/present/narrative.js, save.js · api/review/client.js, publish.js, respond-done.js · api/p/[id].js | Vercel serverless routes for the present/review round-trip on studio.sturij.com | targets a Supabase project that is **not** sturij-web; the boards backend of record is the seven edge functions in sturij `supabase/functions` |
| supabase/migrations/20260814_present_review.sql | `boards.responded_at` + `presentations` table, owner RLS | **written before the 19 Aug PII amendment** (#55). Do not apply as-is; reconcile against the amended `boards` columns first |
| vercel.json | cleanUrls, www→apex redirect, `/p/:id` rewrite, two security headers | belongs to sturij-main-website's deploy, not the components |

---

## G · Findings the architect should know

1. **Three palettes, no tokens.** The drop hard-codes paper `#F7F4EE`/card `#FDFCF8`/ink `#1D1D1D`/bronze `#62584F`/gold `#D4A01B` with Cormorant Garamond + IBM Plex Mono. The sturij house style (core.css, #59) is charcoal `#232120`, gold `#a67c3c`, paper `#faf7f0`. The platform's DESIGN.md instance is ground `#FAF8F3`, ink `#2C2C2C`, sage `#4A5D4E`, gold `#D4A574` (device) / `#B08350` (text), Degular Display + Helvetica Neue. Under the platform's rule a raw hex is refused `T_ONE_OFF`, so every component needs the §H crosswalk before it can be an artifact.
2. **Animation is code, not recipes.** Each component calls `Motion.animate` with inline spring numbers; the platform declares motion as recipes with ends (`M_UNDECLARED`). The spring values themselves are consistent enough to name: 340/26–28 canonical, 420/24 radial, 500/35 indicator, 400/20 context menu, 200/7 bobble, 120/20 stagger.
3. **Duplicates inside the drop:** paint disc (canvas.js + studio.js), context menu (canvas.js + dropdown.js), three drawer clones (handles/sockets/taps), floor-plan geometry and the carcass engine copied from sturij-visualiser.
4. **Name collisions:** `window.SturijProgress` is defined by both progress-ui.js and progress-bar.js; `window.SturijCommands` is guarded in both canvas-menu.js and command-palette.js (safe).
5. **Off-palette values** in chrome: `#7A8B7F` (workarea-nav), `#9DB5AF` (todos), `#B5502F`/`#B4543E`/`#C96A4A` (three different clays beside the ruling `#8A3B2E`).
6. **External runtime dependencies:** Motion UMD pinned 11.13.5 on jsdelivr; three.js lazily from unpkg (saver); supabase-js UMD (review); Google Fonts; a Typekit kit on studio.html; `window.claude.complete` in the chat prototype.
7. **Licensing:** the library is vanilla ports of Motion+ paid examples (PATTERNS §9 and the platform record both say the licence is held); confetti carries an ISC notice. Fine for the private package (PQ8); a publishing decision later.
8. **The gallery is missing.** DESIGN.md names `Components.dc.html` as the visual reference and the session log names `Sturij Components.html` (Framer export). Neither is in the drop nor anywhere on this machine (searched OneDrive, Downloads, Desktop, Documents, repos, C:/claude). They would still be in the Claude Design workspace.
9. **Provenance risk.** The drop exists once, on one disk, outside git. Whatever the disposition, the first step is to put it into a repository.

## H · Hex → semantic-role crosswalk (for the port)

**Target (ruling Q4, 10 Sep):** the roles resolve to the **public instance** — the second DESIGN.md: charcoal `#232120`, bronze-gold `#a67c3c`, paper `#faf7f0`, Fraunces — not the platform's internal instance and not the drop's. The drop's `#D4A01B` is a third gold and is retired.

| Drop hex | Where | Role |
|---|---|---|
| #F7F4EE · #FAF8F3 · #faf8f2 | paper | `ground` |
| #FDFCF8 · #ffffff | card | `surface` |
| #F0EDE8 · #F4F1E9 · #F3E9E4 | warm wells | `surface-2` |
| #1D1D1D · #231F1B · #3A352F | ink, dark chrome | `ink` |
| #62584F · #5F4430 | bronze labels, timber | `ink-muted` |
| #9A9284 | faded ink | `ink-faint` |
| #D4A01B | gold | `accent` |
| #E4B32E · #E4B93B | gold highlight | `accent-hi` |
| #B98A4A | gold shadow | `accent-lo` |
| #8A3B2E (+ the three strays) | error clay | `danger` |
| #7A8B7F · #9DB5AF | greens | refuse or map to `sage` |
| #F6EEC9 #F7E9A8 #CFE3D4 #DCE3EE #EFD9C8 | post-it set | `note-1…5` (content, not chrome) |

---

## I · Rulings (architect via Mark, 10 Sep 2026, recorded 87287163)

| Q | Ruling | Differs from the recommendation? |
|---|---|---|
| Q1 destination | A **rescue branch on sturij-main-website** — the drop's own home (HANDOFF.md). A verbatim copy in a second repo is a duplicate. If this session is confined to the sturij repo, a session in the right repo does the paste on Mark's word. | yes |
| Q2 form | Verbatim now. The port to artifacts is the core's extract-by-inventory step, later, from the branch. | no |
| Q3 scope | The whole pack verbatim, this inventory beside it. It names the 31 components and the EXTRACT rows of the two monoliths with line ranges; RETIRE rows are recorded, not copied; lifting into named files happens at the port. | no (moved to the right moment) |
| Q4 palette | The **public instance** (charcoal + bronze-gold `#a67c3c`, Fraunces), not the platform's. The Studio is customer-facing; the platform palette stays inside. §H maps onto it; `#D4A01B` retired. | **yes** |
| Q5 assets | Manifests in git. The 261 Cleaf images go to the asset library under the migration brief; until then they stay in the drop folder on disk with a copy to Drive, never in git. | no |
| Q6 backend | Out of scope; to the boards stream. The present/review migration is reconciled against the 19 Aug PII amendment before anything applies. | no |
| Q7 archive | Yes; the rescue branch is the archive. | no |
| Q8 gallery | An export from Mark's Claude Design account. If unrecoverable, the 31 files are the source and the record says the page is missing. | — |

**One act before anything else commits in sturij-main-website:** the rescue paste there, plus the Claude Design export if it exists.

### The original questions, kept for the record

**Q1 · Destination.** Where does the extracted library land? (a) the sturij repo on a work branch, e.g. `design/studio-components/` beside the existing `design/design_system/`, with the ledger, DESIGN.md v2 and this inventory; (b) a new private repo; (c) handed as files to the platform AI. **Recommend (a):** it is the only repository this session may touch, the platform spec says the block library is seeded from the visualiser's repo, and (c) repeats the loss.

**Q2 · Form.** Verbatim now (files unchanged, provenance intact, inventory beside them) with the port to artifacts as the platform's own "extract by inventory" step; or port now against the v0.2 contract. **Recommend verbatim now.** The contract is nearly ready but still moving, and a port done outside the platform repo would have to be redone by the AI that owns it.

**Q3 · Scope of "modules".** Components (§A) only, or also the canvas/studio modules (§B, §C)? Cutting canvas.js apart is refactoring, not extraction. **Recommend:** §A whole; from §B and §C only the EXTRACT rows, lifted as named files with their line-range provenance; RETIRE rows recorded with their lesson and not copied.

**Q4 · Palette authority.** Which palette rules the port — the platform's DESIGN.md instance (gold #D4A574), the house charcoal set (gold #a67c3c), or the drop's (#D4A01B)? **Recommend the platform instance**, with §H as the mapping and the drop's values retired; the architect confirms the role names.

**Q5 · Assets.** Do the 261 Cleaf images (and the JSON manifests) go into git with the components, or to the asset store (PQ5: Supabase storage per tenant, library as index) with only the manifests in git? **Recommend manifests in git, images to the store**; Cleaf is registry input, not a component, and the platform's first range is Egger.

**Q6 · The backend pieces (§F).** Confirm they are out of scope here and routed to the boards stream, and that the present/review migration is **not** applied until reconciled with the 19 Aug PII amendment. **Recommend yes to both.**

**Q7 · Whole-drop archive.** Besides the curated extraction, commit the entire commit-set verbatim (minus images if Q5 says store) under an archive path or tag for provenance? **Recommend yes** — 33 MB once is cheaper than a second read like today's.

**Q8 · The missing gallery.** Can the architect recover `Components.dc.html` / `Sturij Components.html` from the Claude Design workspace? Without it the visual reference DESIGN.md §14 depends on does not exist in the repository. **Recommend recovering it before the port**, not before the verbatim landing.

## J · Delivery under the rulings

Prepared on 10 Sep, **not run** (receipt: `git ls-remote origin 'rescue/*'` = 0 refs, no rescue worktree, sturij-main-website HEAD unchanged at 08f7c95):

1. `MANIFEST-2026-08-15.sha256` — all 339 files (76 non-image → the branch; 263 images → disk and Drive).
2. `design-drop-2026-08-15.zip` — the whole drop with images, 32,654,144 bytes, sha256 `9dc77f7d9c1510f89afc66bd4515ae86c283b581ea24db584dd34a77ec4a1d45`, written beside the drop at `C:/Users/markw/repos/_design-drop/` for the Drive copy (Q5).
3. `rescue-2026-08-15.sh` — fetch origin main; a separate worktree `sturij-main-website--wt-rescue`; branch `rescue/2026-08-15-design-drop`; rsync of the pack minus images to repo-root paths; this inventory as `INVENTORY-2026-08-15.md` and the manifest at root; `sha256sum -c` over every copied file; one commit; push; local == remote printed. The live public-site worktree is never touched. Nothing merges; the PR is Mark's.
4. Runs only on Mark's word, because another session is in that repository today.
5. The port to artifacts: the platform's step, from this inventory, §H onto the public instance.

## K · Live rendering surfaces (driven 10 Sep 2026, screenshots in `surfaces/`)

Seven URLs supplied by Mark. Six are hash routes of the sturij-visualiser app on sturij.vercel.app (source: `sturij-visualiser/src/main.tsx`, fourteen routes); the seventh is the canvas on studio.sturij.com (sturij-main-website, deployed main 08f7c95). The shell reported 187 console errors on every route: Egger CDN thumbnails answering 504 (`cdn.egger.com/img/pim/…/orig`) and 404.

| Surface | Route → source | What renders | T1 (raw hex · `var(--)` in the source dir) | Proposed |
|---|---|---|---|---|
| Design yours | `#/design` → site/DesignYours.tsx (332) | four-step stepper (Your room · How you'll use it · Finishes · Send it); number inputs with hints; obstacle pill row; live wardrobe preview SVG; measuring-tip aside; "Choose a layout" CTA; ChatWidget; `submitEnquiry` (the enquiry door) | site: 194 · 227 | WRAP as the enquiry flow (Block Catalogue: StepCards + EnquiryForm); the six finishes and four paints are inline arrays → registry |
| Boards | `#/boards` → boards/BoardsGallery.tsx (119) + data/egger.ts, data/finishes.ts | "Egger board library", 332 boards; Names toggle; collapsible groups (Woodgrains 112 …); figure tiles code + name; click for a larger view | boards: 8 · 1 | EXTRACT `swatch-grid` + `collapsible-group` blocks; data → registry; the thumb source must be the asset library, not the Egger CDN |
| Assets | `#/assets` → carcass/HardwareViewer.tsx (239) + carcass/hardware.ts | VisualiserShell chrome (Menu · Cabinet · Account); left rail of five Häfele/Blum fittings; "Fitting spec" panel with a spec table and CAD-pack refs; procedural 3D orbit scene (Rafix housing/bolt, TANDEM runner, leg, CLIP top hinge) | carcass: 32 · 79 | EXTRACT `spec-table`, the rail and panel are the shell's; the 3D scene WRAPS as a twinned three.js artifact |
| Carcass | `#/carcass` → carcass/CarcassStudio.tsx (583); src/carcass 33 files, 5,481 lines | shell with 2D/3D segmented + Save; rail Cabinet · Fronts & finish · Plinth & show panels · Panels · view · Designs · Cut sheet · live; skeleton choice, leg height, H/W/D/thickness spinbuttons, derived internal dims, columns, shelves-per-column steppers, adjustable/fixed, top cross members/solid, back 8/18, carcass decor combobox (Egger F-codes); Carcass3D, CabinetViews2D, CutSheet, image-gen package, persist | carcass: 32 · 79 | `engine.ts` / `cutlist.ts` / `cutsheet.ts` are the source the canvas.js copy was ported from → EXTRACT as the panel-set door (VR3); stepper, segmented, spin inputs, derived tiles → EXTRACT blocks; the page WRAPS |
| Visualiser | `#/visualiser` → App.tsx (246); chrome/panels 7 files 740 lines; views 8 files 1,499; platform 10 files 2,019 | welcome overlay (four numbered steps, "Start with a default room"); banner (Menu · Visualiser · Plan/Elevation/3D view · Save & approve · Account); rail Room · Openings · Wardrobe · Interior · Furniture · Materials · Manufacture with gated progression; PlanView SVG (W1–W4 labels, dims, 12.8 m², camera handle); status hint; v6 badge; plus Scene3D, ElevationView, LiveViewCard, PhotoOverlays, PromptInspector, CameraPanel, ManufactureTable, Accordion | platform: 7 · 903 · chrome: 37 · 174 · views: 47 · 72 | the platform spec already names this as the block library's seed (light box, toolbar pill, icon rail, panel, swatch card, mono caption, segmented control, status strip) → EXTRACT; PlanView / Scene3D / Elevation are the scene document's renderers → WRAP as canvas artifacts; PromptInspector is the render declaration → WRAP |
| Units | `#/units` → units/UnitBuilderApp.tsx (476) + units/formula.ts | own banner (not the shell); title textbox; "4 parameters · 8 part types · 18 panels"; Save to catalogue; sections 1 Parameters (default/min/max) · 2 Derived values · 3 Parts · 4 Constraints; "✓ Manufacturable" test; Copy unit JSON; Front elevation + Side section SVGs; Resolved panel list | units: 98 · 24 | `formula.ts` (params → derived → parts → constraints → panels) is VR3 in code → EXTRACT as the door; the accordion sections, parameter rows and panel list → EXTRACT blocks after a token pass; its private banner RETIRES for the shell |
| Canvas | studio.sturij.com/canvas → sturij-main-website canvas.html (main) | banner (Sturij → studio.html, Project 1, Create · Plan · Library · Deliver, Undo/Redo, Clear, Back to the Pairing Studio, avatar); status hint; chat fab + drawer | vanilla, raw hex | per §B. **Receipt: the live page loads 8 scripts (motion, progress-ui, canvas, canvas-fx, canvas-menu, chat-core, canvas-chat, canvas-saver); the drop's canvas.html loads 19. studio-motion.js, creative.html and board-3d.html are 404 live. The drop never deployed.** |

**Cross-cutting, from the live drive**

1. **Two shells in one app.** `platform/` (VisualiserShell, ToolPageShell, AdminPageShell, PublicPageShell, Chrome.tsx exporting PropRows, PropertiesDrawer, NotificationsDrawer, LeftDrawer, StandardModal, ThemeToggle, ChatDock, AiPresence) is token-disciplined (7 raw hex against 903 token references) and `registry.ts` already declares page properties as data (PropRowDef). Design yours and Units carry their own banners and inline styles. The shell artifacts are the first EXTRACT; the two private banners RETIRE.
2. **The same primitives exist twice**: the drop's vanilla library and the visualiser's React blocks both hold an accordion, a segmented control, a drawer, a modal, a toast, a status badge. One artifact each at the port; the React versions lead for the internal app because they already resolve to tokens; the drop's spring language becomes the motion recipes for both.
3. **Registry before blocks.** Boards, Design yours, Carcass and the drop's showcase manifests each hold their own material list. The swatch blocks are trivial once one registry serves them; they are unfixable while four lists disagree.
4. **The Egger CDN is not a dependable image source**: 504s on `cdn.egger.com` on every load today. The asset library (PQ5) is the fix, not a retry.
