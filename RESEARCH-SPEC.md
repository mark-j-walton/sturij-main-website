# Sturij Research Library — Specification v1.1
_2026-08-14 · v1.1 folds in the review: imagery rights, quotas, request privacy, source policy, dedupe, Q&A scope, scale, export completeness._

Mark's picks: canvas/studio tile entry (and per his note, the surfaces combine — request anywhere, browse in the library); freeform prompt + guided refinements; reports carry taster, trend imagery/mood pages, citations, suggested actions; shelf-metaphor library; spec first.

## 1 · The loop
1. **Request** — designer opens the Research tile (canvas/studio) or types in designer chat. Freeform ask + optional guided refinements (topic, region, depth, imagery, deadline).
2. **Gather** — we spawn one or more research agents. Status appears as a quiet card in chat ("Researching — Japandi wardrobes, UK suppliers · ~10 min").
   - **2a. Dedupe first (the flywheel)**: before any agent runs, the request is matched against the existing report corpus. A close match returns instantly ("We looked at this in March — here's the report; want it refreshed?"). Instant answer for them, cost saved for us.
3. **Taster** — 5-6 line executive taster lands in the designer chat as a card with the report cover. Conversational from the first second.
4. **Report** — full PDF: cover, taster page, findings with **cited sources throughout**, trend imagery / mood pages, **suggested next actions for their studio**.
5. **Converse** — designer asks questions of the report or asks for ideas. **Scope rule**: answers ground on the report and its cited sources only; anything beyond that boundary gets "want me to research this properly?" — never free-styled facts.
6. **Shelve** — the report files itself onto the designer's **shelf** in the Library.
7. **Learn** — report **outputs** feed the shared brain. Request **patterns** are private commercial signals: used only aggregated and anonymised, stated plainly in the product. (A designer's next pitch is never visible to anyone else.)
8. **Leave whole** — one-click export of the entire library: PDFs, the index, **and every Q&A thread** — the questions are half the value.

## 2 · Surfaces
### R1 Research tile (canvas + studio)
A launcher tile ("Research") in the Create group. Opens the **Research drawer** — a K1 card:
- P3 freeform well: "What should we look into?"
- "Refine" disclosure → guided fields (P2 pill rows + P3 wells): Topic focus · Region (UK default) · Depth (Taster only / Standard / Deep dive) · Imagery (yes/no) · Needed by.
- Recent requests listed below as rows with status dots (gold = in progress).
> **US-R1**: As a designer I fire off a research request without leaving my board, in one sentence if that's all I have.

### R2 Taster card (designer chat)
Chat bubble variant: report cover thumbnail (P8 tile), title, the 5-6 line taster, three actions — **Open PDF** · **Ask about this** · **Shelve it**. Delivered by "Sturij Research" sender identity.
> **US-R2**: As a designer I get the gist in chat before I ever open the PDF, and I can start questioning it right there.

### R3 The Library
Its own page (`library.html`) in the shell nav, shelf metaphor per the canvas language:
- Reports stand as **spines** on timber shelves; hover turns a spine to its **cover card**; click opens a reading view (PDF pages as cards) with the chat thread beside it.
- Shelves are auto-grouped (by month or topic) and renameable — the K3 inline-edit pattern.
- Search + P7 tag chips above; tags auto-extracted from requests. **Scale rule**: shelves lead to ~50 reports; beyond that search leads and shelves become the browse mode — both designed from day one.
- **Take it with you**: an export action bundling every PDF + index + Q&A threads. Always visible, never buried.
> **US-R3**: As a designer my library reads like a growing bookcase of my own commissioning, not a file dump — and it is demonstrably mine.

### R4 Proactive suggestions (later phase)
Interest profile builds from requests + questions. At most one suggestion card per week in chat ("You've been circling limewash finishes — want the spring supplier round-up?"), opt-in at first use, one-tap mute.
> **US-R4**: As a designer the platform notices what I care about without ever feeling like surveillance; I can shut it off in one tap.

## 3 · The report (PDF)
Doc-page document, Sturij paper theme (Cormorant + Plex Mono, paper/gold):
1. **Cover** — title, date, requester, hero image, Sturij Research mark.
2. **Taster page** — the 5-6 lines, verbatim from chat.
3. **Findings** — sections per sub-question; every claim carries a numbered source; pull-quotes in Cormorant.
4. **Mood pages** — trend imagery grids with captions + source credits (when imagery requested). **Rights rule**: imagery is limited to licensed/openly-licensed sources and supplier press kits; anything else appears as a credited *linked* thumbnail, never full-bleed. The library is portable, so every page must be redistributable.
5. **For your studio** — 3-5 suggested next actions, concrete and small.
6. **Sources** — full citation list, dated.
Length: Taster-only = 1-2pp · Standard = 6-10pp · Deep dive = 15-25pp.

### Source policy
Ranked: trade press and journals → supplier/manufacturer data → standards bodies → reputable general press → everything else only with a visible confidence note. Blogspam is never cited; thin sourcing is admitted on the page ("sources here are limited — treat as directional").

### Quotas
Tasters unmetered · Standard N/month per designer · Deep dives counted (top-up purchasable). Dedupe hits (2a) are free and don't touch quota — the library answering is the product working.

## 4 · Agents (backend sketch)
- `POST /api/research/request` — {prompt, refinements} → job row (Supabase `research_jobs`), spawns agent run.
- Agent pipeline: plan sub-questions → web gather (public sources only, recorded) → synthesis with citations → taster → PDF render → store in `research_reports` + Storage.
- Chat delivery via the existing designer-chat channel; Q&A answers ground on the report text + source list.
- Tables: `research_jobs` (owner, prompt, refinements, status), `research_reports` (job_id, title, taster, pdf_path, sources jsonb, tags), `research_threads` (report_id, messages). Owner-only RLS; export endpoint zips owner's reports.

## 5 · Principles
- **Public sources only**, always credited; imagery per the rights rule — this keeps the shared-brain feed clean and the library genuinely portable.
- The designer's library is **theirs**: export is a right, not a feature flag.
- Their **requests are theirs too**: never exposed, only aggregated.
- Tasters are written like a good junior handing you their findings — plain, specific, no hype.
- Nothing auto-posts to a client; research is designer-side.

## 6 · Build order
1. `library.html` design mock (shelves, spine→card, reading view) + Research drawer on canvas/studio.
2. Taster card variant in designer chat (mock data).
3. `/api/research/request` + agent pipeline (single agent, Standard depth) + PDF renderer.
4. Q&A grounding; tags/search; export bundle.
5. Proactive suggestions (opt-in) once ≥N reports exist.
