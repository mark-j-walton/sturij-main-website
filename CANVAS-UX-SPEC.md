# Canvas containers & plan-room — UX direction (Mark, 2026-08-14, from Paper review)

## A. The container device — ONE format, ALL containers
1. **Depth**: subtle inner shadow on the content well; the card itself carries a soft drop shadow (floating effect).
2. **Selected**: glow underneath the card.
3. **Close** — top right: subtle **embossed** button, same colour as the card, stylish slight emboss with an ×. Closes the container back to its home (drawer/dock/etc).
4. **Resize** — bottom right: embossed lines (grip) marking the resize handle.
5. **Drag** — the whole top of the card is the drag trigger.
6. **Title text**: current style is fine, just make it consistent across all cards.
7. **Aspect**: resizing the container never distorts the displayed item's proportions; there is a stop point before the image degrades.
8. **Border colour** is user-changeable per container; **buttons auto-contrast** against it.
9. **Buttons** need designed states: rollover, selected, pressed — currently none.
10. Typical stacking behaviour retained (send to back etc).
11. **Cards on walls**: a drawn wall can be **locked**; the wall can still be resized and its cards scale proportionally with it; items always sit **above** the wall, never underneath.

### A2. Swatch / photo variant (small media cards)
- Wide heading moves to the **bottom**.
- Resize grip: **top right**. Close ×: **bottom right** (same emboss styling), with a **minus** next to it.
- **Minus** = return the swatch to its original state/home (the doc, drawer, etc). **×** = remove from canvas to its main home.

## B. Plan → Room (perspective view)
1. The room view does **not** show until a floor plan exists; the room IS the selected floor plan (real geometry).
2. A **camera** can be placed in the room; moving the camera changes the perspective view.
3. Room has **walls, skirting, ceiling**; ceiling **toggles on/off**.
4. **Windows and doors** added to the plan appear in the room — each element **breaks the wall** and is sized per element.
5. **Wardrobes** dropped on the floor plan render in the drawing style; currently 2 configurable units (wardrobe + drawer packs), bedroom focus, more to come. Doors on/off on the wardrobes.
6. **Colours** apply to ceiling, walls and skirting **from swatches**.
7. Plan + measurements keep constant styling and breathing room regardless of container scale.
8. Purpose: get the basics right fast; quick-quote logic evolves per the marks-brain estimator.

## C. Estimator model (from marks-brain estimator screens, 2026-08-14)
- **Unit types (2)**: Wardrobe — room width/height/depth, ends condition (wall to wall / one open end / open both), scribe width mm, auto-divided sections (~1109mm) each with a layout: Long hanging / Double hanging / ¾ + drawers / ¾ + shelves / Shelves only / Split + drawers, + shelf count (over rail · 50mm). Drawer Chest — W/H/D + drawer count.
- **Opening**: Handles vs Push to open (priced per catch/handle).
- **Job flow**: quantity → Add to job → running estimate (£ · boards · panels · edging) → Breakdown → Share PDF. Saved jobs: name → Save/Load/Delete (per device).
- **Editable prices**: 18mm carcass £62/sheet · 18mm show £98/sheet · 8mm back £36/sheet · carcass tape £0.45/m · show tape £0.95/m · Blum hinge £4.50 · tandem runner set £28/drawer · handle £3.50 · push catch £2.50 · hanging rail £14/m · rail end fixings £3.50/rail · Rafix cam £0.85 · Rafix pin £0.35 · leg £2.20 · shelf pin £0.10 · manufacturing £350/day · installation £300/day · delivery £60/unit · project management 10% · contingency 10%.
- Light/dark theme toggle; all figures are planning allowances, never quotes.

## Priority
Container device (A + A2) first — immediate UX impact across the whole canvas. Then B incrementally (room-from-plan, camera, openings, wardrobes, swatch colouring).
