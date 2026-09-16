# Receipts — the blog section, Step 1 of 2 (blog only) · 16 September 2026

Session `claude-code-session-2026-09-11-blog-section` · Claude Code, model claude-sonnet-5 · the Architect's brief of 11 Sep (blog) and its addendum 1 (commercial projects), resumed and run on 16 Sep on Mark's paste.
Branch `claude/blog-section-c92c39` off `main` @ ec7d2f3. **Nothing merged. Nothing to production. No PR opened yet — see "still owed".**

MERGED ≠ DEPLOYED ≠ EXERCISED — each line below says which.

## Step 1 (read-only) found the brief's three premises did not hold — stopped and put to Mark before writing anything

1. **The old site has no blog.** www.sturij.com (confirmed live Google Sites) was mapped in full (13 URLs, all primary nav) and 15 candidate slugs (blog, news, case-studies, our-work, commercial-projects, etc.) all returned 404. Wayback's CDX index for the domain has 7 rows, none a real page. Conclusion: 0 posts to migrate, and Step 4's URL-redirect requirement is vacuous for blog — there is nothing to redirect from.
2. **sturij-web's 5 seeded "project" case studies are fabricated** — Unsplash stock photography presented as Sturij's own completed work, plus invented locations, client quotes and a fabricated press mention ("featured... for Yorkshire Post"). Read in full from Supabase (`bcpmgpktmuaicjessseg`, table `content_item`/`content_version`). Not carried forward. Mark's decision (put to him): keep the field shape and category taxonomy, discard every fabricated case study; real commercial content to be sourced fresh (blocked — see "still owed").
3. **The brief's Step 2 destination is dead.** sturij-web's `content_item`/`content_version` CMS (holding the 117 orphaned rows the 9 Sep build inventory already flagged as "no reader") is never read by the actually-deployed site. This repo has its own working page-platform implementation (`pages/*/layout.json`, `artifacts/*.json`, `content/sections/*.json` → `site_content_slots_current`/`site_image_slots_current` in the same Supabase project). Filing posts into `content_item` would have created a second orphaned batch. Built against the live system instead, on the existing `boards`/`services` pattern.

Full findings and Mark's answers are on the session key (`session_resume` with that key); memory notes `blog-section-old-site-and-fabricated-projects.md` and `live-site-reads-slots-not-content-item.md` carry the durable facts.

Mark's directions, given after the Step 1 report: adopt the 18 existing blog posts (drop their fictional backdated dates and Unsplash cover images); keep the project scaffolding, discard the fabricated content; pursue Oakdale Estates Limited (the one real named-client signal on the old site — two headings, no body text, no images, no permission on record) as a commercial-project seed **if** Mark can supply the project detail, photos and permission — not yet supplied, so the commercial-projects addendum is entirely unstarted this run.

## What shipped (this run, blog only — commercial projects not started)

