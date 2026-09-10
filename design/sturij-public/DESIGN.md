# DESIGN.md — sturij-public

<!-- instance
id: sturij-public
surface: the public site — sturij.com's front door: the scroll-story page, the finish configurator, the enquiry band; the Studio's customer posture at the apex
base: none
-->

The public site's instance: the handoff's palette (design_handoff_sturij_public_site, 9 Sep 2026 — the 2026 house style: warm paper, charcoal, bronze-gold, claret) as data, in the shape page-platform v0.2 §3 S2 fixes. Two layers: the raw palette below, semantic roles above; the components bind roles and family tokens only. The heading face is Fraunces (Q6, Mark's word 10 Sep 2026) in place of the handoff's Degular; body is Inter; the mono is IBM Plex Mono, the handoff's own declared fallback for Config Mono. Every scrim, hairline and shadow the handoff drew is minted below as a custom token with its reason — the count is this instance's drift reading.

## Fixed points

```json
{
  "ground": "warm paper #FAF7F0 as the page ground; soft white #FBF9F3 for cards and inputs",
  "structure": "charcoal #232120 for the nav and footer; the button gradient #2C2A28 → #1B1A18",
  "bands": "warm-grey gradients — #4A4743 → #3B3936 (the Egger band), #3B3936 → #2C2A28 (the statement block, the enquiry band)",
  "tints": "linen #F0E9DC for the features section; sand #EFE7D8 for the montage",
  "accent": "bronze-gold #A67C3C; the gold gradient #B98F4E → #8F6A33 on pills and the tab thumb; claret #6E2A2E on paper, #B0434D on dark",
  "ink": "headings #2E2B25, body #34312A, muted #66615A, faint #9A9486",
  "titles": "Fraunces (variable; the statement block at weight 200) — Q6, in place of Degular",
  "body": "Inter 400 / 1.72 at 18px",
  "mono": "IBM Plex Mono 600 for kickers, labels and buttons — always uppercase, .10–.16em tracking",
  "radius": "cards 16–20, buttons 10, pills and tabs 999, gallery tiles 5 (flat), modal 16",
  "nav": "66px",
  "grid": "8px",
  "target": "44px",
  "source": "design_handoff_sturij_public_site/README.md (Design Tokens), 9 Sep 2026; page-platform v0.2 §3 S2 (locked); Q6 decision 10 Sep 2026 (Fraunces)"
}
```

## Palette

```json
{
  "charcoal": { "hex": "#232120" },
  "charcoal-hi": { "hex": "#2C2A28" },
  "charcoal-lo": { "hex": "#1B1A18" },
  "warm-grey": { "hex": "#4A4743" },
  "warm-grey-mid": { "hex": "#3B3936" },
  "input-line": { "hex": "#3A3733" },
  "paper": { "hex": "#FAF7F0" },
  "paper-warm": { "hex": "#F3EEE3" },
  "soft-white": { "hex": "#FBF9F3" },
  "linen": { "hex": "#F0E9DC" },
  "sand": { "hex": "#EFE7D8" },
  "gold": { "hex": "#A67C3C" },
  "gold-hi": { "hex": "#B98F4E" },
  "gold-lo": { "hex": "#8F6A33" },
  "claret": { "hex": "#6E2A2E" },
  "claret-hi": { "hex": "#B0434D" },
  "ink-heading": { "hex": "#2E2B25" },
  "ink": { "hex": "#34312A" },
  "ink-muted": { "hex": "#66615A" },
  "ink-faint": { "hex": "#9A9486" },
  "white": { "hex": "#FFFFFF" },
  "label-ink": { "hex": "#1B1A18" },
  "stage-hi": { "hex": "#4A4844" },
  "stage-lo": { "hex": "#211F1D" },
  "download-strip": { "hex": "#1B1A18" },
  "download-ink": { "hex": "#FAF7F2" }
}
```

## Roles

```json
{
  "ground": "palette.paper",
  "surface": "palette.soft-white",
  "ink": "palette.ink",
  "accent": "palette.gold",
  "line": "custom.line.ink-12",
  "ink-heading": "palette.ink-heading",
  "ink-muted": "palette.ink-muted",
  "ink-faint": "palette.ink-faint",
  "ink-on-dark": "palette.paper",
  "structure": "palette.charcoal",
  "structure-hi": "palette.charcoal-hi",
  "structure-lo": "palette.charcoal-lo",
  "band-hi": "palette.warm-grey",
  "band-mid": "palette.warm-grey-mid",
  "band-lo": "palette.charcoal-hi",
  "input": "palette.charcoal-hi",
  "input-line": "palette.input-line",
  "tint-linen": "palette.linen",
  "tint-sand": "palette.sand",
  "accent-hi": "palette.gold-hi",
  "accent-lo": "palette.gold-lo",
  "claret": "palette.claret",
  "claret-on-dark": "palette.claret-hi",
  "label-ink": "palette.label-ink",
  "tile-ink": "palette.white",
  "stage-hi": "palette.stage-hi",
  "stage-lo": "palette.stage-lo",
  "download-strip": "palette.download-strip",
  "download-ink": "palette.download-ink"
}
```

## Type

```json
{
  "display": { "family": "Fraunces", "weight": 400 },
  "title": { "family": "Fraunces", "weight": 400 },
  "statement": { "family": "Fraunces", "weight": 200 },
  "body": { "family": "Inter", "weight": 400, "leading": 1.72 },
  "label": { "family": "IBM Plex Mono", "weight": 600, "size": 11, "transform": "uppercase" },
  "mono": { "family": "IBM Plex Mono", "weight": 600 }
}
```

## Spacing

```json
{ "unit": 8, "scale": [4, 8, 12, 16, 20, 24, 32, 40, 48, 64], "target": 44 }
```

## Radius

```json
{ "card": 16, "card-lg": 20, "button": 10, "pill": 999, "tile": 5, "modal": 16, "input": 8, "swatch": 6, "mini": 12, "mosaic": 14, "chip": 8, "light-box": 14 }
```

## Shadow

```json
{
  "card": "0 1px 2px rgba(35,31,27,.04), 0 10px 30px rgba(35,31,27,.08)",
  "card-deep": "0 26px 54px rgba(35,31,27,.18)",
  "tile": "0 5px 16px rgba(0,0,0,.3)",
  "thumb": "inset 0 1px 0 rgba(255,255,255,.28), 0 4px 14px rgba(0,0,0,.35)",
  "button": "inset 0 1px 0 rgba(250,248,242,.14), 0 4px 12px rgba(0,0,0,.18)",
  "modal": "0 30px 80px rgba(0,0,0,.5)",
  "lightbox": "0 40px 100px rgba(0,0,0,.6)",
  "pill": "0 8px 24px rgba(0,0,0,.35)",
  "swatch": "0 4px 12px rgba(0,0,0,.35)",
  "rail-thumb": "drop-shadow(0 5px 12px rgba(0,0,0,.28))",
  "hero-text": "0 2px 34px rgba(0,0,0,.34)",
  "card-text": "0 2px 22px rgba(0,0,0,.32)",
  "mini-text": "0 1px 10px rgba(0,0,0,.7)",
  "nav-hairline": "0 1px 0 rgba(0,0,0,.22)",
  "card-top-hairline": "0 -1px 0 rgba(250,248,242,.4)"
}
```

## Motion

```json
{
  "fast": 200,
  "normal": 350,
  "slow": 450,
  "reveal": 900,
  "marquee": 60000,
  "ease-enter": "cubic-bezier(.2,.7,.3,1)",
  "ease-exit": "cubic-bezier(.4,0,1,1)",
  "ease-settle": "cubic-bezier(.2,.7,.3,1)",
  "travel": "26px",
  "lerp": 0.1
}
```

## Custom tokens

```json
{
  "line.ink-12": { "value": "rgba(52,49,42,.12)", "reason": "the handoff's hairline on paper (--line)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "line.ink-7": { "value": "rgba(52,49,42,.07)", "reason": "the softer hairline between bands (--line-soft)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "line.paper-18": { "value": "rgba(236,230,218,.18)", "reason": "the pale hairline on dark (--line-pale)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "line.ink-20": { "value": "rgba(35,31,27,.2)", "reason": "the modal option and ghost button border", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "line.gold-40": { "value": "rgba(166,124,60,.4)", "reason": "the gold hairline on charcoal buttons", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "line.gold-50": { "value": "rgba(166,124,60,.5)", "reason": "the gold hairline on the submit and the ghost pill", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "line.gold-30": { "value": "rgba(166,124,60,.3)", "reason": "the spinner ring's track and the room builder's border", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "fill.gold-15": { "value": "rgba(166,124,60,.15)", "reason": "the ghost pill's hover wash", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "scrim.caption": { "value": "linear-gradient(100deg, rgba(26,23,20,.84) 0%, rgba(26,23,20,.62) 34%, rgba(26,23,20,.24) 58%, transparent 80%), linear-gradient(to top, rgba(26,23,20,.58) 0%, rgba(26,23,20,.3) 40%, transparent 72%)", "reason": "the caption-anchored scrim over every hero panel (README §2)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "scrim.card": { "value": "linear-gradient(to top, rgba(26,23,20,.88), rgba(26,23,20,.4) 34%, transparent 62%)", "reason": "the bottom scrim on the stacking cards (README §8)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "scrim.darken": { "value": "26,23,20", "reason": "the RGB the scroll-scrub darken overlay uses at 0–45% (README §2)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.modal": { "value": "rgba(20,19,18,.55)", "reason": "the blurred veil behind the swatch modal and room builder", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.lightbox": { "value": "rgba(20,19,18,.6)", "reason": "the blurred veil behind the lightbox", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.room": { "value": "rgba(20,19,18,.5)", "reason": "the room picker's overlay on the image", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.label": { "value": "rgba(20,19,18,.88)", "reason": "the tile's hover label bar", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.chip": { "value": "rgba(20,19,18,.85)", "reason": "the editing-mode chip and the swatch name chip", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.message": { "value": "rgba(20,19,18,.78)", "reason": "the generation error message's backing", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "veil.tabs": { "value": "rgba(20,19,18,.55)", "reason": "the room picker's tab pill on the image", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.pill": { "value": "rgba(250,248,242,.06)", "reason": "the sliding tab's glass fill and the roundel's empty watermark (README §3)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.pill-line": { "value": "rgba(250,248,242,.14)", "reason": "the sliding tab's 1px border", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.mini-line": { "value": "rgba(250,248,242,.1)", "reason": "the mini gallery's border", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.dark-25": { "value": "rgba(0,0,0,.25)", "reason": "the mini gallery's backing", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.dark-22": { "value": "rgba(0,0,0,.22)", "reason": "the flooring sub-panel's backing", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.panel-line": { "value": "rgba(250,248,242,.12)", "reason": "the flooring sub-panel's border", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.ghost-line": { "value": "rgba(250,248,242,.3)", "reason": "the ghost button border on dark", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "glass.foot-line": { "value": "rgba(250,248,242,.25)", "reason": "the footer toggle's border", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-90": { "value": "rgba(250,248,242,.9)", "reason": "panel body copy on dark", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-74": { "value": "rgba(250,248,242,.74)", "reason": "nav links at rest", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-72": { "value": "rgba(250,248,242,.72)", "reason": "band intro copy and footer links", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-60": { "value": "rgba(250,248,242,.6)", "reason": "footer body", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-58": { "value": "rgba(250,248,242,.58)", "reason": "inactive tab labels", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-55": { "value": "rgba(250,248,242,.55)", "reason": "the statement block's translucent grey and the swatch note", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-50": { "value": "rgba(250,248,242,.5)", "reason": "the room builder's subline and key note", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "ink.on-dark-40": { "value": "rgba(250,248,242,.4)", "reason": "input placeholders on dark", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "tint.mosaic": { "value": "35,33,32", "reason": "the RGB the montage tiles tint at 3–23% and the roundel emboss at 3% (README §9)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "sheen.grain": { "value": "linear-gradient(115deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,.1) 28%, rgba(255,255,255,0) 55%, rgba(255,255,255,.14) 82%, rgba(255,255,255,0) 100%)", "reason": "the 3D viewer's diagonal grain sheen (README §4)", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" },
  "feat.imgwell": { "value": "linear-gradient(150deg, rgba(35,33,32,.88), rgba(35,33,32,1))", "reason": "the feature image well before the image decodes", "by": "claude-code (from the handoff)", "at": "2026-09-10T15:00:00Z" }
}
```
