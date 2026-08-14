# Sturij — Presentation builder & customer review round-trip
## Build spec for Claude Code

Two features, both prototyped in the design project (`canvas.js`, `review.html`). This spec turns them into real product. Stack assumptions: Vercel (Next.js or plain API routes), Supabase (Postgres + Realtime + Storage + Auth), Anthropic API server-side. British English throughout the UI. No emoji.

---

## Feature A — Presentation builder

### What it does (as prototyped)
1. Designer clicks **Present** on the canvas.
2. Each wall renders to an image (every page of a multi-page wall = its own slide; a board with no walls becomes one slide).
3. The wall names + material names go to Claude, which returns JSON: `{title, intro, captions:{wallName: caption}, close}`.
4. A branded deck opens: cover (title + intro + date), one slide per wall (caption + image, gold-bordered), a materials schedule grid (deduped swatches), closing line. Print-to-PDF button.

### Productionise
- **Route** `POST /api/present/narrative`
  - In: `{schemeId, walls:[{name}], materials:[string]}`
  - Server calls Anthropic `messages` (model claude-sonnet, max_tokens 800) with the prompt below; validates the JSON against the schema; retries once on parse failure; returns it.
  - Never call Anthropic from the browser; key lives in Vercel env.
- **Persistence**: store each generated deck in `presentations` table (below) with the composed HTML and the narrative JSON so it can be re-opened/re-sent without re-rendering.
- **Sharing**: `GET /p/:presentationId` — public, tokenised URL (unguessable id), read-only deck page. Optional `?pdf=1` uses headless print (or keep client print button).

### Narrative prompt (verbatim, server-side)
```
You are writing a short interior-scheme presentation for a Sturij client.
British English, warm but plain, no emoji, no hyperbole.
Walls in the scheme: {{wallNames}}.
Materials: {{materialNames}}.
Reply with ONLY valid JSON:
{"title":"...","intro":"2 sentences","captions":{{{"WallName":"1-2 sentences"}}},"close":"1 sentence"}
```

### Table
```sql
create table presentations (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid references schemes(id),
  designer_id uuid references auth.users(id),
  narrative jsonb not null,
  html text not null,
  created_at timestamptz default now()
);
```

---

## Feature B — Customer review round-trip

### What it does (as prototyped)
1. Designer selects a wall → **Publish**. The wall + its members render to one image; its swatches become a materials list. One live publication per wall (republish replaces it; unresolved notes carry over).
2. Customer page shows only published versions: image, version badge, materials grid.
3. Customer clicks the image → drops a **post-it note** (yellow). Can delete their own unanswered notes.
4. Designer sees notes, types a reply on each → note turns **green** and shows the reply.
5. Designer clicks **All responses ready** → customer is notified; customer page shows a gold banner.
6. Customer ticks a material → **approved**; approval flows back to the designer's board (swatch gets the approved mark, joins the approved doc).

### Productionise

#### Tables
```sql
create table publications (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references schemes(id),
  wall_id text not null,            -- canvas item id
  name text not null,
  version int not null default 1,
  image_path text not null,         -- Supabase Storage: publications/{id}.jpg
  status text not null default 'published',  -- published | responded
  published_at timestamptz default now(),
  unique (scheme_id, wall_id)       -- one live publication per wall
);

create table review_notes (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references publications(id) on delete cascade,
  author text not null check (author in ('customer','designer')),
  x real not null, y real not null, -- 0..1 fractions of the image
  text text not null,
  reply text,                       -- designer response; non-null = green
  created_at timestamptz default now(),
  replied_at timestamptz
);

create table publication_materials (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references publications(id) on delete cascade,
  item_id text not null,            -- canvas swatch id, for board sync-back
  name text not null,
  hex text, image_path text,
  approved boolean not null default false,
  approved_at timestamptz
);
```

