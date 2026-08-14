# Sturij Canvas — Sprint Plan

Structured development of the board (`canvas.html`). Each sprint ships whole; PATTERNS.md governs all visuals.

## Sprint 1 — Craft: the board feels professional  ✅ (this commit)
- Multi-select: shift-click to add, shift-drag marquee on empty board; group drag
- Context bar (frosted, top-centre) on selection: Lock · Front · Back · Duplicate · Export · Delete
- Lock: locked items select but never move/resize/delete (walls stay put while composing on them)
- Stacking: bring-to-front / send-to-back — walls stack among walls (always behind content), items among items
- Undo / redo: Ctrl+Z / Ctrl+Shift+Z (60 steps); Delete key removes selection
- Type tool: text blocks in the three brand faces (Source Serif 4 / Helvetica Neue / IBM Plex Mono), size stepper, editable in place
- High-quality export: exports the SELECTION if one exists (a locked wall + its contents = "export a wall"), else the whole board; renders up to 4× (~5000px long edge) PNG
- Acceptance: undo restores any of the above; a locked wall with 10 items exports as one hi-res image; text survives reload

## Sprint 2 — Pipeline: everything flows in
- "Send to board" in the studio: snips, scheme photos, Nano Banana renders, suggested-pairing swatches
- Plan card → visualiser handoff (shared RoomPlan/Opening model; one localStorage write + link)
- Visualise from the board: selection's swatches + photos become the labelled references; render lands back on the board
- **Nano Banana upscale**: "Enhance" on any exported wall/board — send the PNG with a fidelity-preserving preset prompt, get a high-res version back
- **Preset prompts** (the recolour play): select a photo + a swatch → "Reupholster in this fabric", "Repaint in this colour", "Change worktop to this stone" — sectioned fact-led prompts, result placed beside the original
- Acceptance: chair photo + fabric swatch → recoloured chair on the board in <60s

## Sprint 3 — Presentation & schedule
- "Build presentation": select boards/walls → AI composes a paged client deck (cover, one page per wall/room, materials schedule from swatches present: maker · product · code) → PDF
- Frames (named regions) if walls prove insufficient as the room-grouping device
- Board → PDF direct export
- Acceptance: 3-wall board → branded 5-page client PDF in one click

## Sprint 4 — Multi-board & sharing
- Named boards per client/project (storage moves to Supabase; localStorage stays as offline cache)
- **Publish & feedback loop**: designer publishes a version; the client link shows ONLY the published version; client adds post-its; designer replies (note changes colour when answered); "all responses ready" notification to the client. Requires Supabase (boards, versions, notes, auth-light client links) + one notification channel (email via Resend or similar)
- Read-only client share link; client post-its
- Web clipping (paste URL → product card) — needs a tiny CORS proxy on Vercel
- Chrome extension: snip any page → lands on the board; board library picker in the popup

## Deferred / ideas parked
- Swatch "spill" tint preview; estimator handoff (cutting list from schedule)
