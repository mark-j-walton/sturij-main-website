# STURIJ — Design Standards
_Creative direction for the Sturij workspace: studio, canvas, review, presentation, chat, mobile — and everything we put on social._
_This file rules. Where an implementation disagrees, the implementation is wrong. Visual reference: `Components.dc.html`. Version 2.0 · 2026-08-14._

---

## 1 · Brand idea

**The atelier table.** Sturij is a craftsman's studio, not software. Every surface is paper, card, timber and brass on a well-lit workbench: materials you can pick up, shelve, pin, annotate and hand to a client. The interface earns trust the way a workshop does — weight, texture, and one warm metal.

Three tests for any new element:
1. **Would it exist on the bench?** (card, shelf, post-it, tape, plug, tile — yes; glassy toolbar, neon badge — no)
2. **Does it feel placed, not printed?** (shadow, grain, slight rotation where honest)
3. **Is gold the only voice raised?** (one accent; everything else whispers)

**Audience**: interior designers first, their clients second, social viewers third. The same frame must read as a professional instrument in a designer's hands and as a beautiful object in a 9:16 crop.

---

## 2 · Foundations

### 2.1 Palette
| Role | Value | Use |
|---|---|---|
| Paper | `#F7F4EE` | app background, always |
| Card | `#FDFCF8` | every container surface |
| Ink | `#1D1D1D` | primary text, dark chrome |
| Bronze | `#62584F` | labels, muted UI, icons |
| Gold | `#D4A01B` | THE accent: selection, active, progress, glow |
| Faded ink | `#9a9284` | placeholders, empty states |
| Error clay | `#8a3b2e` | destructive/error only, always with its `.08` tint bed |
| Post-it set | `#F6EEC9 #F7E9A8 #CFE3D4 #DCE3EE #EFD9C8` | notes only — never UI |

Rules: no blues/greens in UI chrome. Material colours (swatches, floors, paints) are content, not UI, and may be anything. Tinted containers derive controls from `--cardcol`; text **self-contrasts** (ink on light, `rgba(250,248,243,.92)` on dark — the `inklight` switch, threshold ~0.55 luminance).

### 2.2 Type
- **Cormorant Garamond 500/600** — display, card titles, welcome, numerals with feeling. Never below 16px.
- **IBM Plex Mono 400/500** — everything else. The tracked label is the brand's handwriting: `500 9.5–11px, letter-spacing .12–.16em, uppercase, bronze`.
- Body copy 12–14px mono, 1.5 line height. No third face, no italics except client quotes.

### 2.3 Texture & light
- **Paper grain** on every container: fractal-noise SVG, ~5% alpha, .5 opacity. Skipped on furniture symbols, free text, photography.
- **One light source, top.** Emboss = light top-inset + dark bottom-inset. Wells recess (`inset 0 1px 4px rgba(35,31,27,.14)`), cards float (`0 2px 4px …08, 0 18px 44px …22`), selection **glows gold underneath** (`0 22–26px 48–60px rgba(212,160,27,.4)` + 1px gold hairline). Nothing glows on top.
- Radii: cards 16 · wells/tiles 12 · chips/pills 999 · tape/notes 0 (paper is square).

### 2.4 Motion
- **Motion (motion.dev) is the single animation engine** — every placement, exit, drawer, toggle and settle runs through `Motion.animate` springs; CSS transitions remain only for hover colour/emboss shifts. One engine keeps the feel identical everywhere and the CSS lean.
- Canonical spring: `type:'spring', stiffness:340, damping:26–28`; entries land with 2–3px overshoot; exits 160–180ms ease-out.
- 120–180ms for state; 240–320ms for placement (drop, dock, shelf). Things **settle**: no bounces >1, no elastic, no parallax.
- Pressed = `translateY(1px)` + emboss inversion, universally.
- Background effects drift at ≤0.5px/frame; they are weather, not content.
- Everything respects `rmotion` / `prefers-reduced-motion`.

---

## 3 · Primitives
*The atoms. Nothing on any surface may use a treatment outside this section.*

