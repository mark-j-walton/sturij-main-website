-- sturij.com content slots on the sturij-web project (bcpmgpktmuaicjessseg).
-- The public site's image and copy slots: append-only versions, an admin allowlist at the login class, an
-- audit row per save written by the database, a public bucket for the images. The asset library's first
-- real table (page-platform S1); every save a `publish content` act (governed-actions A2 — `login` class
-- now, `signed` when device registration lands). Nothing here is edited in place: a new version is a new
-- row, the current one is the highest version, history is retrievable by construction.
-- Applied by the session's brief (claude-code-session-2026-09-10-public-site) — the bucket and the tables
-- are the only change to sturij-web the brief licenses.

create extension if not exists pgcrypto;

-- who may edit: a login's email on this list. Mark's two auth users are the seed; a data edit adds or removes.
create table if not exists public.site_admin (
  email text primary key,
  note text,
  added_at timestamptz not null default now()
);
comment on table public.site_admin is 'sturij.com admin allowlist (the login class). A row = an auth user who may replace images and edit copy on the public site. Data edit with a line; no UI writes it.';

create table if not exists public.site_content_slots (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null check (slot_id ~ '^[a-z0-9.-]{2,80}$'),
  version integer not null default 0,
  text text not null check (length(text) between 1 and 4000),
  edited_by uuid not null default auth.uid(),
  edited_by_email text not null default coalesce(auth.jwt() ->> 'email', ''),
  at timestamptz not null default now(),
  unique (slot_id, version)
);
comment on table public.site_content_slots is 'sturij.com copy slots, append-only: a save is a new version; the page reads the highest version per slot; the seed lives in the repository.';

create table if not exists public.site_image_slots (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null check (slot_id ~ '^[a-z0-9.-]{2,80}$'),
  version integer not null default 0,
  asset_path text not null check (asset_path ~ '^slots/[a-z0-9.-]+/[A-Za-z0-9._-]+$'),
  width integer not null check (width between 800 and 12000),
  height integer not null check (height between 400 and 12000),
  bytes integer not null check (bytes between 1 and 819200),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  alt text,
  uploaded_by uuid not null default auth.uid(),
  uploaded_by_email text not null default coalesce(auth.jwt() ->> 'email', ''),
  at timestamptz not null default now(),
  unique (slot_id, version)
);
comment on table public.site_image_slots is 'sturij.com image slots, append-only: slot id, the object path in the site-images bucket, its dimensions and bytes, who and when; the highest version per slot is what visitors see.';

create table if not exists public.site_slot_audit (
  id bigserial primary key,
  act text not null default 'publish content',
  class text not null default 'login',
  credential text not null default 'session',
  table_name text not null,
  row_id uuid not null,
  slot_id text not null,
  version integer not null,
  actor uuid,
  actor_email text,
  checksum text not null,
  at timestamptz not null default now()
);
comment on table public.site_slot_audit is 'One row per save on the public site slots, written by trigger: the act (publish content), its class (login until device registration), the credential (session), the actor, the slot, the version and the sha256 of what was published.';

-- versions are assigned by the database: the next integer per slot, never by the client.
create or replace function public.site_slot_next_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  execute format('select coalesce(max(version), 0) + 1 from %I where slot_id = $1', tg_table_name) into new.version using new.slot_id;
  return new;
end $$;

drop trigger if exists site_content_slots_version on public.site_content_slots;
create trigger site_content_slots_version before insert on public.site_content_slots for each row execute function public.site_slot_next_version();
drop trigger if exists site_image_slots_version on public.site_image_slots;
create trigger site_image_slots_version before insert on public.site_image_slots for each row execute function public.site_slot_next_version();

