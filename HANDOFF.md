# Commit pack — handoff to Claude Code (2026-08-14)
Push everything in `commit-set/` to `mark-j-walton/sturij-main-website` @ main, preserving paths (contents of this folder = repo root).

## What's in this drop
- **Canvas UX polish** (canvas.css/js/html, canvas-menu.js, canvas-fx.js, canvas-saver.js): container device (embossed controls, under-glow selection, inner-shadow wells, grip lines), swatch/photo corner language + rotate handle, shelf docks, post-it system, layer bands, paper grain, bevelled nav tiles with light-bleed, laid-paper background, Motion springs throughout.
- **Studio**: radius/tracking normalisation (studio.css), `studio-motion.js` (Motion springs on drawers/modals, no studio.js edits), loaded from studio.html.
- **DESIGN.md** — ruling design standards v2 (Motion is the single animation engine, §2.4).
- **Present/review production** (api/, supabase/migrations/, review.html, review-sync.js, vercel.json) — per PRESENT-REVIEW-DEPLOY.md; env vars listed there. Migration is a DELTA on the applied Sprint 4 boards schema.
- **board-3d.html** — standalone 3D specimen board (serves at studio.sturij.com/board-3d.html for Framer embeds). `framer/Board3D.tsx` is the native Framer code component (not used by the site; keep in repo for reference).
- **Cleaf finishes** (showcase/finishes/cleaf/ + catalogue.json + cleaf.json manifests).
- **Specs**: RESEARCH-SPEC.md (v1.1), CANVAS-UX-SPEC.md.

## After push
1. Vercel deploys automatically; check /canvas, /studio, /review, /board-3d.html.
2. Set env vars per PRESENT-REVIEW-DEPLOY.md if not already set; run the delta migration; enable Realtime on board_notes/approvals/boards.
3. For Framer: paste framer/Board3D.tsx into Framer (Assets → Code), or Embed https://studio.sturij.com/board-3d.html.
4. Optional: run MotionScore (AI Kit) over canvas.js/studio-motion.js and report grades back.
