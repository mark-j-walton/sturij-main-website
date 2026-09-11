// POST /api/review/publish — publish a wall for client review (Sprint 4 boards schema).
// Auth: Bearer <supabase access token>; caller must own the board.
// One live publication per BOARD: a new immutable board_versions snapshot + published_version pointer.
// Unreplied notes from the previously published version carry over.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const crypto = require('crypto');
const MAX_IMAGE = 4 * 1024 * 1024;
const BUCKET = 'publications';
const SB = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const SVC = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const svcHeaders = extra => ({ apikey: SVC(), authorization: `Bearer ${SVC()}`, ...extra });
function bad(res, code, error) { res.status(code).json({ error }); }

function decodeB64(s) {
  const buf = Buffer.from(String(s).replace(/^data:image\/\w+;base64,/, ''), 'base64');
  return buf.length && buf.length <= MAX_IMAGE ? buf : null;
}

async function whoAmI(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: SVC(), authorization: `Bearer ${token}` } });
  return r.ok ? (await r.json()).id || null : null;
}

async function rest(method, path, body, extra) {
  const r = await fetch(`${SB()}/rest/v1/${path}`, {
    method, headers: svcHeaders({ 'content-type': 'application/json', prefer: 'return=representation', ...extra }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path.split('?')[0]} failed (${r.status}): ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function ensureBucket() {
  const r = await fetch(`${SB()}/storage/v1/bucket/${BUCKET}`, { headers: svcHeaders() });
  if (r.ok) return;
  await fetch(`${SB()}/storage/v1/bucket`, {
    method: 'POST', headers: svcHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

async function upload(path, buf) {
  const r = await fetch(`${SB()}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST', headers: svcHeaders({ 'content-type': 'image/jpeg', 'x-upsert': 'true' }), body: buf,
  });
  if (!r.ok) throw new Error(`storage upload failed (${r.status})`);
  return `${BUCKET}/${path}`;
}

function validIn(b) {
  if (!b || typeof b !== 'object') return 'body must be JSON';
  if (typeof b.boardId !== 'string' || !b.boardId) return 'boardId required';
  if (!b.wall || typeof b.wall.name !== 'string' || !b.wall.name || b.wall.name.length > 120) return 'wall.name required';
  if (typeof b.imageBase64 !== 'string') return 'imageBase64 required';
  if (!Array.isArray(b.materials) || b.materials.length > 60) return 'materials: array (max 60)';
  for (const m of b.materials) {
    if (!m || typeof m.itemId !== 'string' || typeof m.name !== 'string' || m.name.length > 120) return 'materials[] invalid';
    if (m.hex != null && !/^#[0-9a-fA-F]{3,8}$/.test(m.hex)) return 'materials[].hex invalid';
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return bad(res, 405, 'POST only');
  const err = validIn(req.body);
  if (err) return bad(res, 400, err);
  const { boardId, wall, imageBase64, materials } = req.body;

  const userId = await whoAmI(req);
  if (!userId) return bad(res, 401, 'Sign in required');

  try {
    const [board] = await rest('GET', `boards?id=eq.${boardId}&owner=eq.${userId}&select=id,share_token,published_version`);
    if (!board) return bad(res, 403, 'Board not found or not yours');

    const img = decodeB64(imageBase64);
    if (!img) return bad(res, 400, 'imageBase64 empty or over 4MB');
    await ensureBucket();

    const vers = await rest('GET', `board_versions?board_id=eq.${boardId}&select=ver&order=ver.desc&limit=1`);
    const ver = (vers[0] ? vers[0].ver : 0) + 1;

    const imagePath = await upload(`${boardId}/v${ver}.jpg`, img);
    const mats = [];
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      let mPath = null;
      if (m.imageBase64) {
        const mb = decodeB64(m.imageBase64);
        if (!mb) return bad(res, 400, `material ${m.name}: image empty or over 4MB`);
        mPath = await upload(`${boardId}/v${ver}-m${i}.jpg`, mb);
      }
      mats.push({ itemId: m.itemId, name: m.name, hex: m.hex || null, image_path: mPath });
    }

    const [version] = await rest('POST', 'board_versions', {
      board_id: boardId, ver,
      items: { kind: 'publication', wall: { wallId: wall.wallId || null, name: wall.name }, image_path: imagePath, materials: mats },
    });

    // Carry over unreplied notes from the previously published version
    if (board.published_version) {
      const openNotes = await rest('GET',
        `board_notes?version_id=eq.${board.published_version}&reply=is.null&select=x,y,author,body,created_at`);
      if (openNotes.length) {
        await rest('POST', 'board_notes', openNotes.map(n => ({ ...n, board_id: boardId, version_id: version.id })), { prefer: 'return=minimal' });
      }
    }

    const share_token = board.share_token || crypto.randomBytes(24).toString('base64url');
    await rest('PATCH', `boards?id=eq.${boardId}`,
      { published_version: version.id, share_token, responded_at: null }, { prefer: 'return=minimal' });

    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    return res.status(200).json({ versionId: version.id, ver, shareToken: share_token, shareUrl: `/review?t=${share_token}` });
  } catch (e) {
    return bad(res, 502, e.message);
  }
};