| File(s) | What |
|---|---|
| `lib/blog.ts` | The post content type (page-platform S1): `BlogPost` (id, slug, category, title, description, author, readTime, standfirst, body lines, source), `loadPosts`/`loadPost`, `postSlots`/`allBlogSlots` (merged into `lib/slots.ts`'s seed exactly as sections are), `postPublishedDate`/`publishablePosts`. A post's go-live date is a claim-style slot `claim.blog.<id>` — empty holds the whole post (PP4: absence is visible, never guessed) |
| `content/blog/*.json` (18 files) | The 18 posts migrated from sturij-web's `content_item` rows (content_type=blog, Feb 2026), body paragraphs and subheadings preserved verbatim; author "Sturij" kept (not a fabricated named person, so no misrepresentation risk there); cover images and backdated publish dates dropped (finding 1/2 above) |
| `artifacts/blog-grid.json`, `artifacts/blog-post.json` | Two new artifacts, declared per S3 (tags, content types, consumers, recipes, tokens) |
| `pages/blog/layout.json` | The index page's declaration (S5): nav (group "Read"), hero copy slots, a `type: "blog"` slot expanding to every post's slots |
| `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` | The index route and the site's first dynamic route. An unknown slug 404s; an unpublished post still renders (noindexed, marked "Not yet published") so the held claim is reachable in admin editing mode — a true 404 would have made the post unpublishable through the site itself |
| `components/BlogGrid.tsx`, `components/BlogPost.tsx` | The two page components, built on the existing `SectionPage`/`LegalPage` pattern (NavBar, EnquiryBand, SiteFooter, RevealObserver, ConfiguratorProvider) |
| `components/NavBar.tsx`, `components/SiteFooter.tsx` | +1 line each: "Blog" reachable from the nav and the footer (brief requirement) |
| `content/copy.seed.json` | +3 slots: `blog.hero.kicker/title/description` |
| `lib/signpost.ts` | `PageEntry.kind` gains `'listing'` |
| `lib/slots.ts` | `SEED_SLOTS` merges `allBlogSlots()` alongside `allSectionSlots()`, same duplicate-key guard |
| `app/sitemap.ts` | Now async; adds published posts only (none yet) |
| `test/platform.test.ts`, `test/content.test.ts` | S5's declared-slot check extended for `type: "blog"`; the sitemap test awaits the now-async function |
| `app/site.css` | Card grid, post-article and draft-note styles — existing tokens only |

No sturij-web write. No content_item touched. No image asset added (Step 5 not exercised — no post in this batch needs an image; see "still owed").

## What was measured

| Check | Result |
|---|---|
| typecheck | clean |
| vitest | 98 / 98 (8 files; the extended S5 block covers the new `blog` slot type) |
| token audit | 79 files · 45 custom tokens (unchanged — no new one-offs) |
| local dev server, browser | `/blog` with all 18 posts held: renders the hero, "No posts are published yet.", nav and footer both carry Blog, no console errors. A temporary local-only edit published one post (`soft-close-everything`) to prove the full path: the card renders on the index (category · date · title · standfirst · read time), the post page renders all 8 paragraphs with their 4 subheadings in order, the back-link, the enquiry band and footer. Reverted before committing (`git diff` confirms `lib/blog.ts` is clean of the test value). `/blog/soft-close-everything` while unpublished: renders (not a 404), shows "Not yet published — no date is set on this post's claim slot.", no date in the meta line. `/sitemap.xml`: `/blog` present, no post URLs (none published) |
| phone viewport (390×812) | the post page: no horizontal overflow (0 px) |
| `npm run quality` (the Playwright + Lighthouse E2E run) | **not run this session** — see "still owed" |

## Exercised

Nothing on production, nothing on a Vercel preview. Everything above was exercised on `next dev` locally only.

## Still owed

**Mark:**
- The Oakdale Estates Limited project detail, photos and permission — without them the commercial-projects addendum (Step 2 onward) cannot start; the old site itself has no body text or images for it, only the two headings.
- A decision on real cover images for the 18 blog posts, if wanted — shipped without any (the originals were Unsplash hotlinks, which page-platform S1 refuses to embed directly, and inventing a replacement risked the same misrepresentation flagged in finding 2).
- To actually publish any post: sign in as admin, open editing mode, and type a real date into each post's held claim (visible on its own page as "Not yet published" once editing mode is on) — same mechanism as closing a section's `claim.<section>.<row>`, no new deployment step.
- The trade name / voice check on the 18 posts — migrated verbatim from the Feb 2026 seed; nobody has read them for accuracy or tone since.

**This run's, not yet done:**
- `npm run quality` (the Playwright + Lighthouse E2E run) and a three-size render check — done via manual browser check only this session.
- A draft PR. The branch is ready; opening it is the next action once Mark has seen this receipt.
- Nav placement: "Blog" was added as a fifth plain link (matching "Finishes", "The Sturij way") rather than folded into the existing "What we build with" dropdown, which is materials-specific — a judgement call, not confirmed with Mark.

**Not this run's, by rule:** the commercial-projects addendum (Steps 2–5) — blocked on Mark's material, above; Step 5's image-permission mechanism — not exercised, no image in this batch needed it.
