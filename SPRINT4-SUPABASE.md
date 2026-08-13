# Sprint 4 — Multi-board, publish & client feedback: Supabase spec

Hand this to Claude Code against the `sturij-main-website` repo (or a new `sturij-boards` Vercel project). The board client (`canvas.js`) keeps localStorage as the offline cache; Supabase becomes the source of truth once connected.

## 1. Schema (SQL)

```sql
-- designers sign in (Supabase auth); clients never do — they use share tokens
create table boards (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  title text not null default 'Untitled board',
  client_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- an immutable snapshot of the board = one version; "publish" points at one of these
create table board_versions (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  ver int not null,                          -- v1, v2… (mirrors wall.ver semantics)
  items jsonb not null,                      -- the whole items[] array, verbatim
  view jsonb,                                -- {x,y,z} restore point
  created_at timestamptz default now(),
  unique (board_id, ver)
);

alter table boards add column published_version uuid references board_versions(id);
alter table boards add column share_token text unique;   -- random 24-char; null = not shared

-- client feedback: post-its on the PUBLISHED version only
create table board_notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  version_id uuid not null references board_versions(id) on delete cascade,
  x float not null, y float not null,        -- board coords
  author text not null default 'client',     -- 'client' | 'designer'
  body text not null default '',
  reply text,                                 -- designer's response (null = unanswered)
  replied_at timestamptz,
  created_at timestamptz default now()
);

-- material sign-off
create table approvals (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  swatch_key text not null,                  -- name + (hex|src) — same de-dupe key the client uses
  swatch jsonb not null,                     -- {name, hex?, src?}
  approved_by text not null default 'designer',  -- 'designer' | 'client'
  created_at timestamptz default now(),
  unique (board_id, swatch_key)
);
```

## 2. RLS

- `boards`, `board_versions`, `board_notes`, `approvals`: owner (`auth.uid() = owner` via join) has full CRUD.
- Anonymous client access ONLY through edge functions that validate `share_token` — no direct anon table policies. (Simplest safe model; avoids leaking drafts.)

## 3. Edge functions (Deno)

| Function | Auth | Does |
|---|---|---|
| `board-save` | owner | upsert boards row + insert new board_versions from `{title, items, view}`; returns ver |
| `board-publish` | owner | set `published_version`; mint `share_token` if null; returns share URL |
| `board-shared` | token | returns `{title, items, view, notes}` of the PUBLISHED version only |
| `note-add` | token | client adds a post-it (rate-limit by IP; cap 50/board) |
| `note-reply` | owner | sets reply + replied_at → note colour flips client-side |
| `notes-ready` | owner | when every note has a reply: email the client "Your designer has responded" (Resend; client email captured on first note) |
| `approve` | owner or token | upsert/remove an approvals row (client approvals flagged `approved_by:'client'`) |

## 4. Client wiring (canvas.js)

- **Designer mode** (default): `Save` = POST board-save (debounced, replaces qsave's remote half); `Publish` button = board-publish → shows the share URL. Board library = list of `boards` for the signed-in owner, rendered as dock-style chips on a start screen.
- **Client mode** (`?share=TOKEN` in URL): read-only render of the published version — no ctx bar, no drag except **adding post-its** (`note-add`). Client post-its render yellow; answered ones flip to the sage green (`#4A5D4E` tint) with the designer's reply beneath.
- **Approved tick**: approvals sync through `approve`; the approved doc (already built) reads the merged set.
- Versioning stays exactly as the board does it today: duplicate wall = wall v+1; each `board-save` = board version+1. Publishing pins one.

## 5. Env

```
SUPABASE_URL, SUPABASE_ANON_KEY (client)
SUPABASE_SERVICE_ROLE (functions only)
RESEND_API_KEY, NOTIFY_FROM=studio@sturij.com
```

## 6. Acceptance

1. Designer saves board → v1; edits → v2; publishes v1 — the share link shows v1 even while v2 changes.
2. Client opens share link, drops 3 post-its; designer replies to all; "notes-ready" emails the client; client sees green answered notes.
3. Client ticks a swatch approved → appears in the designer's approved doc with `approved_by: client`.
4. localStorage-only mode still works fully offline (no Supabase env = current behaviour).
