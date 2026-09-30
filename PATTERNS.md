# Sturij Pairing Studio — Patterns Statement

This is the design law for `studio.html` / `studio.css` / `studio.js` and every surface that grows from it (the canvas stage included). New additions follow these patterns or they don't ship. Where a new need genuinely has no pattern here, extend this document in the same commit.

---

## 1. Palette — the brand's, one accent, warm neutrals

The Studio's colour and type are the brand's: `design/sturij-public/DESIGN.md` (Mark, 30 Sep 2026 — the chrome follows the brand; light and colour lift the materials). `studio.css` keeps its own names, with the brand's values, and `test/studio-brand.test.ts` fails if one drifts.

```
--navy   #232120   chrome (header, drawers' dark tabs, dark menus) — brand charcoal
--gold   #A67C3C   THE accent. Seams, active states, selection rings — brand bronze-gold
--bronze #8F6A33   the accent's deeper gold (brand gold-lo), for fills that carry white text and the favourite heart
--paper  #FAF7F0   light surfaces, button text-on-dark — brand paper
--paper-warm #F3EEE3, --card #FBF9F3 (brand soft white)
--ink    #34312A / --ink-body #34312A / --ink-muted #66615A — brand ink and muted ink
--timber #66615A   supporting tone only
--seam   #A67C3C   full-strength gold
--line   rgba(52,49,42,.12) — the brand hairline
```

**Law:** gold is the only accent. No second accent, no semantic colour-coding, no gradients as decoration. Materials themselves provide all the colour; the chrome stays near-monochrome. Where a surface needs its own UX (frost over a material), it takes a brand colour with transparency — registered as a custom token in `DESIGN.md` with its reason — never a new colour.

## 2. Seams — 1px full gold

Every line that separates two samples or two panels is **1px solid var(--seam)** (gold). Never grey hairlines, never 2px+, never shadows-as-borders between samples. `inset box-shadow` implementation so resets can't kill it. Rule of thumb: *if two materials touch, a 1px gold seam runs between them.*

## 3. Frost — the one translucency recipe

All floating light chrome uses the same frost (the brand's `glass.studio-frost`): `background: rgba(250,248,242,.25)` + `backdrop-filter: blur(10px)` (with the `-webkit-` prefix). The blur is what makes it frost: without it the layer is only pale white over the sample. The one exception is **the main tile tab** (`.pgrip`, the label tab at the top of each panel), which is `rgba(250,248,242,.5)` (`glass.studio-tab`) with the same blur so the panel's name reads over any material (Mark, 30 Sep 2026). The frost is shared by: the tile tabs, the heart tab (`.pfav`), the favourites drawer and its tab, the panel filter drawer, the panel close tab and the Suggested Pairings pill. Don't invent new alpha values or blurs — matching frost is what makes the layers read as one material. Dark floating chrome (menus, the vismenu) is `rgba(29,26,23,.92)` + blur. Hover states on frost may lift the alpha; resting states never differ. The paper colour used for borders, text and hovers on the dark chrome is not frost and is not governed here.

## 4. Type — the brand's families

- `--f-mono` (IBM Plex Mono) for ALL UI labels: uppercase, tracked (.10–.16em), 11–12px, weight 500. (The brand sets its labels at 600; the Studio keeps 500 until Mark rules.)
- `--f-serif` (Fraunces, the brand's titles) for editorial moments only (scheme name, welcome).
- `--f-sans` (Inter, the brand's body) for body copy.
- Never below 11px.

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
