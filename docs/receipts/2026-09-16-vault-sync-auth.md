# Receipts — the vault sync, the auth allowlist, the admin loop · 16 September 2026

Session `session_01PiE4zwdPfckYcHkUsipGM1` · Claude Code, model **claude-opus-5** (configured and last served, read from the session, not from memory) · branch `claude/sturij-vault-sync-auth-rd4jsl` off `main` @ `f863224` (the #44 merge).

**Nothing synced. No vault read. No allowlist changed. No sign-in.** One file changed in this repository (`.env.example`, a comment) and this receipt. Names only below; no value of any secret was read, printed or typed.

MERGED ≠ DEPLOYED ≠ EXERCISED. Every line says which.

## The short of it

The brief has five steps. **Step 1 is done.** **Steps 2, 3 and 5 are stopped at the same wall: this machine has no vault credential of any kind**, and the vault is the only route to the sync. **Step 4 is delivered as the exact list for Mark's console**, which is the brief's own first option — the management API needs a token that lives in the vault, so the same wall applies to making the change from here.

Two findings change what the remaining acts actually are, and both are readings, not opinions:

1. **The site has no Vercel sync to repoint.** The brief says "the site's Vercel sync sources `dev` today: point it at prod". There is no such sync. The act is a **create**, not a repoint — and the tool cannot create it yet (§3).
2. **`NOTIFY_TO` does not belong on this project.** It is read by sturij-web's `enquiry` function, so its store is that project's Supabase function secrets (§1).

---

## 1 · The four names, read from the two sources

Read from `docs/receipts/2026-09-13-take-to-live.md` ("Stopped — the admin loop") and from this repository's `.env.example`. The two agree.

| Name | Visibility | What reads it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **public** — inlined into the browser bundle at build | `lib/slots.ts` `supabasePublicConfig()`; `lib/supabase/browser.ts` `CONFIGURED` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **public** — inlined into the browser bundle at build | as above |
| `GEMINI_API_KEY` | **server only** | `/api/render` |
| `GEMINI_IMAGE_MODEL` | **server only** (not a secret; a model id) | `/api/render` |

Cross-checked by running the estate's own cross-store reader against this repository — `node tools/secret-inventory.mjs` from marks-brain: **7 names, 0 collisions, 0 near-collisions**. It reads names and never a value.

### `NOTIFY_TO` — not among them, and not this project's

The brief asks to confirm `NOTIFY_TO` is among the four "or add it". It is not among them, and **adding it to this project would put the name in the wrong store.** The reading:

- It appears nowhere in this repository — not in `.env.example`, not in the take-to-live receipt's four, and not in any `process.env` read (the inventory above found 7 names; `NOTIFY_TO` is not one).
- It **is** read by sturij-web's `enquiry` edge function: `notify.ts`, sturij **#60**, "`NOTIFY_TO` falling back to `NOTIFY_FROM`" (marks-brain `docs/sessions/2026-09-08-commit-and-hold.md`). The site posts to `ENQUIRY_FUNCTION_URL`; the **function** sends the notification. That path is live — the 13 Sep probe recorded `notified_at` and Resend id `c7919e61-…` on row `262e35a6-…`.
- Mark's value stands as his decision (`contact@sturij.com`), and matches the surface document: "the team is notified at contact@sturij.com" (`governance/surfaces/sturij-website.md` §SO5). **No value was typed anywhere by this session.**

The estate's own note — "the vault sync of the four names and `NOTIFY_TO` to the site's project" (the operator's card §6; `governance/state/runway.md`) — is imprecise on the destination. `NOTIFY_TO` needs a **Supabase** destination on sturij-web's function secrets, which is a different sync from the site's Vercel one. That is a second sync, not a fifth name on the first.

**Changed in this repository:** `.env.example` gains a comment recording exactly this, so the next reader does not add the name to the wrong store. No name was added to the file.

**Whether `NOTIFY_TO` is set on sturij-web today is unread** — reading a function's secret names needs the management API, and the token for it is in the vault.

## 2 · The vault — STOPPED, and not at the step the brief expected

The brief says: list which of the four are present by name; any missing → STOP and report the names. **The listing could not be made at all.** This is a harder stop than "a name is missing", so it is reported as its own finding rather than dressed as a partial answer.

What was checked on this machine, each a reading:

| Route | Result |
|---|---|
| `infisical` on `PATH` | absent |
| the winget shim `vault-names.sh` falls back to | absent (this is Linux) |
| `~/.infisical`, `~/.config/infisical` (a CLI login) | neither exists |
| `INFISICAL_*` in the environment (a machine identity) | none — no `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET` or `INFISICAL_PROJECT_SLUG` |
| a Supabase or Vercel management token in the environment | none |

`tools/vault-names.sh` and `tools/vault-syncs.mjs` both obtain their token from `infisical user get token`, i.e. **a CLI logged in as Mark**. `vault-syncs.mjs` refuses without one by design: `REFUSED: no Infisical login on this machine`. The one machine identity the estate does hold is in the marks-brain **repository** store and reads exactly one name from `/MARKS_BRAIN` — not reachable from here, and scoped to the wrong folder besides.

**Which folder is "the site's project folder" is also unsettled in the record.** The 8 Sep vault migration lists `/STURIJ` (11 names) *and* `/STURIJ_NEW_WEBSITE` (2 names). `/STURIJ` maps to the **sturij** Vercel project (sturij-web), not to sturij-main-website — `tools/presync-check.mjs` carries that mapping as data. `/STURIJ_NEW_WEBSITE` is the likelier home for the site and has only one mention in the whole record. **Mark settles this before anything is created**; guessing it is how a folder reaches the wrong destination.

## 3 · The sync — the premise does not hold; the act is a create, and the tool cannot do it yet

**There is no Vercel sync for `sturij-main-website`.** Three independent readings agree:

| Reading | What it says |
|---|---|
| The operator's card v0.2, written **today** against the live vault (`--list`, "the reading to trust") | **six** Vercel syncs: `marks-brain-production`, `marks-brain-preview`, `sturij-chat-production`, `sturij-chat-preview`, `sturij-production`, `sturij-preview`. All six source env **`dev`**. **None is the site's.** |
| The take-to-live receipt, 13 Sep | `vercel env ls production` on this project: `MOTION_PLUS_API` and nothing else |
| A live probe of production, this session | `https://studio.sturij.com/` → **200**, and the page carries `data-content-source="seed"` |

That last one is the read-back the brief asks for, arrived at by effect rather than by name. `lib/slots.ts` returns `source: 'seed'` **only** when `supabasePublicConfig()` is null, i.e. when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is absent from the build. The production deployment is `dpl_9qTPZfyxTL9d2JFScTZwzcNDynwJ` (READY, target production, from `f863224`). **The names have not arrived.** So "the site's Vercel sync sources dev today" describes a sync that does not exist; the brief's "point it at prod" has no object.

**Reading the Vercel project's production variable *names* directly was not possible either**: the Vercel MCP server in this session exposes no environment-variable tool (checked), there is no `vercel` CLI and no Vercel token. The three readings above are what stands in its place, and they agree.

### What a create needs before it can be run

`tools/vault-syncs.mjs` knows exactly two syncs — `supabase` and `github`. There is **no `vercel` entry in `SYNCS`**, so the tool would answer `REFUSED: no sync named 'vercel'`. It "never adopts", by design, so it also cannot be pointed at a hand-made sync. Three things are owed, none of them this repository's:

1. **A `vercel` entry in `SYNCS`** (marks-brain `tools/vault-syncs.mjs`), carrying: `destination: 'vercel'`, `connectionApp: 'vercel'`, a name, `env: 'prod'` (the brief's ask — note every existing sync sources `dev`, so this would be the first prod-sourced Vercel sync and the divergence should be deliberate), the site's source `path` (settled per §2), and `destinationConfig` naming the site's project in **project** scope — `prj_O82gEMdE8RHY5qwfMVwXQiUVDEmF` on team `team_d9ep3PCo6H7aRps5fFTqbem9`. Team scope must not be used: on 8 Sep two team-scope syncs collided by name and the marks-brain sync replaced sturij's three Supabase entries.
2. **A mapping row in `tools/presync-check.mjs`** — `MAPPING` has `/STURIJ`, `/MARKS_BRAIN` and `/STURIJ_CHAT` only. Whatever folder §2 settles on, `presync-check` FAILs on it today ("no project mapping"), and Mark's rule is that the check runs before every sync.
3. **An Infisical login** on the machine that runs it.

On `MOTION_PLUS_API`: `SYNC_OPTIONS.disableSecretDeletion` is fixed `true` and the tool asserts it before every create — there is no flag to turn it off. A project-scope sync created by this tool therefore cannot remove a Vercel-only name. That is the guarantee the brief asks for, held as a setting rather than a promise. **Unverified by run**, because nothing ran.

The three acts stay separate when the time comes: `--dry-run` (GET only) → create (auto-sync **off**) → `--run` (one run, watched) → read the destination's names → `--enable`.

## 4 · The auth redirect allowlist — the exact list for the console

sturij-web, project `bcpmgpktmuaicjessseg` → **Authentication → URL Configuration**.

The management API route was not taken: this session holds no Supabase management token (the vault holds it, §2), and the Supabase MCP server here exposes no auth-configuration tool — only project, database, advisor and docs tools (checked). So this is the list, for Mark to paste.

**Site URL**

```
https://sturij.com
```

*Timing, Mark's call:* the apex has no working TLS until the cutover (take-to-live §cutover: `sturij.com` A records still point at Google; https fails). Site URL is only the fallback for a sign-in that names no redirect, and this site always names one (below) — so `https://sturij.com` is safe to set now and correct from the cutover onward. If you would rather it work as a fallback today, use `https://studio.sturij.com` and change it at cutover act 5.

**Redirect URLs** — four entries:

```
https://sturij.com/**
https://studio.sturij.com/**
https://sturij-main-website.vercel.app/**
https://sturij-main-website-*-sturij-team-2026.vercel.app/**
```

Why each, so none is cargo:

| Entry | What it covers |
|---|---|
| `https://sturij.com/**` | the live domain after the cutover |
| `https://studio.sturij.com/**` | the domain this project serves **today** — without this, the first sign-in cannot happen before the cutover |
| `https://sturij-main-website.vercel.app/**` | the production alias (the brief's three do not include it; it is the address that answers if the custom domain is ever bypassed) |
| `https://sturij-main-website-*-sturij-team-2026.vercel.app/**` | **the preview pattern** — one `*` covers both shapes Vercel produces on this project: deployment URLs (`…-imblqcfc3-…`, `…-oquhzemwd-…`) and branch aliases (`…-git-claude-blog-sec-9dc5e7-…`), read from the project's last 20 deployments this session |

What the site actually asks for: `AdminControl.tsx` calls `signInWithOtp` with ``emailRedirectTo: `${location.origin}/#admin` ``. The origin is whichever of the four above served the page; the `#admin` fragment never reaches the server, so a `/**` pattern on each origin is what the allowlist needs. `shouldCreateUser: false` — the email must already be a user, and `public.site_admin` holds **2 rows** (the login class).

**Note on previews:** preview deployments on this project sit behind Vercel Authentication (the team's setting), so a preview sign-in needs Mark signed in to Vercel as well. That is Vercel's gate, not Supabase's, and the allowlist entry is still required.

## 5 · The admin loop — STOPPED, as steps 2–4 leave it

No sign-in, no copy edit, no row, no audit line. The loop needs the two public names on the deployment (§3: absent) and the allowlist (§4: Mark's console).

**What was proved instead — the database half is ready**, so when the names and the allowlist arrive there is nothing else in the way. Read from sturij-web this session:

| Object | State |
|---|---|
| `public.site_admin` | 2 rows — the login class is populated |
| `public.site_content_slots` | 0 rows (append-only; the page reads the highest version per slot, else the repository seed) |
| `public.site_image_slots` | 0 rows |
| `public.site_slot_audit` | 0 rows |
| trigger `site_content_slots_audit` → `site_slot_audit_row()` | present, **enabled** (`tgenabled = 'O'`) |
| trigger `site_content_slots_version` → `site_slot_next_version()` | present, enabled |
| trigger `site_image_slots_audit` → `site_slot_audit_row()` | present, enabled |
| trigger `site_image_slots_version` → `site_slot_next_version()` | present, enabled |

So the audit line the brief wants recorded is written by trigger and cannot be forgotten by the writing path. The 0 rows on `site_slot_audit` are the honest "not yet exercised" reading.

## Found, not changed

- **`RENDER_ALLOWED_ORIGINS`** is read by this repository's `app/` code (secret-inventory: store Vercel, 1 ref) but is **not** named in `.env.example`, while `RENDER_LIMIT_PER_VISITOR_HOUR` and `RENDER_LIMIT_PER_DAY` are. The 8 Sep record notes sturij-main-website held a link to a team-level `RENDER_ALLOWED_ORIGINS` "but does not read it" — it does now. Left alone: it is outside this brief, and it belongs in the same conversation as which folder the site syncs from.

## Corrected, this run

- **The brief's step 3 premise.** "The site's Vercel sync sources `dev` today" — the site has no Vercel sync. The six that exist belong to marks-brain, sturij-chat and sturij (sturij-web). The act is a create, and the tool has no `vercel` entry to create it with.
- **The brief's step 1 premise, and the estate's own note.** `NOTIFY_TO` is not one of the site's names and should not be synced to the site's Vercel project; it is sturij-web's `enquiry` function's, so its destination is that project's function secrets.
- **The step 3 read-back method.** "Read back the Vercel project's production variable names" was not available by name from this session (no env tool, no CLI, no token). Read by effect instead — `data-content-source="seed"` on live production proves the two public names are absent from the build. Recorded as what it is, not as a name listing.

## Still owed

**Mark** — in this order, because each unblocks the next:

1. **Which vault folder is the site's** — `/STURIJ_NEW_WEBSITE` or `/STURIJ` (§2). Nothing can be created until this is a fact rather than an inference.
2. **The names in that folder, env prod** — `bash tools/vault-names.sh prod <folder>` from a logged-in checkout (values stripped inside the script). The four of §1 either are there or are not; if any is missing, that is where the STOP the brief describes actually lands.
3. **The `vercel` entry in `tools/vault-syncs.mjs` and the `MAPPING` row in `tools/presync-check.mjs`** (§3) — both in marks-brain, neither written by this session: this session's designated branch is on sturij-main-website, and a second writer in marks-brain breaks the one-writer rule.
4. **Then the sync**, three acts, watched: `--dry-run` → create → `--run` → read the destination's names → `--enable`.
5. **The allowlist** — §4, four redirect entries and the Site URL, at the sturij-web console.
6. **`NOTIFY_TO` on sturij-web's function secrets** — its own sync to a Supabase destination, or the act that sets it; `contact@sturij.com` is Mark's decision and is not written here.
7. **Then the admin loop**: sign in at `https://studio.sturij.com/#admin`, one copy edit, read it back through the page (`data-content-source` turns `seed+db`), and the `site_content_slots` row with its `site_slot_audit` line — the database half is already proved ready (§5).

**Unchanged and untouched by this session:** the vault, every Vercel environment, sturij-web's auth configuration, `MOTION_PLUS_API`, and every secret value in the estate.

---

## Addendum — 16 September 2026, 16:08 Z · the gate opened

Same session, same model (claude-opus-5). **The two public names have arrived on production.** The readings above were true when taken at 12:54 Z; this supersedes §3's "the names have not arrived" and nothing else.

| Reading | Then (12:54 Z) | Now (16:08 Z) |
|---|---|---|
| `https://studio.sturij.com/` | 200, `data-content-source="seed"` | 200, **`data-content-source="seed+db"`** |
| `https://sturij.com/` | TLS fails (apex still Google) | TLS fails — **the cutover has not happened**, as expected |

**What `seed+db` proves, exactly.** `lib/slots.ts` sets `source = 'seed+db'` only after `supabasePublicConfig()` returns non-null **and** at least one of the two `_current` views answers. So both public names are in the build **and** the publishable key authenticates against sturij-web **and** RLS lets the anonymous reader through. That is the site-to-database read path proved live for the first time. It does **not** prove a copy edit: an empty result counts, and the slot tables are empty (below).

**What carried them.** Two production redeploys of the **same commit** `f863224`, `action: redeploy`, no new code:

| Deployment | Created | |
|---|---|---|
| `dpl_2Nr9JDhzx9m9qDBrH7Uog7DdKfut` | ~14:52 Z | redeploy of `dpl_9qTPZfyxTL9d2JFScTZwzcNDynwJ` |
| `dpl_LnUehuEMTB9ZEBRGApp7Hiec9Gox` | ~14:59 Z | redeploy of the above — **current production** |

A redeploy of an unchanged commit is the signature of names added to the Vercel environment and then baked in by a rebuild. It confirms the ordering §3 warned about: the sync landing is not enough on its own, because `NEXT_PUBLIC_*` are fixed at build.

**Still unread from here:** whether `GEMINI_API_KEY` and `GEMINI_IMAGE_MODEL` also arrived, and whether `MOTION_PLUS_API` survived. There is no environment-variable tool, CLI or token in this session, and `/api/render` is POST-only with no preflight — probing it would spend the key, so it was not probed. `disableSecretDeletion: true` is the guarantee for `MOTION_PLUS_API`; it remains unverified by run.

**The admin loop — still not run.** Read on sturij-web at 16:08 Z:

| Table | Rows |
|---|---|
| `public.site_content_slots` | **0** |
| `public.site_slot_audit` | **0** |
| `public.site_image_slots` | 0 |

So the gate is open and the loop's remaining acts are Mark's: the redirect allowlist (§4), then sign-in at `https://studio.sturij.com/#admin` and one copy edit. The timestamp column on all three tables is `at`, not `created_at` — noted so the next reader does not lose a query to it.

**The write path, proved sound this session** (read from sturij-web, not assumed):

- `site_content_slots_current` and `site_image_slots_current` are views with `security_invoker=true`, so the base tables' RLS governs the anonymous reader.
- `site_content_read` / `site_image_read`: SELECT for `{anon, authenticated}`, `qual: true` — **an edit does reach the page.**
- `site_content_write` / `site_image_write`: INSERT only, `{authenticated}`, `with_check: site_is_admin() AND edited_by = auth.uid()`. There are no UPDATE or DELETE policies — **append-only in the database, not by convention.**
- `site_is_admin()`: `STABLE SECURITY DEFINER`, `search_path` pinned to `public`, matching `auth.jwt() ->> 'email'` against `site_admin` (2 rows).
- `site_slot_audit_row()`: `SECURITY DEFINER`, writes `actor` (`auth.uid()`), `actor_email` (the JWT), the slot, the version and `sha256` of the payload. **The audit line carries its own checksum and is written by the trigger, so the writing path cannot omit it.**
- `site_slot_next_version()`: `coalesce(max(version), 0) + 1` per slot — the version is the database's, not the client's.

The page caches slots for `SLOT_REVALIDATE_SECONDS = 60`, so an edit takes up to a minute to show.
