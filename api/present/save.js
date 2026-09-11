// POST /api/present/save — persist a generated deck (Sprint 4 boards schema).
// Auth: Bearer token; caller must own the board. Shared read-only at /p/:id.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SB = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const SVC = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const svcHeaders = extra => ({ apikey: SVC(), authorization: `Bearer ${SVC()}`, ...extra });
function bad(res, code, error) { res.status(code).json({ error }); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return bad(res, 405, 'POST only');

  const b = req.body || {};
  if (typeof b.boardId !== 'string' || !b.boardId) return bad(res, 400, 'boardId required');
  if (!b.narrative || typeof b.narrative !== 'object') return bad(res, 400, 'narrative required');
  if (typeof b.html !== 'string' || !b.html || b.html.length > 2_000_000) return bad(res, 400, 'html required (max 2MB)');

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const u = token && await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: SVC(), authorization: `Bearer ${token}` } });
  const userId = u && u.ok ? (await u.json()).id : null;
  if (!userId) return bad(res, 401, 'Sign in required');

  let r = await fetch(`${SB()}/rest/v1/boards?id=eq.${b.boardId}&owner=eq.${userId}&select=id`, { headers: svcHeaders() });
  if (!r.ok || !(await r.json()).length) return bad(res, 403, 'Board not found or not yours');

  r = await fetch(`${SB()}/rest/v1/presentations`, {
    method: 'POST', headers: svcHeaders({ 'content-type': 'application/json', prefer: 'return=representation' }),
    body: JSON.stringify({ board_id: b.boardId, owner: userId, narrative: b.narrative, html: b.html }),
  });
  if (!r.ok) return bad(res, 502, `Save failed: ${await r.text()}`);
  const [row] = await r.json();
  return res.status(200).json({ id: row.id, shareUrl: `/p/${row.id}`, createdAt: row.created_at });
};
