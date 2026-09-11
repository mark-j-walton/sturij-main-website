// POST /api/present/narrative — PRESENT-REVIEW-SPEC.md Prompt 3
// Server-side Anthropic call for the presentation builder. Never called with the key from the browser.
// Env: ANTHROPIC_API_KEY (required). Plain fetch — no dependencies, repo stays build-free.

const MODEL = 'claude-sonnet-4-20250514';
const RATE = { limit: 10, windowMs: 60_000 }; // 10/min per caller
const buckets = new Map(); // in-memory, per instance — fine at this traffic

function rateLimited(key) {
  const now = Date.now();
  const b = buckets.get(key) || [];
  const recent = b.filter(t => now - t < RATE.windowMs);
  if (recent.length >= RATE.limit) { buckets.set(key, recent); return true; }
  recent.push(now); buckets.set(key, recent); return false;
}

function bad(res, code, error) { res.status(code).json({ error }); }

function validIn(body) {
  if (!body || typeof body !== 'object') return 'body must be JSON';
  if (!Array.isArray(body.walls) || body.walls.length < 1 || body.walls.length > 40) return 'walls: 1-40 required';
  if (!body.walls.every(w => w && typeof w.name === 'string' && w.name.length <= 120)) return 'walls[].name invalid';
  if (!Array.isArray(body.materials) || body.materials.length > 60) return 'materials: array (max 60) required';
  if (!body.materials.every(m => typeof m === 'string' && m.length <= 120)) return 'materials[] invalid';
  return null;
}

// Verbatim narrative prompt from PRESENT-REVIEW-SPEC.md
function buildPrompt(wallNames, materialNames) {
  return `You are writing a short interior-scheme presentation for a Sturij client.
British English, warm but plain, no emoji, no hyperbole.
Walls in the scheme: ${wallNames}.
Materials: ${materialNames}.
Reply with ONLY valid JSON:
{"title":"...","intro":"2 sentences","captions":{"WallName":"1-2 sentences"},"close":"1 sentence"}`;
}

function validOut(j, wallNames) {
  if (!j || typeof j !== 'object') return 'not an object';
  for (const k of ['title', 'intro', 'close']) if (typeof j[k] !== 'string' || !j[k].trim()) return `missing ${k}`;
  if (!j.captions || typeof j.captions !== 'object') return 'missing captions';
  for (const w of wallNames) if (typeof j.captions[w] !== 'string' || !j.captions[w].trim()) return `missing caption for ${w}`;
  return null;
}

async function callClaude(prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const data = await r.json();
  const text = (data.content || []).map(c => c.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/); // tolerate stray prose around the JSON
  if (!m) throw new Error('no JSON in response');
  return JSON.parse(m[0]);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return bad(res, 405, 'POST only');
  if (!process.env.ANTHROPIC_API_KEY) return bad(res, 500, 'ANTHROPIC_API_KEY not configured');

  // Per-designer once auth lands (Supabase JWT sub); per-IP until then.
  const caller = (req.headers.authorization || '').slice(0, 64) ||
    (req.headers['x-forwarded-for'] || 'anon').toString().split(',')[0];
  if (rateLimited(caller)) return bad(res, 429, 'Rate limit: 10 per minute');

  const err = validIn(req.body);
  if (err) return bad(res, 400, err);

  const wallNames = req.body.walls.map(w => w.name);
  const prompt = buildPrompt(wallNames.join(', '), req.body.materials.join(', ') || 'none listed');

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const narrative = await callClaude(prompt);
      const oerr = validOut(narrative, wallNames);
      if (oerr) throw new Error(oerr);
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      return res.status(200).json(narrative);
    } catch (e) {
      if (attempt === 1) return bad(res, 502, `Narrative generation failed: ${e.message}`);
    }
  }
};