#### RLS
- Customer role: `select` on publications/notes/materials for their scheme; `insert` notes with `author='customer'`; `update` only `approved` on materials; `delete` own notes where `reply is null`.
- Designer role: full access on their schemes; `update reply` on notes; `update status` on publications.

#### Routes
- `POST /api/review/publish` — in: `{schemeId, wallId, name, version, imageBase64, materials:[{itemId,name,hex,imageBase64?}]}`. Uploads image(s) to Storage, upserts publication (carrying over notes with `reply is null` from the previous version), returns publication.
- `POST /api/review/respond-done` — sets `status='responded'`, fires notification.
- Notes/approvals write direct via Supabase client + RLS; both pages subscribe via **Realtime** on the three tables (replaces the prototype's `storage` event).

#### Notifications
- On `respond-done`: email (Resend) + push to customer: "Your designer has responded to your notes on {name}."
- On customer approval / new note: in-app badge for designer; daily digest email optional.

#### Board sync-back
- Designer canvas subscribes to `publication_materials` changes; on `approved=true`, set `approved=true` on the matching canvas item (`item_id`), add to approved doc. (Prototype does this via the `storage` event listener in `canvas.js` — same logic, new transport.)

---

## Claude Code prompts

Run these in order, in the repo with Supabase + Vercel already wired.

**Prompt 1 — schema & policies**
> Create a Supabase migration adding the tables `presentations`, `publications`, `review_notes`, `publication_materials` exactly as specified in PRESENT-REVIEW-SPEC.md (this file), including the unique constraint, checks, and the RLS policies described. Customers and designers are distinguished by a `role` claim on the JWT and membership in `scheme_members(scheme_id, user_id, role)` — create that table too if it doesn't exist. Write policies, don't disable RLS.

**Prompt 2 — publish route**
> Implement `POST /api/review/publish` per PRESENT-REVIEW-SPEC.md: auth as designer, validate scheme membership, upload the base64 images to the `publications` storage bucket (create if missing, public read), upsert on (scheme_id, wall_id) carrying over unreplied notes from the replaced publication, insert materials rows. Return the full publication with notes and materials. Add zod validation and a 4MB image cap.

**Prompt 3 — narrative route**
> Implement `POST /api/present/narrative` per PRESENT-REVIEW-SPEC.md using the Anthropic SDK server-side with the verbatim prompt in the spec. Parse and schema-validate the JSON response (zod), retry once on failure, return 502 with a clear error after that. Store nothing here. Rate-limit 10/min per designer.

**Prompt 4 — customer review page**
> Build the customer review page from the prototype `review.html` in the design project: same layout, classes and interaction (post-it drop on image click, delete own unanswered note, approval ticks, responded banner), but backed by Supabase Realtime instead of localStorage, customer-role auth, and optimistic updates. Keep the visual style byte-for-byte: paper #F7F4EE, ink #1D1D1D, gold #D4A01B, Cormorant Garamond headings, IBM Plex Mono body, yellow #F7E9A8 notes turning green #CFE3D4 when replied.

**Prompt 5 — designer responses + notify**
> Add the designer role view to the review page (reply textareas on notes, "All responses ready — notify customer" bar) and implement `POST /api/review/respond-done` with a Resend email notification. Then add the canvas sync-back: subscribe to publication_materials and mark matching board items approved, per the spec.

**Prompt 6 — presentation persistence + share link**
> Add the `presentations` table flow: after the designer generates a deck, POST it to `/api/present/save` (html + narrative), and serve it read-only at `/p/[id]` with no auth (unguessable uuid), including the print button. List past presentations for a scheme in the designer UI.

---

## Prototype file map (for porting)
- `canvas.js` — `deckNarrative()`, `openDeck()` (deck HTML/styles), `publishWall()`, `pubLoad/pubSave`, storage-event sync-back
- `review.html` — the entire customer/designer review page (self-contained)
- `chat-core.js` / `CHAT-SPEC.md` — chat backend spec (separate sprint, same conventions)
