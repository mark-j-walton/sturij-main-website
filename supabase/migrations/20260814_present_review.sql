-- Present & review delta — runs ON TOP of the Sprint 4 boards schema (already applied).
-- Adds: presentations (saved decks) + boards.responded_at (review round-trip status).
-- Storage: the publish route creates a public 'publications' bucket for wall renders.

alter table public.boards add column if not exists responded_at timestamptz;

create table public.presentations (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  owner      uuid not null references auth.users(id),
  narrative  jsonb not null,
  html       text not null,
  created_at timestamptz default now()
);
create index presentations_board_idx on public.presentations (board_id);

alter table public.presentations enable row level security;
create policy presentations_owner_all on public.presentations
  for all to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

comment on table public.presentations is
  'Saved scheme decks. Owner-only RLS; public read-only sharing exclusively via /p/:id (service role, unguessable uuid).';
