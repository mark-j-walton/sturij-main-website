# sturij.com — marketing site

Static, SEO-baked page for Sturij (bespoke fitted kitchens & wardrobes), with an
admin mode to edit text, upload images, and reorder sections — content stored in
Supabase.

## Files
- `index.html` — the page (house style, real logo, SEO meta + JSON-LD)
- `robots.txt`, `sitemap.xml` — for crawlers
- `vercel.json` — www→apex redirect, security headers

## Admin
Visit `/?admin` (or add `#admin`), enter the passphrase, then:
- click any text to edit it,
- click an image placeholder to upload a photo,
- drag a section to reorder it,
- **Save & publish**.

Content + images live in Supabase (project `oqduxjquzbvetkcllymd`), served by the
`site` edge function. Change the passphrase by updating `ADMIN_HASH` in that function.

## Deploy
Import this repo in Vercel and set the domain to `sturij.com`. No build step
(static). Add old-URL redirects to `vercel.json` as needed.
