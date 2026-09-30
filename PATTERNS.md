# Sturij Pairing Studio — Patterns Statement

This is the design law for `studio.html` / `studio.css` / `studio.js` and every surface that grows from it (the canvas stage included). New additions follow these patterns or they don't ship. Where a new need genuinely has no pattern here, extend this document in the same commit.

---

## 1. Palette — one accent, warm neutrals

```
--navy   #1D1D1D   chrome (header, drawers' dark tabs, dark menus)
--gold   #D4A01B   THE accent. Seams, active states, selection rings. Nothing else.
--paper  #FAF8F3   light surfaces, button text-on-dark
--paper-warm #F0EDE8, --card #FFFFFF
--ink    #1D1D1D / --ink-body #2A2724 / --ink-muted #62584F
--bronze #4A5D4E, --timber #62584F   supporting tones only
--seam   full-strength gold
```

**Law:** gold is the only accent. No second accent, no semantic colour-coding, no gradients as decoration. Materials themselves provide all the colour; the chrome stays near-monochrome.

## 2. Seams — 1px full gold

Every line that separates two samples or two panels is **1px solid var(--seam)** (gold). Never grey hairlines, never 2px+, never shadows-as-borders between samples. `inset box-shadow` implementation so resets can't kill it. Rule of thumb: *if two materials touch, a 1px gold seam runs between them.*

## 3. Frost — the one translucency recipe

All floating light chrome uses the same frost: `background: rgba(250,248,243,.5)` + `backdrop-filter: blur(...)`. This exact value is shared by: panel tabs, the favourites drawer + tab, the Suggested Pairings pill, sample identity pills. Don't invent new alpha values — matching frost is what makes the layers read as one material. Dark floating chrome (menus, the vismenu) is `rgba(29,26,23,.92)` + blur.

## 4. Type

- `--f-mono` (IBM Plex Mono) for ALL UI labels: uppercase, tracked (.10–.16em), 11–12px, weight 500.
- `--f-serif` for editorial moments only (scheme name).
- `--f-sans` for body copy.
- Never below 11px. Never bold (600+).

## 5. Buttons and tabs — one geometry

Header buttons (`.hbtn`): 34px tall, pill radius, mono uppercase, icon 15px, identical min-width in a row. Hover inverts (paper bg, ink text). Press = `translateY(1px)`. Panel tabs, drawer tabs and function-bar controls reuse the same proportions. **One primary treatment; no outlined/ghost/filled variant zoo.**

## 6. Chrome lives at the edges

Actions belong in the header rows (main bar + contextual second row) or in edge drawers/tabs. The canvas itself carries **no buttons** except the bottom-centre heart tab (`.pfav`) and panel grips, which appear on hover/selection only. If a new feature needs a control, it goes in the header's contextual row, not on the samples.

## 7. Materials are full-bleed and label-free

Samples render edge-to-edge with **no permanent text on them**, and **no colour or brand name shows on any instance** — no tile, swatch, placed card, favourites chip or suggestion card (Mark, 30 Sep 2026: the choice is made by eye, not by name; this is not a product search or a brand comparison). The **post-it** is the detail surface: the customer sticks it on an instance and it carries the detail. The frosted hover label and tooltips show names **only when the designer switch is on** (`body.shownames`), for admin and interior-designer accounts; customers never see the switch. Truncated text is banned — tooltip instead.

**Favourites** show on their heart: the outline stays and the fill goes from transparent to see-through bronze, `color-mix(in srgb, var(--bronze) 45%, transparent)` — the heart tab (`.pfav.on`) and a placed card's heart (`.wh.on`) alike.

## 8. Drawers

All edge drawers share: same width when open, `z-index` above the canvas (never clipped by column width), frosted background per §3, a tab in the same geometry as §5, opening animation per §9. Filters inside drawers are dropdowns (multi-select, colour bars where the domain is colour) — not chip walls.

## 9. Motion — Motion One springs, luxury register

Animation uses the Motion library (commercial licence held). Springs around `stiffness 260 / damping 24`; nothing snappier. Rails glide with inertia; drawers slide; notes settle. No bounces for their own sake, no decorative loops. Everything honours `prefers-reduced-motion`.

## 10. Data is manifest-driven

Materials load from `showcase/**/*.json` manifests (paints, boards, wallpaper, floors, handles, worktops, suggestions). New material classes = new manifest + rail, never hard-coded arrays in JS.

## 11. State

Scheme state persists to `localStorage` (`sturij-*` keys) and restores with a toast + "Start fresh". Share = full state hash-encoded in the URL, no backend. Never clear keys you didn't write.

## 12. Renders — facts, not prose

Visualise prompts are sectioned (CONTEXT / MATERIAL FACTS (STRICT) / INSTRUCTIONAL LOGIC / STYLE & FINISH / NEGATIVE CONSTRAINTS) and fact-led: maker · product · hex per surface, textures called out explicitly, negatives flat. No mood prose. Contract: POST `{base, prompt, requestId, swatches[≤14], scenario:'pairing-studio'}` to the visualiser's `/api/render`.

## 13. Voice

Sentence-case UI, spare and trade-literate. British English. No emoji, no unicode-as-icons; line icons at stroke 1.7, 15px.

---

*Deviation from this document is a design decision, not an implementation detail — it gets discussed first.*
