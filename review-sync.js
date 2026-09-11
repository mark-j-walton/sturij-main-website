// review-sync.js — canvas-side live bridge (Sprint 4 boards schema). Opt-in:
//   <script>window.STURIJ_SUPABASE = {url, anonKey, boardId};</script>
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
//   <script src="review-sync.js"></script>
// Designer must be signed in (magic link) as the board owner.

(function () {
  var CFG = window.STURIJ_SUPABASE;
  if (!CFG || !window.supabase) return;
  var sb = window.supabase.createClient(CFG.url, CFG.anonKey);

  function authed(fn) {
    return sb.auth.getSession().then(function (s) {
      var token = s.data.session && s.data.session.access_token;
      if (!token) throw new Error('Sign in required');
      return fn(token);
    });
  }
  function post(url, token, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || url + ' failed'); });
      return r.json();
    });
  }

  // ── Approval sync-back: approvals insert/delete → mark canvas items.
  // canvas.js exposes markItemApproved(itemId, approved) (replaces the storage-event listener).
  sb.channel('approvals-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals', filter: 'board_id=eq.' + CFG.boardId }, function (p) {
      var fn = window.markItemApproved;
      if (typeof fn !== 'function') return;
      if (p.eventType === 'INSERT') fn(p.new.swatch_key, true);
      if (p.eventType === 'DELETE' && p.old) fn(p.old.swatch_key, false);
    })
    .subscribe();

  // ── Publish a wall: {wall:{wallId,name}, imageBase64, materials:[{itemId,name,hex,imageBase64?}]}
  // Returns {versionId, ver, shareToken, shareUrl}.
  window.publishWallLive = function (payload) {
    payload.boardId = CFG.boardId;
    return authed(function (t) { return post('/api/review/publish', t, payload); });
  };

  // ── Narrative via the server route (replaces window.claude.complete in production).
  window.fetchNarrative = function (walls, materials) {
    return authed(function (t) { return post('/api/present/narrative', t, { walls: walls, materials: materials }); });
  };

  // ── Persist a deck; returns {id, shareUrl:/p/:id}.
  window.savePresentation = function (narrative, html) {
    return authed(function (t) { return post('/api/present/save', t, { boardId: CFG.boardId, narrative: narrative, html: html }); });
  };

  // ── Past decks for this board.
  window.listPresentations = function () {
    return sb.from('presentations').select('id,narrative,created_at')
      .eq('board_id', CFG.boardId).order('created_at', { ascending: false })
      .then(function (r) { return r.data || []; });
  };

  // ── Mark all responses ready + email the client.
  window.notifyResponsesReady = function () {
    return authed(function (t) { return post('/api/review/respond-done', t, { boardId: CFG.boardId }); });
  };
})();
