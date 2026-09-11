/* code-search.js — type a product code in the contextual bar, get the board.
   Mounts itself into the cbar on any page that has one, autocompletes from the
   same registry the 3D viewer reads (showcase/boards3d/boards.json), and hands
   the code straight to openBoardViewer(). Also contributes a ⌘K command.
   Self-contained: no markup required in the page, no styles in studio.css. */
(function(){
  var REG = null;

  function load(cb){
    if (REG) return cb(REG);
    fetch('showcase/boards3d/boards.json')
      .then(function(r){ return r.json(); })
      .then(function(j){ REG = j.boards || []; cb(REG); })
      .catch(function(){ REG = []; cb(REG); });
  }

  var st = document.createElement('style');
  st.textContent =
    '.csx{display:inline-flex;align-items:center;gap:6px;margin:0 10px}' +
    '.csx input{border:0;outline:none;width:96px;background:rgba(253,252,248,.9);border-radius:999px;' +
      'padding:6px 12px;font:500 10.5px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;' +
      'text-transform:uppercase;color:#1D1D1D;box-shadow:inset 0 1px 1.5px rgba(255,255,255,.8),' +
      '0 2px 8px rgba(35,31,27,.12);transition:width .22s cubic-bezier(.22,1,.36,1),box-shadow .16s}' +
    '.csx input::placeholder{color:rgba(98,88,79,.65);letter-spacing:.12em}' +
    '.csx input:focus{width:132px;box-shadow:0 0 0 1.5px #D4A01B,0 2px 8px rgba(35,31,27,.14)}' +
    '.csx input.miss{box-shadow:0 0 0 1.5px #8a3b2e,0 2px 8px rgba(35,31,27,.14)}' +
    '.csx .cshit{font:500 9.5px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;' +
      'text-transform:uppercase;color:rgba(98,88,79,.75);white-space:nowrap;opacity:0;transition:opacity .18s}' +
    '.csx .cshit.on{opacity:1}' +
    '@media (prefers-reduced-motion:reduce){.csx input{transition:none}}';
  document.head.appendChild(st);

  function mount(){
    var row = document.getElementById('cbarrow');
    if (!row || row.querySelector('.csx')) return;

    var wrap = document.createElement('span');
    wrap.className = 'csx';
    wrap.innerHTML =
      '<input type="text" list="cs-codes" placeholder="Code" ' +
        'aria-label="Find a board by product code" spellcheck="false" autocomplete="off">' +
      '<span class="cshit" aria-live="polite"></span>' +
      '<datalist id="cs-codes"></datalist>';

    var tc = row.querySelector('.tc');
    tc ? row.insertBefore(wrap, tc) : row.appendChild(wrap);

    var inp = wrap.querySelector('input');
    var hit = wrap.querySelector('.cshit');
    var dl  = wrap.querySelector('datalist');

    load(function(boards){
      dl.innerHTML = boards.map(function(b){
        return '<option value="' + b.code + '">' + b.name + (b.range ? ' · ' + b.range : '') + '</option>';
      }).join('');
    });

    /* A bare code is NOT unique — B073 exists in six textures, U129 in four.
       Match on id first (texture-code, the real identity), then collect every
       code match so an ambiguous entry offers the choice instead of guessing. */
    function matches(q){
      q = String(q || '').trim().toLowerCase().replace(/\s+/g, '-');
      if (!q) return [];
      var reg = REG || [];
      var byId = reg.filter(function(b){ return (b.id || '').toLowerCase() === q; });
      if (byId.length) return byId;
      var exact = reg.filter(function(b){ return b.code.toLowerCase() === q; });
      if (exact.length) return exact;
      return reg.filter(function(b){
        return b.code.toLowerCase().indexOf(q) === 0 || (b.id || '').toLowerCase().indexOf(q) === 0;
      }).slice(0, 8);
    }

    inp.addEventListener('input', function(){
      var m = matches(inp.value);
      inp.classList.remove('miss');
      hit.textContent = !m.length ? ''
        : m.length === 1 ? m[0].name
        : m.length + ' textures — pick one';
      hit.classList.toggle('on', m.length > 0);
    });

    inp.addEventListener('keydown', function(e){
      if (e.key !== 'Enter') return;
      var m = matches(inp.value);
      if (!m.length){
        inp.classList.add('miss');
        setTimeout(function(){ inp.classList.remove('miss'); }, 900);
        return;
      }
      if (m.length > 1){
        // ambiguous: fill the datalist with the candidates and let them choose
        dl.innerHTML = m.map(function(b){
          return '<option value="' + (b.id || b.code) + '">' + b.name + '</option>';
        }).join('');
        hit.textContent = m.length + ' textures — pick one';
        hit.classList.add('on');
        return;
      }
      if (window.openBoardViewer){
        window.openBoardViewer(m[0].id || m[0].code);
        inp.value = ''; hit.textContent = ''; hit.classList.remove('on');
        inp.blur();
      }
    });

    /* the cbar sits over the scheme — don't let typing reach the canvas */
    ['pointerdown','keydown','keyup'].forEach(function(evt){
      inp.addEventListener(evt, function(e){ e.stopPropagation(); });
    });
  }

  addEventListener('DOMContentLoaded', function(){
    mount();
    if (window.SturijCommands){
      window.SturijCommands.push({
        group: 'Create',
        label: 'Find board by code',
        keywords: ['code','sku','decor','search','board','material'],
        run: function(){
          var i = document.querySelector('.csx input');
          if (i) { i.focus(); i.select(); }
          else if (window.openBoardViewer) window.openBoardViewer();
        }
      });
    }
  });
})();
