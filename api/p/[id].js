// GET /p/:id — PRESENT-REVIEW-SPEC.md Prompt 6 (share half)
// Public read-only deck page. Unguessable uuid IS the authorisation; served with the service role.
// vercel.json rewrite: { "source": "/p/:id", "destination": "/api/p/[id]" }
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SB = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const SVC = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  const id = (req.query.id || '').toString();
  if (!UUID.test(id)) return res.status(404).send('Not found');

  const r = await fetch(`${SB()}/rest/v1/presentations?id=eq.${id}&select=html`, {
    headers: { apikey: SVC(), authorization: `Bearer ${SVC()}` },
  });
  const [row] = r.ok ? await r.json() : [];
  if (!row) return res.status(404).send('Not found');

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=300');
  res.setHeader('x-robots-tag', 'noindex');
  return res.status(200).send(row.html);
};
