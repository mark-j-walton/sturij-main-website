/* board-viewer.js — 3D specimen board viewer, lives on all three work areas.
   Type a product code (or pick from the dropdown) and it pulls the board image from
   showcase/boards3d/boards.json (temporary registry: code, name, tone, range — admin-editable;
   swaps to the database later with no component change). Opening blurs the page behind;
   the board takes centre stage. Drag = tilt · shift/right-drag = closer/away. */
(function(){
var REG=null;
function load(cb){if(REG)return cb(REG);
  fetch('showcase/boards3d/boards.json').then(function(r){return r.json();}).then(function(j){REG=j.boards||[];cb(REG);})
  .catch(function(){REG=[];cb(REG);});}
var st=document.createElement('style');
st.textContent=
'.bvov{position:fixed;inset:0;z-index:560;display:flex;align-items:center;justify-content:center;background:rgba(247,244,238,.55);backdrop-filter:blur(16px) saturate(1.1);-webkit-backdrop-filter:blur(16px) saturate(1.1)}'+
'.bvstage{position:relative;width:min(860px,94vw);height:min(600px,86vh);perspective:1400px;touch-action:none;cursor:grab}'+
'.bvstage:active{cursor:grabbing}'+
'.bvx{all:unset;position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:50%;background:#FDFCF8;color:rgba(98,88,79,.8);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:5;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16),0 4px 12px rgba(35,31,27,.2)}'+
'.bvx:hover{color:#1D1D1D}'+
'.bvhud{position:absolute;top:18px;left:18px;z-index:5;display:flex;gap:8px;align-items:center}'+
'.bvhud input{border:0;outline:none;background:rgba(253,252,248,.9);border-radius:999px;padding:9px 15px;font:400 11px "IBM Plex Mono",monospace;color:#1D1D1D;width:110px;box-shadow:0 4px 12px rgba(35,31,27,.14)}'+
'.bvhud input:focus{box-shadow:0 0 0 1.5px #D4A01B,0 4px 12px rgba(35,31,27,.14)}'+
'.bvhud select{border:0;outline:none;background:rgba(253,252,248,.9);border-radius:999px;padding:9px 13px;font:400 11px "IBM Plex Mono",monospace;color:#62584F;cursor:pointer;box-shadow:0 4px 12px rgba(35,31,27,.14)}'+
'.bvstep{display:flex;align-items:center;gap:2px;background:rgba(253,252,248,.9);border-radius:999px;padding:3px 4px;box-shadow:0 4px 12px rgba(35,31,27,.14)}'+
'.bvstep button{all:unset;cursor:pointer;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:500 14px "IBM Plex Mono",monospace;color:#62584F;transition:background .15s,color .15s}'+
'.bvstep button:hover:not(:disabled){background:rgba(228,179,46,.22);color:#1D1D1D}'+
'.bvstep button:disabled{opacity:.3;cursor:default}'+
'.bvstep .bvcount{font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.08em;color:#62584F;min-width:44px;text-align:center;font-variant-numeric:tabular-nums}'+
'.bvname{position:absolute;bottom:20px;left:22px;z-index:5;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#62584F}'+
'.bvnew{display:inline-block;margin-left:8px;padding:2px 6px;border-radius:3px;background:#D4A01B;color:#231F1B;font:600 8.5px "IBM Plex Mono",monospace;letter-spacing:.1em;vertical-align:1px}'+
'.bvbar{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:4px;padding:8px 10px;border-radius:100px;background:#FDFCF8;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.14),0 10px 26px rgba(35,31,27,.2)}'+
'.bvbar button{all:unset;cursor:pointer;font:600 9.5px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#62584F;padding:8px 13px;border-radius:100px;transition:background .15s,color .15s}'+
'.bvbar button:hover{background:rgba(228,179,46,.16);color:#1D1D1D}'+
'.bvbar button:active{transform:scale(.94)}'+
'.bvbar button.fav.on{background:rgba(228,179,46,.35);color:#231F1B}'+
'.bvbar .vsep{width:1px;align-self:stretch;background:rgba(98,88,79,.2);margin:2px 5px}'+
'.bvslip{position:absolute;bottom:72px;left:50%;transform:translateX(-50%);z-index:6;background:#231F1B;color:#FAF8F2;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.06em;padding:8px 15px;border-radius:100px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}'+
'.bvslip.on{opacity:1;transform:translateX(-50%) translateY(-4px)}'+
'.bvface{position:absolute;left:50%;top:50%;background-color:#5f4430;overflow:hidden}';
document.head.appendChild(st);
window.openBoardViewer=function(code){
  load(function(boards){
    if(!boards.length)return;
    var cur=boards[0];
    /* resolve on id first — a bare code is ambiguous (B073 is six materials) */
    if(code){var q=String(code).toLowerCase();
      var hit=boards.filter(function(b){return (b.id||'').toLowerCase()===q;})[0]
             ||boards.filter(function(b){return b.code.toLowerCase()===q;})[0];
      if(hit)cur=hit;}
    var ov=document.createElement('div');ov.className='bvov';
    ov.innerHTML='<div class="bvhud"><input placeholder="Code\u2026" value="'+cur.code+'"><select></select>'
     +'<span class="bvstep"><button class="bvprev" aria-label="Previous">\u2039</button><span class="bvcount"></span><button class="bvnext" aria-label="Next">\u203a</button></span></div>'
     +'<button class="bvx"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10.5 1.4L1.4 10.5M10.5 10.5L1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>'
     +'<div class="bvstage"><div class="bvboard" style="position:absolute;left:50%;top:52%;width:0;height:0;transform-style:preserve-3d"></div></div>'
     +'<div class="bvbar"><button class="add">Add to canvas</button><button class="fav">\u2665 Favourite</button><div class="vsep"></div><button class="shr">Share</button><button class="ord">Order sample</button></div>'
     +'<div class="bvslip"></div>'
     +'<div class="bvname"></div>';
    document.body.appendChild(ov);
    var stage=ov.querySelector('.bvstage'),board=ov.querySelector('.bvboard'),nameEl=ov.querySelector('.bvname');
    var inp=ov.querySelector('input'),sel=ov.querySelector('select');
    var prevB=ov.querySelector('.bvprev'),nextB=ov.querySelector('.bvnext'),countEl=ov.querySelector('.bvcount');
    var W=380,D=380,T=42,rx=62,ry=0,tz=0,drag=false;

    /* The dropdown is the designer's shortlist first, the catalogue second.
       Favourites hearted during a session rise to the top so they can be
       stepped through in 3D; ‹ › walk that same list. */
    /* keys are ids, never bare codes — favourites saved under a code would be
       ambiguous across textures. Legacy code-keyed favourites still resolve. */
    function key(b){return b.id||b.code;}
    function opt(b){return '<option value="'+key(b)+'">'+b.name+(b['new']?'  NEW':'')+'</option>';}
    function favList(){var f=faves();return boards.filter(function(b){return f.indexOf(key(b))>=0||f.indexOf(b.code)>=0;});}
    function walkList(){var f=favList();return f.length?f:boards;}
    function buildSelect(){
      var f=favList(),n=boards.filter(function(b){return b['new']&&f.indexOf(b)<0;});
      var rest=boards.filter(function(b){return f.indexOf(b)<0&&n.indexOf(b)<0;});
      var html='';
      if(f.length)html+='<optgroup label="Favourites ('+f.length+')">'+f.map(opt).join('')+'</optgroup>';
      if(n.length)html+='<optgroup label="New">'+n.map(opt).join('')+'</optgroup>';
      html+='<optgroup label="'+(f.length||n.length?'All boards':'Boards')+'">'+rest.map(opt).join('')+'</optgroup>';
      sel.innerHTML=html;
      if(cur)sel.value=key(cur);
    }
    function syncStep(){
      var list=walkList(),i=list.map(key).indexOf(key(cur));
      var inList=i>=0,onFaves=favList().length>0;
      countEl.textContent=inList?(i+1)+' / '+list.length:'—';
      countEl.title=onFaves?'Stepping through your favourites':'Stepping through all boards';
      prevB.disabled=!inList||list.length<2;
      nextB.disabled=!inList||list.length<2;
    }
    function step(d){
      var list=walkList(),codes=list.map(key),i=codes.indexOf(key(cur));
      if(i<0)i=0;else i=(i+d+list.length)%list.length;
      show(list[i]);
    }
    prevB.onclick=function(){step(-1);};
    nextB.onclick=function(){step(1);};
    [prevB,nextB].forEach(function(b){b.addEventListener('pointerdown',function(e){e.stopPropagation();});});
    function face(w,h,xform,extra){
      var f=document.createElement('div');f.className='bvface';
      f.style.width=w+'px';f.style.height=h+'px';f.style.margin=(-h/2)+'px 0 0 '+(-w/2)+'px';
      f.style.transform=xform;if(extra)f.style.cssText+=extra;
      board.appendChild(f);return f;
    }
    var top=face(W,D,'translateZ('+(T/2-.5)+'px)');
    var gloss=document.createElement('div');gloss.style.cssText='position:absolute;inset:0;pointer-events:none';top.appendChild(gloss);
    var edges=[
      [face(W,T,'rotateX(-90deg) translateZ('+(D/2)+'px)'),1],
      [face(W,T,'rotateX(-90deg) rotateY(180deg) translateZ('+(D/2)+'px)'),.82],
      [face(D,T,'rotateX(-90deg) rotateY(-90deg) translateZ('+(W/2)+'px)'),.9],
      [face(D,T,'rotateX(-90deg) rotateY(90deg) translateZ('+(W/2)+'px)'),.86]];
    function band(f,img){
      var b=f.querySelector('.bvband')||document.createElement('div');
      b.className='bvband';
      b.style.cssText='position:absolute;left:50%;top:50%;width:'+(T+3)+'px;height:'+(W+3)+'px;margin:'+(-(W+3)/2)+'px 0 0 '+(-(T+3)/2)+'px;transform:rotate(90deg);background-image:linear-gradient(90deg,rgba(35,31,27,.1),rgba(35,31,27,0) 30%,rgba(35,31,27,.16)),url("'+img+'");background-size:100% 100%,cover;background-position:center';
      if(!b.parentNode)f.appendChild(b);
    }
    function apply(){
      board.style.transform='translateZ('+tz+'px) rotateX('+rx+'deg) rotateZ('+ry+'deg)';
      board.style.transition=drag?'none':'transform .5s cubic-bezier(.22,1,.36,1)';
      var glossA=Math.max(0,Math.min(.6,(90-rx)/90*.55+.18));
      var gx=50-ry*1.2,gy=30-(rx-62)*.8;
      gloss.style.background='radial-gradient(720px 230px ellipse at '+gx+'% '+gy+'%,rgba(255,246,224,'+glossA.toFixed(3)+'),rgba(255,246,224,'+(glossA*.22).toFixed(3)+') 48%,transparent 72%),linear-gradient('+(205-ry).toFixed(1)+'deg,transparent 46%,rgba(35,31,27,'+(glossA*.5).toFixed(3)+'))';
    }
    function show(b){
      cur=b;
      top.style.backgroundImage='url("'+b.img+'")';top.style.backgroundSize='cover';top.style.backgroundPosition='center';
      top.style.backgroundColor=b.tone||'#5f4430';
      edges.forEach(function(e){e[0].style.backgroundColor=b.tone||'#5f4430';band(e[0],b.img);e[0].style.filter='brightness('+e[1]+')';});
      nameEl.innerHTML=[b.name,b.code,b.range||''].filter(Boolean).join(' \u00b7 ')+(b['new']?'<span class="bvnew">New</span>':'');
      sel.value=b.code;inp.value=b.code;
      if(window.Motion){try{Motion.animate(board,{scale:[.94,1]},{type:'spring',stiffness:300,damping:26});}catch(_){/**/}}
      apply();
    }
    stage.addEventListener('contextmenu',function(e){e.preventDefault();});
    stage.addEventListener('pointerdown',function(e){
      e.preventDefault();try{stage.setPointerCapture(e.pointerId);}catch(_){/**/}
      var depth=e.button===2||e.shiftKey,s={x:e.clientX,y:e.clientY,rx:rx,ry:ry,tz:tz};
      drag=true;
      function mv(ev){
        if(depth)tz=Math.max(-380,Math.min(160,s.tz-(ev.clientY-s.y)*.8));
        else{rx=Math.max(18,Math.min(88,s.rx-(ev.clientY-s.y)*.25));ry=s.ry+(ev.clientX-s.x)*.3;}
        apply();
      }
      function up(){drag=false;window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);}
      window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
    });
    function byCode(c){var q=String(c).toLowerCase();
      return REG.filter(function(b){return (b.id||'').toLowerCase()===q;})[0]
          || REG.filter(function(b){return b.code.toLowerCase()===q;})[0];}
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=byCode(inp.value.trim());if(b)show(b);else inp.style.boxShadow='0 0 0 1.5px #8a3b2e';setTimeout(function(){inp.style.boxShadow='';},900);}});
    inp.addEventListener('pointerdown',function(e){e.stopPropagation();});
    sel.addEventListener('change',function(){var b=byCode(sel.value);if(b)show(b);});
    sel.addEventListener('pointerdown',function(e){e.stopPropagation();});
    ov.querySelector('.bvx').onclick=function(){ov.remove();document.removeEventListener('keydown',esc);};
    /* ---- action bar ---- */
    var slip=ov.querySelector('.bvslip'),slipT=null;
    function say(msg){slip.textContent=msg;slip.classList.add('on');clearTimeout(slipT);slipT=setTimeout(function(){slip.classList.remove('on');},2200);}
    function favKey(){return 'sturij.boardFaves';}
    function faves(){try{return JSON.parse(localStorage.getItem(favKey())||'[]');}catch(_){return [];}}
    var favBtn=ov.querySelector('.fav');
    function paintFav(){var f=faves();favBtn.classList.toggle('on',f.indexOf(key(cur))>=0||f.indexOf(cur.code)>=0);}
    paintFav();buildSelect();
    var _show=show;show=function(b){_show(b);paintFav();syncStep();};
    ov.querySelector('.add').onclick=function(){
      var list;try{list=JSON.parse(localStorage.getItem('sturij.projectAssets')||'[]');}catch(_){list=[];}
      if(!list.some(function(a){return (a.id||a.code)===key(cur);})){list.push({id:key(cur),code:cur.code,name:cur.name,img:cur.img,kind:'board'});localStorage.setItem('sturij.projectAssets',JSON.stringify(list));}
      say(cur.name+' \u2192 project assets');
    };
    favBtn.onclick=function(){
      var f=faves(),i=f.indexOf(key(cur));
      if(i<0)i=f.indexOf(cur.code);          /* legacy code-keyed entry */
      if(i>=0)f.splice(i,1);else f.push(key(cur));
      localStorage.setItem(favKey(),JSON.stringify(f));paintFav();buildSelect();syncStep();
      var n=favList().length;
      say(i>=0?'Removed from favourites':'Saved · '+n+' to step through');
    };
    ov.querySelector('.shr').onclick=function(){
      if(window.openShareSheet){window.openShareSheet({title:cur.name,text:cur.name+' \u00b7 '+cur.code});return;}
      var link=location.origin+location.pathname+'#board='+key(cur);
      if(navigator.share){navigator.share({title:cur.name,text:cur.name+' \u00b7 '+cur.code,url:link}).catch(function(){});}
      else if(navigator.clipboard){navigator.clipboard.writeText(link);say('Link copied');}
    };
    ov.querySelector('.ord').onclick=function(){
      var q;try{q=JSON.parse(localStorage.getItem('sturij.sampleOrders')||'[]');}catch(_){q=[];}
      if(!q.some(function(o){return (o.id||o.code)===key(cur);})){q.push({id:key(cur),code:cur.code,name:cur.name,when:new Date().toISOString()});localStorage.setItem('sturij.sampleOrders',JSON.stringify(q));}
      say('Sample requested \u00b7 '+cur.code);
    };
    [].forEach.call(ov.querySelectorAll('.bvbar button'),function(b){b.addEventListener('pointerdown',function(e){e.stopPropagation();});});
    function esc(e){if(e.key==='Escape'){ov.remove();document.removeEventListener('keydown',esc);}}
    document.addEventListener('keydown',esc);
    if(window.Motion){try{Motion.animate(ov,{opacity:[0,1]},{duration:.25});}catch(_){/**/}}
    show(cur);
  });
};
addEventListener('DOMContentLoaded',function(){
  if(window.SturijCommands)window.SturijCommands.push({group:'Go to',label:'News',keywords:['feed','updates'],run:function(){location.href='news.html';}});
  window.SturijCommands.push({group:'Create',label:'Stock image gallery',keywords:['stock','images','reuse','browse','3d'],run:function(){location.href='collection.html';}});
  window.SturijCommands.push({group:'Create',label:'3D board viewer',keywords:['grain','board','specimen','code','materials'],run:function(){window.openBoardViewer();}});
  if(document.getElementById('modal'))window.SturijCommands.push({group:'Create',label:'Studio tools',keywords:['surface','options','settings','floor','walls'],run:function(){if(window.openStudioTools)window.openStudioTools();}});
  document.querySelectorAll('[data-board3d]').forEach(function(b){b.addEventListener('click',function(){window.openBoardViewer(b.getAttribute('data-board3d')||null);});});
});
})();
