// /api/review/client — anonymous client access, validated exclusively by boards.share_token.
// GET  ?t=<token>                       → board + published version + notes + approvals
// POST {t, action:'note', x, y, body}   → drop a note (author 'client')
// POST {t, action:'delNote', id}        → delete own unreplied note
// POST {t, action:'approve', swatchKey, swatch, approved} → upsert/remove approval
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SB = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const SVC = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const svcHeaders = extra => ({ apikey: SVC(), authorization: `Bearer ${SVC()}`, ...extra });
function bad(res, code, error) { res.status(code).json({ error }); }
const pub = p => p ? `${SB()}/storage/v1/object/public/${p}` : null;

async function rest(method, path, body, extra) {
  const r = await fetch(`${SB()}/rest/v1/${path}`, {
    method, headers: svcHeaders({ 'content-type': 'application/json', prefer: 'return=representation', ...extra }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path.split('?')[0]} failed (${r.status})`);
  return r.status === 204 ? null : r.json();
}

async function boardByToken(t) {
  if (typeof t !== 'string' || t.length < 20) return null;
  const rows = await rest('GET', `boards?share_token=eq.${encodeURIComponent(t)}&select=id,title,published_version,responded_at`);
  return rows[0] || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(204).end();
  }
  try {
    if (req.method === 'GET') {
      const board = await boardByToken(req.query.t);
      if (!board) return bad(res, 404, 'Invalid link');
      if (!board.published_version) return res.status(200).json({ board: { title: board.title, responded: !!board.responded_at }, publication: null });
      const [version] = await rest('GET', `board_versions?id=eq.${board.published_version}&select=id,ver,items,created_at`);
      const notes = await rest('GET', `board_notes?version_id=eq.${board.published_version}&select=id,x,y,author,body,reply,replied_at,created_at&order=created_at`);
      const approvals = await rest('GET', `approvals?board_id=eq.${board.id}&select=swatch_key,approved_by`);
      const items = version.items || {};
      return res.status(200).json({
        board: { title: board.title, responded: !!board.responded_at },
        publication: {
          versionId: version.id, ver: version.ver, published: version.created_at,
          name: items.wall ? items.wall.name : board.title,
          png: pub(items.image_path),
          materials: (items.materials || []).map(m => ({ itemId: m.itemId, name: m.name, hex: m.hex, src: pub(m.image_path) })),
          notes,
        },
        approved: approvals.map(a => a.swatch_key),
      });
    }

    if (req.method !== 'POST') return bad(res, 405, 'GET or POST');
    const b = req.body || {};
    const board = await boardByToken(b.t);
    if (!board) return bad(res, 404, 'Invalid link');
    if (!board.published_version) return bad(res, 409, 'Nothing published');

    if (b.action === 'note') {
      if (typeof b.body !== 'string' || !b.body.trim() || b.body.length > 1000) return bad(res, 400, 'body required (max 1000)');
      if (typeof b.x !== 'number' || typeof b.y !== 'number') return bad(res, 400, 'x,y required');
      const [note] = await rest('POST', 'board_notes', {
        board_id: board.id, version_id: board.published_version,
        x: Math.max(0, Math.min(b.x, 1)), y: Math.max(0, Math.min(b.y, 1)),
        author: 'client', body: b.body.trim(),
      });
      return res.status(200).json(note);
    }
    if (b.action === 'delNote') {
      await rest('DELETE', `board_notes?id=eq.${b.id}&board_id=eq.${board.id}&author=eq.client&reply=is.null`, null, { prefer: 'return=minimal' });
      return res.status(200).json({ ok: true });
    }
    if (b.action === 'approve') {
      if (typeof b.swatchKey !== 'string' || !b.swatchKey) return bad(res, 400, 'swatchKey required');
      if (b.approved) {
        await rest('POST', 'approvals',
          { board_id: board.id, swatch_key: b.swatchKey, swatch: b.swatch || {}, approved_by: 'client' },
          { prefer: 'resolution=merge-duplicates,return=minimal' });
      } else {
        await rest('DELETE', `approvals?board_id=eq.${board.id}&swatch_key=eq.${encodeURIComponent(b.swatchKey)}`, null, { prefer: 'return=minimal' });
      }
      return res.status(200).json({ ok: true });
    }
    return bad(res, 400, 'Unknown action');
  } catch (e) {
    return bad(res, 502, e.message);
  }
};