### P1 Embossed control — the one button
26px circle, background `var(--cardcol)` (its card's colour). **Pillow form (2026-08-14 ruling):** soft radial dome (`radial-gradient(circle at 35% 28%, #fff, #F2EFE9 60%, #E7E3DB)` on card white), sat LOW — a tight `0 2px 4px ink/.12` shadow plus a crisp 1px rim (`0 0 0 1px ink/.09`) where it meets the card; never tall/floating. Glyph 11px, 1.7 stroke, bronze/.8. Hover: ink glyph. Pressed: inverted (inset-only). Disabled: .35 opacity. Glyph set: × − + ‹ › ⌄ ✎ 🔒 ⚙.
**P1a Resize grip:** the ⤡ diagonal-arrow glyph, bare (no circle), bronze/.7, at the resize corner; becomes 🔒 while locked.
> **US-P1**: As a designer I find the same small round button on every card, in the card's own colour, and I know × closes, − returns/minimises, without reading a tooltip.

### P2 Pill
Round, mono tracked label. Rest: bronze text, 1px inset hairline. Hover: `.06` ink fill. **Selected: solid gold, ink text.** Pressed: gold + 1px translate + inset. A pill row is a segmented choice; pills never wrap mid-label.
> **US-P2**: As a user I always know which mode I'm in because exactly one pill in a row is gold.

### P3 Text input & textarea
Filled well, not outlined: `rgba(29,29,29,.04)` bed, 10px radius, no border, mono 13px, ink text, faded-ink placeholder. Focus: bed lightens to card + 1px gold hairline. Inline-editable text (shelf titles, board names) shows a ✎ affordance on hover and commits on Enter/blur.
> **US-P3**: As a designer I edit names right where they are written; the field looks like paper, not a form.

### P4 Dropdown & menu
A **card** that opens: 16px radius, card white, grain, floating shadow, 6px above/below its trigger. Rows: mono 11–12px, 10px radius hover bed (`.05` ink), gold left-dot for the active row. Destructive rows in error clay with `.08` tint. Never a native `<select>` visible; the trigger is a pill or embossed control with ⌄.
> **US-P4**: As a user every menu I open is a small card from the same deck — same paper, same rows, same gold marker on my current choice.

### P5 Toggle & checkbox
Toggle: 34×20 track (inset well), 16px card-white knob with emboss; ON = gold track. Checkbox: 18px rounded square well; ON = gold fill, ink tick. Toggle rows label-left, control-right.
> **US-P5**: As a user on/off is always a gold-lit well, whether it's the ceiling, a door style, or an effect.

### P6 Slider
Recessed groove track (5px, well shadow), gold filled portion, **pillow knob** (P1 dome, 34px) riding the groove; drag anywhere on the track. Value label in mono above the knob while dragging. Vertical for light/intensity beside a stage; horizontal elsewhere.
> **US-P6**: As a designer I scrub blur/zoom/quantity with the same brass-knob slider everywhere.

### P7 Chip
Small rectangle (10px radius) for filters and quick-picks: mono 10px, well bed, gold when active. Chips with swatches carry an 18px rounded sample on the left.
> **US-P7**: As a user filter chips look the same in the hardware drawer, the floor rail and the favourites row.

### P8 Swatch tile
The material atom: white lipped frame (6px padding), 8–12px radius, media full-bleed inside with an inset shadow lip. Name label OUTSIDE the media, bottom, tracked mono. Sizes: S 44 (docked) · M 92×120 (canvas) · L 150+ (studio cards). Never distorts; media crops centre.
> **US-P8**: As a designer every finish — paint, timber, fabric, floor — is presented as the same specimen card, whatever the surface.

### P9 Toast
Bottom-centre card pill, ink text on card white, floating shadow, 2.4s, one at a time, no icons. Wording is quiet and specific ("Returned to the drawer", "Shelf — drag swatches on or off").
> **US-P9**: As a user feedback arrives as a small paper slip, never a banner.

### P11 Infinite list loading
Lists that page (research library, feeds, search results) load in batches of ~3: new items stagger in (0.2s delayChildren, y 20→0, .4s ease-out); the sentinel is a 50px spinner — hairline bronze ring with a **gold** top arc rotating 1.5s linear — that triggers the next fetch when it enters the viewport. Never a skeleton wall, never a "Load more" button.
> **US-P11**: As a designer scrolling my library, more of it simply arrives — quietly, in rhythm.

### P10 Tooltip
`title` semantics rendered as mono 10px slip, ink bed at .92, card text, 6px radius, 300ms delay. Only where a glyph is genuinely ambiguous; the design should mostly not need them.
> **US-P10**: As a first-time user I can hover anything unclear and get three words, not a paragraph.

---

## 4 · Containers
*One device, four variants — the heart of both surfaces. Shared anatomy: card surface + grain, floating shadow, gold under-glow when selected, inner-shadowed content well, equal air all round (same space above/below as the sides), drag on the whole top band, a **resize grip** — the P1a diagonal-arrow glyph ⤡ in bronze/.7 at the resize corner, swapping to a padlock when resize is locked (e.g. while a swatch sits on the board) — and content that scales proportionally with a degrade stop (photos ≤1.2× native).*

### K1 Standard card — plan · room/perspective · wall · document
Title top-left · × top-right · grip bottom-right. Tool pills live in the title band, never in mats. No khaki mats, no double frames: one card, one well.
> **US-K1**: As a designer every "device" on my board — plan, room view, wall — is the same white instrument; only its contents differ.

### K2 Media card — swatch · photo
Heading at the **bottom** · grip **top-right** (bottom edge anchored) · × bottom-right, − beside it. − returns to origin (drawer/dock/library); × removes from the canvas entirely.
> **US-K2**: As a designer small material cards keep their controls out of the imagery, and I can send one home without losing it.

### K3 Shelf dock — swatch container, system- or user-made
Recessed tray well; P8 tiles side by side; deep bottom band holds the title (inline-editable when user-made; system shelves like "Suggested pairings" are fixed). Top band: − minimises to a draggable pill (name + ⌄ arrow), × closes. Width tracks the count; drag on/off; empty shelf closes itself. Recolourable (Card action); text self-contrasts.
> **US-K3**: As a designer I gather a scheme onto a named shelf, park it as a pill, and reopen it later — the system suggests shelves of its own in the same furniture.

### K4 Plug / hardware card
K2 plus a **lock** (P1, 🔒) beside −/×. Unlock → the plug pulls off the card; the card collapses to a **ghost label** (translucent pill, name + −/×; − restores the card). Off-card the plug resizes freely; docked, it shows plug + finish name as a P8 tile.
> **US-K4**: As a designer I can take the handle off the sample card and try it on a door front, then put it back.

### K5 Stack
Swatches dropped on each other fan into a stack: face card + peek edges, ‹ › nav (P1), count label, horizontal swipe browses, unstack action returns all. A swatch dragged onto a **shelf** shelves instead.
> **US-K5**: As a designer piling swatches makes a neat deck I can flick through, not a mess.

### K6 Dock cards & tray
The canvas dock tray (bottom): docked items render as S-size P8 tiles in a card row; each has name + × on hover; the tray itself is a K1 card that can minimise. **Docked = contained**: nothing docked ever floats naked on the board.
> **US-K6**: As a user things I put away are visibly IN something, and stay put until I take them out.

---

## 5 · Surfaces & environment

### S1 Canvas background
Paper + 26px dot grid (ink/.10, 1px). Zoom fades the grid below .5 and above 2×.
### S2 Background effects
Weather layer (grain, clouds, hearth, field, wave): fixed, pointer-transparent, **z just above the background, below everything** (layer band 2). Controlled from the background box (K1 card) with P5 toggles + P6 intensity.
> **US-S1/S2**: As a designer I can set a mood behind my board and it never sits on top of my work.

### S3 Walls (drawn)
Wall = paper card at wall scale in band 3. Lockable: 🔒 keeps it still; resizing a locked wall scales its pinned cards proportionally. Items on a wall always render above it; **locked items inherit the wall's layer** and restack with it.
### S4 Plan & room
Room view exists only once a plan does — the room IS the plan (walls, skirting, toggleable ceiling; doors/windows break walls at true size). A camera glyph placed on the plan drives the perspective. Plan linework and dimensions keep constant weight and air at every container scale. Ceiling/wall/skirting recolour from swatches (P8 drag-on).
> **US-S3/S4**: As a designer my drawing becomes the room; what I change on paper changes in the view, and my measurements never fatten when I scale the card.

---

## 6 · Annotation & pinning

### A1 Post-it — note
Brand colours only, paper grain, slight rotation (±1.5°), **click to type in place**. ×/− flat, note-coloured, slightly embossed (P1 at 20px). − minimises to a loose, imperfect pile above the chat fab; × bins. Bottom-edge click slides out the 5 colour dots. Anchors to whatever card it's placed on: pans, zooms and moves with it until deleted. Identical on studio and canvas.
### A2 Post-it — swatch tag
Dropped on a material it becomes a spec tag: 18px sample + name, hex/brand line, then the user's note. Same chrome as A1.
> **US-A1/A2**: As a designer my notes stick where I put them and know what they're stuck to; a client sees the exact finish I mean.

### A3 Pin
Brass dot (10px, gold with ink ring) + optional mono flag. Pins live in band 5 (above everything but chrome) and belong to the item they pierce.
### A4 Tape & curl
Welcome/photo dressing only: paper tape strips and corner curls are set dressing, never interactive.
> **US-A3/A4**: As a user decoration never pretends to be a control.

---

## 7 · Drawers, rails & trays
*Studio's edge furniture. All share: card surface sliding from an edge, tracked-label header with × (P1), content in wells.*

- **D1 Hardware/skirting/profile drawers** (`hdraw sdraw skdraw tpdraw`): header + P7 filter chips, P8 tile grid, drag-out ghosts, placed-state chips.
- **D2 Favourites drawer**: heart-collected finishes as P8 chips; heart toggle is gold when saved.
- **D3 Paint rail / floor rail**: horizontal strips of P8 tiles with ‹ › P1 nav; the active tile carries the gold hairline.
- **D4 Suggest tray** (`scard`): system recommendations presented as a K3 system shelf (title fixed), never a bare row.
- **D5 Tray/dock (studio bottom)**: as K6.
> **US-D**: As a designer every drawer opens the same way, filters the same way, and everything in it is the same specimen tile I'll meet again on the canvas.

---

## 8 · Overlays

- **O1 Modal** (`mcard trbox infobox`): K1 card centred on ink/.35 scrim; title band + ×; content in wells; primary action = ink pill ("dbtn"), destructive = clay. One modal at a time.
- **O2 Lightbox** (`lboxov`): ink/.85 scrim, media unframed, caption + actions in a bottom card bar.
- **O3 Estimator/info box** (`infobox est ifpdf`): K1 card with tabbed pills, mono figures, Cormorant totals; PDF/share actions as pills.
- **O4 Context bar** (`ctxbar`): floating card pill row above selection — the only place actions follow the cursor. Order: arrange · style · contain · destroy (clay, last).
- **O5 Resize/project/avatar menus**: P4 cards, no exceptions.
> **US-O**: As a user anything that interrupts me is a card on a dimmed table, with the same close, the same buttons, and never two at once.

---

## 9 · Navigation & chrome

- **N1 Top bar**: ink band; brand mark left; centre = board/project name (P3 inline edit); right = avatar + share. Height 52.
- **N2 Nav tiles** (`bobgrid bobtile`): perforated paper — solid 11px rim, dot field 2.4px/8px pitch, icon 1.6-stroke + tracked label solid above the perforation. Hover lifts (shadow deepens); active carries the gold hairline.
- **N3 Chat fab & panel**: fab = embossed circle with the mark; panel = K1 card; messages in wells, sender labels tracked mono.
- **N4 Page dots / pager** (`ndot`): 6px bronze dots, gold current.
- **N5 Zoom/undo cluster**: P1 controls in a card pill, bottom-left.
> **US-N**: As a user the chrome is quiet furniture: I always find navigation at the edges, in paper, never floating over my work.

---

## 10 · Forms & data entry
Estimator, dimensions, client details — anywhere numbers meet paper:
- Labels above fields, tracked mono; fields P3 wells; units inside the well, faded ink.
- Steppers: P1 −/+ flanking a mono value.
- Segmented choices (ends condition, layouts): P2 pill rows, one gold.
- Section dividers: tracked label + hairline, generous air (24px+).
- Totals: Cormorant 600, gold rule above; breakdowns mono table, right-aligned figures.
- Validation: clay text under the field, well gains clay hairline — never a popup.
> **US-F**: As a designer pricing a wardrobe feels like filling a worksheet on the bench: labels whisper, numbers line up, the total is set in type worth a client's eyes.

---

## 11 · Layers (fixed bands, back → front)
1 canvas background · 2 background effects · 3 walls · 3b wall-locked items (wall z+1) · 4 loose items · 5 furniture, pins, post-its · 6 chrome (nav, docks, chat, context bar) · 7 overlays/modals · 8 toasts.
> **US-L**: As a user nothing ever hides under the thing it belongs to, and weather never rains on my cards.

---

## 12 · Voice
British English. Warm, brief, workshop-plain. Toasts state what happened ("Shelf empty — closed"). Empty states invite ("Your designer will publish a wall here when a version is ready for your eyes."). Never exclamation marks, never jargon, no emoji in product copy.

---

## 13 · Social & export
- Frames must crop beautifully: any K1 card on paper at 1:1, 4:5, 9:16 is a valid post — keep 48px quiet margin around hero content.
- Watermark: the mark, bronze at .4, bottom-right, 24px — on exports only.
- Deck/PDF exports inherit these standards via the presentation builder; no special-case styling.
> **US-X**: As Mark I can screenshot almost any state of the product and it looks like an ad.

---

## 14 · Enforcement
1. New feature? Compose from §3 primitives inside a §4 container. If you can't, this document gets amended FIRST.
2. Every interactive element ships with rest/hover/pressed(/selected/disabled) — no exceptions.
3. Every colour from §2.1; every shadow from §2.3; every animation from §2.4.
4. `Components.dc.html` is updated in the same change as any new treatment.
