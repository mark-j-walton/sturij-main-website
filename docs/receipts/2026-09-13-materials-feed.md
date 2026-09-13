# Receipts — the materials feed: the site reads one registry · 13 September 2026

Session `claude-code-session-2026-09-11-materials-feed` · Claude Code, model claude-fable-5-1 · the Architect's brief of 11 Sep (Part A runnable now; Part B held) with addendum 1 (the metal finishes), run as written on 13 Sep on Mark's word.
Branch `claude/materials-feed-2026-09-13` off `main` @ 7d8beae (the #40 merge). Draft PR; Mark merges. **Nothing merged. Nothing to production.**

MERGED ≠ DEPLOYED ≠ EXERCISED — each line below says which.

## The registry, read before a line was written

sturij-assets (`uxdrokyxywwezorpvfsp`), read on 13 Sep 2026 at 20:56 Z through the Supabase connector (the session's own read-only read; no key touched this repository or this chat).

| Reading | Value |
|---|---|
| materials · published · images · measurements · variants · suppliers | 887 · 855 · 564 · 11 · 10,864 · 10 |
| Egger decor boards, published | 25 — each with one `swatch` image row whose `storage_path` is `showcase/finishes/<name>.webp` (1800 × 1012), i.e. a file in this repository's public folder, the store the record names (745e6fe7); all 25 files present |
| the site's seven coded decors | all present, published, each with an image and a measurement (hex, OKLCH, texture, fidelity photographic, vision-pass@1 of 10 Sep) |
| Natural Dimaro Walnut · Cassis | present, published, no decor code, no measurement |
| Alpine White · Graphite Grey | **not in the registry** — the handoff drew them as gradients |
| handle finishes | **none** — the registry holds handle products (Hendel & Hendel 80, Häfele 449) with a `finish` axis of gloss / matt / satin / textured and a synthetic `colour` palette (10,000 of 10,864 variants marked synthetic); no metal finish record exists |
| access | RLS on every table; the only client policy is `media_public_read`; the materials table's own comment: "No client policies: access is via grant-checked service-role API routes only" |

## What shipped (on the branch)

| Piece | What |
|---|---|
| `data/range.json` | the page's selection as data: nine registry ids (the handoff's decors that exist in the registry), the placing rule (Egger's code grammar → family, declared once), the two decors the registry lacks, the fifteen finish names with the finish rule — **no decor named in code** (a test scans `components/`, `lib/` and `app/` for every name in the feed: 0 hits) |
| `data/registry/decor-boards.2026-09-13.json` | the registry as read — the provenance of the snapshot; the feed regenerates from it byte for byte (tested) |
| `scripts/materials-feed.mjs` | runs before every build: reads the registry through `STURIJ_ASSETS_READ_KEY` / `STURIJ_ASSETS_URL` by name, joins the selection, emits `public/materials.json`; guards refuse a thin answer (a missing or unpublished row, an unplaced uncoded row, an empty tab, an empty reply); the fallback keeps the previous snapshot and says so — the site never fails on the feed |
| `public/materials.json` | the snapshot: its date, source and counts; 9 decors by id with code, name, family, finish (Egger ST code), measured texture, the measured colour as hex + OKLCH with confidence, the swatch image by id with the registry's own dimensions and bytes; 15 handle finishes, all held; 22 misfits |
| `lib/galleries.ts` | the galleries built from the feed — `data/galleries.json` deleted; `FEED.snapshot`, `isPainted` (the calculator's uplift from the family), `registryMisfits()` from the snapshot |
| the strip (`FinishConfigurator.tsx`, `app/site.css`, tokens `held.ground`, `held.line`, `held.canvas`) | `#range` carries `data-snapshot` and `data-feed`; a held finish is a labelled tile — the name on the neutral ground, "sample at the visit" — never a small file scaled up; the roundel and the texture channel paint the neutral for a held finish |
| the render (`lib/render.ts`, `VisualTarget.tsx`) | a held channel travels as `placeholders`; the prompt says the texture is a neutral placeholder and names the finish |
| the calculator (`Calculator.tsx`) | `painted` reads the decor's family, not a gallery named in code |
| declarations | `pages/home/layout.json` (the range's slots read the feed, selection and reading named), `artifacts/finish-configurator.json` (property `feed`, capability, tokens, delta), `design/sturij-public/DESIGN.md` (42 → 45 custom tokens), `next.config.ts` (the registry's own storage host allowed, for the door), `README.md`, `package.json` (`npm run feed`; `dev` and `build` run the feed first) |
| tests and checks | `test/materials.test.ts` (15 tests), `test/assets.test.ts` updated, `scripts/quality.mjs` +2 checks (the Handles tab is held tiles labelled "sample at the visit"; the range declares its snapshot) |

## The metal finishes (addendum 1) — measured

The fifteen files in `public/showcase/metals`, read with sharp:

| Reading | Value |
|---|---|
| files | 15, every one 1024 × 1024 JPEG, 72 dpi |
| bytes | 188,595 (chrome-plated) to 495,130 (matt-black); 5,159,394 in all |
| how the strip asked for them | `sizes="(max-width: 760px) 60vw, 310px"` → a 310 px slot, so 620 px at 2× and 930 px at 3×; `next/image` never upscales past the source, so the optimiser served 640–1080 px candidates **re-encoded at q=75** from a 1024 source — not upscaled by the optimiser, but re-encoded below the rule's q ≥ 85, from a source under the rule's 1500 px, and procedural rather than the maker's photography |
| the rule | a finish tile is the maker's own photography or a system render, master ≥ 1500 px on the short side, renditions down never up, q ≥ 85, one family across the set |
| the outcome | **15 held** — every finish a labelled tile until a master lands; the files stay in the repository (asset kind `metal`, note updated) and are no longer served by the strip |

## What was measured

Local production build of the head (`reports/quality-2026-09-13T21-14-13-625Z.json`; the reports directory is not tracked):

| Check | Result |
|---|---|
| vitest | 70 / 70 (54 before; +15 for the feed, +1 for the render's placeholder channel) |
| typecheck | clean |
| token audit | 0 one-offs over 51 files; 45 custom tokens (42 before — the three held-tile tokens) |
| bundle scan · key-shape scan | 0 hits (14 client files) · 0 hits over 1,196 tracked files |
| the feed at build | `materials feed: registry not read (E_NO_KEY: STURIJ_ASSETS_READ_KEY is not set …) — the snapshot of 2026-09-13T20:56:51.851Z stands (9 decors, 15 finishes held); the site builds on it` — the fallback, as designed, until the key exists |
| quality run | 36 / 36 — the galleries show 3 / 4 / 2 / 15 decors once each; the Handles tab is 15 held tiles labelled "sample at the visit" with 0 unlabelled; `#range[data-snapshot]` = 2026-09-13T20:56:51.851Z |
| Lighthouse home (mobile · desktop) | 85 · 100 · 100 · 100 (LCP 4.1 s, TBT 99 ms, CLS 0) · 100 · 100 · 100 · 100 — two runs on the same build read 82 and 85 on mobile; #40's local run read 88, so the reading sits inside the run-to-run band, and the feed adds one small JSON to the client bundle |
| Lighthouse /calculator (mobile · desktop) | 90 · 100 · 100 · 100 · 100 · 100 · 100 · 100 |

Screenshots (dev server, 1440 px): the Handles tab as fifteen held tiles; a swatch built with a held handle — the roundel's handle facet neutral, the range rail counting it. Not exercised: a render with a held channel (no `GEMINI_API_KEY` on the project) and the REST read (no key).

## The misfit list from the snapshot (filed on the key for IS v2's asset migration)

| Kind | Count | Rows |
|---|---|---|
| not-in-registry | 2 | Alpine White, Graphite Grey — collected into the registry with their Egger codes, they enter the strip by id |
| no-code | 2 | Natural Dimaro Walnut, Cassis — published Egger rows without a decor code; placed by the selection with the line |
| no-measurement | 2 | the same two — the vision pass has not run on uncoded rows |
| flat-swatch | 1 | Cassis — the registry's swatch file is 3,366 bytes, a flat synthetic colour; a photographic swatch is owed (the registry's other flat files — Caramel Beige, Dark Berry, Deep Blue, Estate Green, Havanna Grey, Monument Grey, Soft Beige — are not on the site) |
| held-finish | 15 | the fifteen handle finishes — no finish record in the registry and no master in the library |
| names disagreeing with the registry | 0 | every name the site shows is the registry's own |

## Blocked — reported to the Architect

- **The build-time read has no key to use.** Part A (1) presumes a read-only key in the vault; none exists, and none can be minted as things stand: every registry table carries RLS with no client policy (the materials table says so in its own comment), so any key short of the service role reads nothing — the fetcher treats an empty answer as a fallback, never a feed. The `/STURIJ_ASSETS` vault folder holds 0 names. Two ways in, both a change on the registry's project and therefore not this run's: (a) SELECT policies for the `anon` role on published rows of `materials`, `material_images` and `material_measurements` (a view for finishes when they exist), read with the project's publishable key under the name `STURIJ_ASSETS_READ_KEY`; (b) a `registry_reader` Postgres role with SELECT on those tables and a token minted into the vault. (a) is one migration and exposes only published catalogue facts; the registry's designers wrote the comment for a reason, so the call is the Architect's. Part B's door is the durable answer either way. Until then the committed snapshot stands and every build reports it.
- **The registry names no handle finish.** The fifteen names are the handoff's, kept as data; the addendum's held rule covers the tiles, but "the handle finishes by id" waits on finish records in the registry.
- **Two of the handoff's decors are not in the registry** (Alpine White, Graphite Grey); the Colours tab shows two decors until they are collected.

## Corrected, this run

- The brief's "swatch image by id from the asset library (the registry's storage)": the registry's storage buckets hold no swatch (catalog 0 objects); its image rows point at this repository's showcase folder, which the record registered as the store. The feed follows the registry's path; nothing was moved.
- The first quality run recorded 0/0: `next build` type-checks the tests, and the new test's typings failed it (a JSDoc on the script's `run` options fixed it); the run was repeated on the corrected head.
- The screenshot flow could not click a marquee tile (Playwright: "element is not stable") — clicked by script instead.

## Mark's direction on the way (13 Sep, for the Architect, not built here)

- The swatch tools: filtering, complementary-colour logic, the colour tool and its wiring, a voice path where a visitor asks for a style and the AI composes options — the feed now carries measured colour (OKLCH with confidence), family, texture and finish on every decor for that work.
- Downloads: the visitor gets a swatch, never the 15 MB Egger master; a link to the master for whoever wants it (an architect, a designer); Sturij-branded product content generated dynamically — a web link carrying the visitor's data, from which a PDF can be made.

## The finish renders — the mechanism, ready for the key (Mark's word, 13 Sep: "let's do the renders")

Mark's decision: the fifteen metal finishes become **system renders** — the finish rule's second source — provider-agnostic and caveated as illustration only; he adds the key. What shipped in this increment (nothing rendered yet: the key has not reached the project or this machine):

| Piece | What |
|---|---|
| `data/finish-rig.json` | the rig as data: one handle form (a slim D pull), one door (flat matt charcoal slab), one light (soft north daylight, softbox left), one angle and crop, the prompt template and its negatives, the floor (short side ≥ 1500 px, JPEG q 90), the provider block (Gemini, the pro image model at 2K by default; the flash model answers 1024 px and fails the floor), the rights (Sturij, kind system) and the caveat — "Illustration only — a system render of the finish, not the maker's photograph. Colour and lustre are approximate; a sample is shown at the visit." |
| `data/range.json` | a `note` per finish — the words that make Antique Brass differ from Satin Brass in the prompt — as data |
| `scripts/render-finishes.mjs` (`npm run render:finishes`) | a session tool, not a build step: reads the key by name from the environment (never printed, never written), asks the provider for one image per finish, **refuses any image under the floor rather than upscaling it**, writes the master into the store (`public/showcase/metals/<id>.jpg`) and a provenance row into `data/finish-masters.json` — provider, model, the prompt's sha256, the rig version, the date, the rights, the caveat; `--dry-run` prints the fifteen prompts; `--only`, `--force`, `--provider` |
| `data/finish-masters.json` | the register — empty until the run |
| the feed | a finish with a master at the floor shows it as a system render with its caveat (`system: true`, the misfit kind `system-render` recording provider, model and date); one without stays held; a master under the floor stays held with the line |
| the tile | a system render carries an "illustration" chip and the caveat in its title and alt text; the pack and the render prompt read the same tile |
| tests | +3: a master at the floor shows and one under it stays held; the rig makes one family (fifteen distinct prompts, the same handle, door, light and angle); the floor and the register row |

**The render lab, read (`~/repos/sturij/sturij-visualiser/src/admin/RenderLab.tsx`, `LabConsole.tsx`, `api/render.js`).** It is the restyle tool the Architect described on 10 Sep: a base frame, labelled swatches, the prompt and its chips, one provider (Gemini — "one provider makes the endpoint simple and predictable"), a whitelist of four image models with the pro model at 2K by default, a CORS and production gate, and a dashboard over `render_test` that says its logging starts once the service-role key reaches Vercel — the fault the Architect already flagged. It writes into no store. So for "specific renders as an admin function": the runner above is the interim — it writes masters into the registry's store with provenance and the caveat, through a PR Mark merges; the render lab is the right interactive home, and a "finish master" preset there needs two things first — a write path into the library (sturij-assets storage and finish records: Part B territory) and the lab's logging off the service role. Both are the visualiser window's, under its lock, not this repository's.

**When the key lands:** `vercel env pull` into `.env.local` (never read or printed), `npm run render:finishes`, the fifteen reviewed by eye against the family, `npm run feed`, the masters and the register committed on this branch. The dry run's prompts are on this key.

## Still owed

**Mark:** the render key on the project (`GEMINI_API_KEY`, and `GEMINI_IMAGE_MODEL_MASTER` if the pro model is not to be the default), then the fifteen renders run and reviewed. **Mark / the Architect:** the read path on sturij-assets (a) or (b) above, then `STURIJ_ASSETS_READ_KEY` and `STURIJ_ASSETS_URL` synced to the Vercel project by name — the first build after that reads live; the maker's full-resolution finish set and its licence terms (Hendel & Hendel if the palette is theirs) — the session files the rights rows and the masters, and the fifteen tiles come off hold one by one; Alpine White and Graphite Grey collected into the registry; Part B on Mark's word. Still from take-to-live: the four vault names for the admin loop, the redirect map, the cutover acts.
