// POST /api/review/respond-done — designer marks all notes answered; client emailed (Resend).
// Auth: Bearer token; caller must own the board. Sprint 4 boards schema.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM, REVIEW_URL

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
  const { boardId } = req.body || {};
  if (typeof boardId !== 'string' || !boardId) return bad(res, 400, 'boardId required');

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const u = token && await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: SVC(), authorization: `Bearer ${token}` } });
  const userId = u && u.ok ? (await u.json()).id : null;
  if (!userId) return bad(res, 401, 'Sign in required');

  let r = await fetch(`${SB()}/rest/v1/boards?id=eq.${boardId}&owner=eq.${userId}&select=id,title,client_name,client_email,share_token,published_version`, { headers: svcHeaders() });
  const [board] = r.ok ? await r.json() : [];
  if (!board) return bad(res, 403, 'Board not found or not yours');

  r = await fetch(`${SB()}/rest/v1/boards?id=eq.${boardId}`, {
    method: 'PATCH', headers: svcHeaders({ 'content-type': 'application/json', prefer: 'return=minimal' }),
    body: JSON.stringify({ responded_at: new Date().toISOString() }),
  });
  if (!r.ok) return bad(res, 502, 'Status update failed');

  let notified = false;
  if (process.env.RESEND_API_KEY && board.client_email && board.share_token) {
    const base = process.env.REVIEW_URL || 'https://sturij.com/review';
    const link = `${base}?t=${board.share_token}`;
    const wallName = board.title;
    try {
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Sturij <onboarding@resend.dev>',
          to: board.client_email,
          subject: `Your designer has responded — ${wallName}`,
          text: `${board.client_name ? board.client_name + ',\n\n' : ''}Your designer has responded to your notes on ${wallName} — green notes carry their reply.\n\nView the replies: ${link}\n\n— Sturij`,
        }),
      });
      notified = sent.ok;
    } catch (e) { /* best-effort */ }
  }
  return res.status(200).json({ ok: true, notified });
};