-- the audit row, written by the database on every save (the client cannot skip it or forge it).
create or replace function public.site_slot_audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare payload text;
begin
  if tg_table_name = 'site_content_slots' then payload := new.text; else payload := new.asset_path || ':' || new.bytes::text; end if;
  insert into public.site_slot_audit (table_name, row_id, slot_id, version, actor, actor_email, checksum)
  values (tg_table_name, new.id, new.slot_id, new.version, auth.uid(), auth.jwt() ->> 'email', encode(digest(payload, 'sha256'), 'hex'));
  return new;
end $$;

drop trigger if exists site_content_slots_audit on public.site_content_slots;
create trigger site_content_slots_audit after insert on public.site_content_slots for each row execute function public.site_slot_audit_row();
drop trigger if exists site_image_slots_audit on public.site_image_slots;
create trigger site_image_slots_audit after insert on public.site_image_slots for each row execute function public.site_slot_audit_row();

-- the current version per slot — what the page reads (security_invoker so the tables' read policy applies).
create or replace view public.site_content_slots_current with (security_invoker = true) as
  select distinct on (slot_id) slot_id, version, text, edited_by_email, at from public.site_content_slots order by slot_id, version desc;
create or replace view public.site_image_slots_current with (security_invoker = true) as
  select distinct on (slot_id) slot_id, version, asset_path, width, height, bytes, mime, alt, uploaded_by_email, at from public.site_image_slots order by slot_id, version desc;

-- the admin test, reusable by policies: the session's email is on the list.
create or replace function public.site_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.site_admin where email = auth.jwt() ->> 'email');
$$;

alter table public.site_admin enable row level security;
alter table public.site_content_slots enable row level security;
alter table public.site_image_slots enable row level security;
alter table public.site_slot_audit enable row level security;

-- a person sees their own admin row (the page asks "am I an admin?"); nobody writes the list through the API.
drop policy if exists site_admin_self on public.site_admin;
create policy site_admin_self on public.site_admin for select to authenticated using (email = auth.jwt() ->> 'email');

-- slots: public content, readable by anyone; a new version by an admin only; no update, no delete — ever.
drop policy if exists site_content_read on public.site_content_slots;
create policy site_content_read on public.site_content_slots for select to anon, authenticated using (true);
drop policy if exists site_content_write on public.site_content_slots;
create policy site_content_write on public.site_content_slots for insert to authenticated with check (public.site_is_admin() and edited_by = auth.uid());
drop policy if exists site_image_read on public.site_image_slots;
create policy site_image_read on public.site_image_slots for select to anon, authenticated using (true);
drop policy if exists site_image_write on public.site_image_slots;
create policy site_image_write on public.site_image_slots for insert to authenticated with check (public.site_is_admin() and uploaded_by = auth.uid());

-- the audit is readable by admins; written by the triggers only.
drop policy if exists site_audit_read on public.site_slot_audit;
create policy site_audit_read on public.site_slot_audit for select to authenticated using (public.site_is_admin());

grant select on public.site_content_slots, public.site_image_slots, public.site_content_slots_current, public.site_image_slots_current to anon, authenticated;
grant insert on public.site_content_slots, public.site_image_slots to authenticated;
grant select on public.site_admin, public.site_slot_audit to authenticated;

-- the bucket: public read (the page serves renditions from it), admin insert, no overwrite, no delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 819200, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "site-images public read" on storage.objects;
create policy "site-images public read" on storage.objects for select to anon, authenticated using (bucket_id = 'site-images');
drop policy if exists "site-images admin insert" on storage.objects;
create policy "site-images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'site-images' and public.site_is_admin() and name ~ '^slots/[a-z0-9.-]+/[A-Za-z0-9._-]+$');

-- the seed: Mark's two auth users on the project (read masked 10 Sep 2026 — an 11-char gmail local part and a 4-char sturij.com local part).
insert into public.site_admin (email, note) values
  ('mark.walton@gmail.com', 'Mark Walton — owner; the auth user on this project'),
  ('mark@sturij.com', 'Mark Walton — owner; the sturij.com alias, an auth user on this project')
on conflict (email) do nothing;
