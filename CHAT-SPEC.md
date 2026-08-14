# Sturij Chat — Supabase + Vercel spec (AI-build ready)

Front-end (`chat.html`, `customer.html`, canvas drawer) is live in prototype mode: it talks to the endpoints below when `window.STURIJ_CHAT_API` is set, otherwise falls back to localStorage + window.claude.complete so the whole flow is testable today.

## Supabase schema

```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users not null,      -- designer
  kind text check (kind in ('agent','claude','customer')) not null,
  mode text,                                       -- help|project|feature|research|image (agent only)
  project_id uuid references projects,             -- attach to customer project
  customer_id uuid,                                -- customer chats
  title text, status text default 'open',          -- open|ended
  summary jsonb,                                   -- {text, actions:[{label,done}]}
  created_at timestamptz default now(), ended_at timestamptz
);
create table chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid references chat_sessions on delete cascade,
  role text check (role in ('designer','customer','assistant','system')) not null,
  body text, attachments jsonb,                    -- [{name,url,type,size}]
  voice bool default false,
  created_at timestamptz default now()
);
create table designer_status (
  owner uuid primary key references auth.users,
  status text default 'Available', custom text, updated_at timestamptz default now()
);
-- RLS: owner full access; customer_id may select/insert on their own customer sessions only.
```

Storage bucket `chat-uploads/` (customer photo/file uploads → also mirrored into the project library table).

## Vercel API routes (sturij project)

- `POST /api/chat/complete` — {sessionId, mode, messages[], boardContext?} → proxies Anthropic. `mode=research` sets the web-search tool on; `mode=image` forwards to the existing `/api/render` contract.
- `POST /api/chat/summarise` — {sessionId} → runs on customer chat end: summary + action list, writes `chat_sessions.summary`, fires notification.
- `POST /api/chat/feature-pdf` — {sessionId} → renders the feature-request thread to the branded PDF (same look as trade pack), emails to hello@sturij.com, returns the PDF url.
- `POST /api/chat/voice` — multipart audio → Whisper transcription (upgrade path; browser SpeechRecognition is the prototype).
- `POST /api/brain/archive` — {sessionId} → pushes the transcript into marks-brain (collection: "Designer Chats"), called on session end/every 20 messages.

## Front-end contract

`window.STURIJ_CHAT_API = 'https://sturij.vercel.app/api'` switches every fetch from the local fallback to the real routes. Auth header: Supabase JWT. All prototype data lives under localStorage keys `sj-chat-*` and migrates by POSTing each stored session to `/api/chat/import` (optional route).
