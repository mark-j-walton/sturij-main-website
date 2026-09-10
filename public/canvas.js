/* Sturij Canvas — endless composable whiteboard. State: sturij.canvas.board */
(function(){
'use strict';
var el=function(id){return document.getElementById(id);};
var world=el('world'),plane=el('plane');
var PROJS_KEY='sturij.canvas.projects';
var projs=[];try{projs=JSON.parse(localStorage.getItem(PROJS_KEY)||'[]');}catch(e){}
if(!projs.length)projs=[{id:'p1',name:'Project 1'}];
var curP=localStorage.getItem('sturij.canvas.curproj')||projs[0].id;
if(!projs.some(function(q){return q.id===curP;}))curP=projs[0].id;
var KEY='sturij.canvas.board.'+curP;
/* migrate the legacy single-board key: move (not copy), and never die on quota */
if(curP==='p1'&&!localStorage.getItem(KEY)&&localStorage.getItem('sturij.canvas.board')){
  try{localStorage.setItem(KEY,localStorage.getItem('sturij.canvas.board'));localStorage.removeItem('sturij.canvas.board');}
  catch(e){KEY='sturij.canvas.board';}
}
var LIBKEY='sturij.canvas.lib.'+curP;
var view={x:60,y:40,z:1};
var items=[]; // {id,type:'img'|'swatch'|'note',x,y,w,h,src?,hex?,name?,text?,z}
var zTop=1,fTop=10000; /* furniture floats in its own band above plan/wall surfaces */
var FONTS={serif:'"Source Serif 4",serif',sans:'"Helvetica Neue",system-ui,sans-serif',mono:'"IBM Plex Mono",monospace'};
var hist=[],redoS=[];
function doUndo(){if(!hist.length){toast('Nothing to undo');return;}redoS.push(JSON.stringify(items));restore(hist.pop());toast('Undone');}
function doRedo(){if(!redoS.length){toast('Nothing to redo');return;}hist.push(JSON.stringify(items));restore(redoS.pop());toast('Redone');}
function pushHist(){hist.push(JSON.stringify(items));if(hist.length>60)hist.shift();redoS.length=0;}
function restore(s){items=JSON.parse(s);plane.innerHTML='';drawLayer=null;zTop=1;window._wTop=-9000;
  items.forEach(function(q){delete q._placing;if(q.type==='wall')window._wTop=Math.max(window._wTop,q.z||-9000);else if(q.type==='furn'||q.type==='pin')fTop=Math.max(fTop,q.z||10000);else zTop=Math.max(zTop,q.z||1);render(q);});
  updateCtx();qsave();}
function nodeFor(q){return plane.querySelector('.citem[data-id="'+q.id+'"]');}
function cardFill(c){return c.hex?'background:'+c.hex:"background-image:url('"+c.src+"')";}
function stackHTML(it){
  var n=it.cards.length,ix=Math.max(0,Math.min(it.ix||0,n-1));it.ix=ix;
  var h='<div class="inner stackinner">';
  /* two peek cards behind */
  for(var k=Math.min(2,n-1);k>=1;k--){var pc=it.cards[(ix+k)%n];
    h+='<div class="stkpeek" style="'+cardFill(pc)+';transform:translate('+(k*7)+'px,'+(k*7)+'px) rotate('+(k*1.6)+'deg);opacity:'+(1-k*.25)+'"></div>';}
  h+='<div class="stkface" style="'+cardFill(it.cards[ix])+'"></div>'
    +'<div class="cn stkn"><span class="stknm" contenteditable="true" spellcheck="false">'+(it.name||'Stack')+'</span><span class="stkct">'+(ix+1)+'/'+n+'</span></div>'
    +'<button class="stknav stkl" title="Previous">\u2039</button><button class="stknav stkr" title="Next">\u203a</button></div>';
  return h;
}
function stackStep(it,dir){
  var n=it.cards.length;it.ix=((it.ix||0)+dir+n)%n;
  var d=nodeFor(it);if(!d)return;
  d.innerHTML=stackHTML(it);wireStack(d,it);
  var f=d.querySelector('.stkface');
  if(f&&window.Motion&&!document.body.classList.contains('rmotion')){try{Motion.animate(f,{x:[dir*26,0],rotate:[dir*2.5,0],opacity:[0,1]},{type:'spring',stiffness:340,damping:30});}catch(_){/**/}}
  qsave();
}
function wireStack(d,it){
  var l=d.querySelector('.stkl'),r=d.querySelector('.stkr'),nm=d.querySelector('.stknm');
  [l,r].forEach(function(b){b.addEventListener('pointerdown',function(e){e.stopPropagation();});});
  l.onclick=function(e){e.stopPropagation();stackStep(it,-1);};
  r.onclick=function(e){e.stopPropagation();stackStep(it,1);};
  nm.addEventListener('pointerdown',function(e){e.stopPropagation();});
  nm.addEventListener('blur',function(){it.name=nm.textContent.trim()||'Stack';qsave();});
  nm.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();nm.blur();}});
  /* horizontal swipe on the face browses */
  var sx0=null,handled=false;
  d.addEventListener('pointerdown',function(e){if(e.target.closest('.stknav,.stknm,.rs'))return;sx0=e.clientX;handled=false;});
  d.addEventListener('pointermove',function(e){
    if(sx0==null||handled)return;
    var dx=e.clientX-sx0;
    if(Math.abs(dx)>56){handled=true;stackStep(it,dx<0?1:-1);sx0=null;}
  });
  d.addEventListener('pointerup',function(){sx0=null;});
}
function stackTargetAt(it){
  /* the topmost swatch or stack whose face overlaps this swatch's centre */
  var cx=it.x+it.w/2,cy=it.y+it.h/2,best=null;
  items.forEach(function(q){
    if(q===it||q.hiddenPage)return;
    if(q.type!=='swatch'&&q.type!=='stack')return;
    if(cx<q.x||cx>q.x+q.w||cy<q.y||cy>q.y+q.h)return;
    if(!best||(q.z||0)>(best.z||0))best=q;
  });
  return best;
}
function asCard(q){return {hex:q.hex||null,src:q.src||null,name:q.name||''};}
function mergeIntoStack(drag,target){
  pushHist();
  if(target.type==='stack'){target.cards.push(asCard(drag));target.ix=target.cards.length-1;}
  else{
    /* two swatches become a stack in the target's frame */
    target.type='stack';target.cards=[asCard(target),asCard(drag)];target.ix=1;target.name=target.name&&drag.name?'':(target.name||'');target.name=target.name||'Stack';
    delete target.hex;delete target.src;
  }
  items.splice(items.indexOf(drag),1);
  var dn=nodeFor(drag);if(dn)dn.remove();
  var tn=nodeFor(target);if(tn){tn.className='citem stack'+(tn.classList.contains('sel')?' sel':'');tn.innerHTML=stackHTML(target);wireStack(tn,target);}
  qsave();toast((target.name||'Stack')+' \u00b7 '+target.cards.length+' swatches \u2014 \u2039 \u203a or swipe to browse');
}
function unstackOne(it){
  if(it.type!=='stack')return;
  pushHist();
  var c=it.cards.splice(it.ix||0,1)[0];it.ix=Math.max(0,(it.ix||0)-1);
  var nw={type:'swatch',hex:c.hex,src:c.src,name:c.name,x:it.x+it.w+18,y:it.y,w:it.w,h:it.h};
  if(it.cards.length===1){ /* collapse back to a plain swatch */
    var last=it.cards[0];it.type='swatch';it.hex=last.hex;it.src=last.src;it.name=last.name;delete it.cards;delete it.ix;
    var n0=nodeFor(it);if(n0){var sel0=n0.classList.contains('sel');var d0=render(it);n0.replaceWith(d0);if(sel0)d0.classList.add('sel');}
  } else {var n1=nodeFor(it);if(n1){n1.innerHTML=stackHTML(it);wireStack(n1,it);}}
  add(nw);qsave();
}
function selItems(){var out=[];document.querySelectorAll('.citem.sel').forEach(function(n){items.forEach(function(q){if(q.id===n.dataset.id)out.push(q);});});return out;}

function toast(m){var t=el('toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('on');},2200);}
var boardBg=null;
function applyBg(){world.style.setProperty('--board-bg',boardBg||'#FAF8F3');}
function save(){try{localStorage.setItem(KEY,JSON.stringify({v:1,view:view,items:items,bg:boardBg}));}catch(e){toast('Board too big to save — remove a photo');}}
var _sv=null;function qsave(){clearTimeout(_sv);_sv=setTimeout(save,500);}
function applyView(){plane.style.transform='translate('+view.x+'px,'+view.y+'px) scale('+view.z+')';}

/* ---------- items ---------- */
function render(it){
  if(it.docked||it.dockedTo||it.hiddenPage)return null;
  var d=document.createElement('div');d.className='citem '+(it.type==='note'?'bnote':it.type)+(it.locked?' locked':'');d.dataset.id=it.id;
  d.style.cssText='left:'+it.x+'px;top:'+it.y+'px;width:'+it.w+'px;height:'+it.h+'px;z-index:'+(it.z||1);
  if(it.type==='plan')d.innerHTML='<div class="inner plancard'+(inkFor(it.frameHex)==='light'?' inklight':'')+'"'+(it.frameHex?' style="background:'+it.frameHex+'"':'')+'><div class="rvhd"><span>'+(it.name||'Floor plan')+' \u00b7 '+(polygonArea(it.verts)/1e6).toFixed(1)+' m\u00b2</span><span class="whctl"><button class="wpb" data-a="wset">Walls</button><button class="wpb pbtn" data-kind="door">Door</button><button class="wpb pbtn" data-kind="window">Window</button><button class="wpb parm" data-m="iw">+ Wall</button><button class="wpb parm" data-m="zone">Zone</button></span></div><div class="planface">'+planSVG(it)+'</div></div>';
  else if(it.type==='room')d.innerHTML='<div class="inner roomcard"><div class="rvhd"><span>'+(it.name||'Live view')+'</span><button class="rvmin" title="Minimise"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><path d="M5 12h14"/></svg></button></div><div class="rvface">'+roomSVG(it)+'</div></div>';
  else if(it.type==='wall')d.innerHTML='<div class="inner wallcard'+(inkFor(it.frameHex)==='light'?' inklight':'')+'" style="'+(it.frameHex?'background:'+it.frameHex:'')+'"><div class="rvhd"><span>'+(it.name||'Wall')+' \u00b7 v'+(it.ver||1)+(it.pages&&it.pages.length>1?' \u00b7 p'+((it.pg||0)+1):'')+'</span><span class="whctl">'+(it.pages&&it.pages.length>1?'<button class="wpg" data-d="-1" title="Previous page">\u2039</button><button class="wpg" data-d="1" title="Next page">\u203a</button>':'')+'<button class="wpadd" title="Add a page">+</button><button class="rvmin wmin" title="Dock to doc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><path d="M5 12h14"/></svg></button></span></div><div class="wface" style="background:'+(it.hex||'#F0EDE8')+'"></div></div>';
  else if(it.type==='img')d.innerHTML='<div class="inner imgcard"><img src="'+it.src+'" alt=""><div class="cn">'+(it.name||'')+'</div></div>';
  else if(it.type==='stack')d.innerHTML=stackHTML(it);
  else if(it.type==='swatch')d.innerHTML='<div class="inner"><div class="fill" style="'+(it.hex?'background:'+it.hex:"background-image:url('"+it.src+"')")+'"></div><div class="cn">'+(it.name||'')+'</div>'+(it.approved?'<span class="okb" title="Approved"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="11" height="11"><path d="M4 12l6 6L20 6"/></svg></span>':'')+'</div>';
  else if(it.type==='furn')d.innerHTML='<div class="inner furncard"'+(it.rot?' style="transform:rotate('+it.rot+'deg)"':'')+'>'+furnSVG(it.furn,it.w,it.h)+'<div class="fmeta">'+(it.name||'').toUpperCase()+' \u00b7 '+Math.round(it.w*10)+' \u00d7 '+Math.round(it.h*10)+'</div></div>';
  else if(it.type==='pin')d.innerHTML='<div class="inner pincard">'+pinSVG((it.photos||[]).length)+'</div>';
  else if(it.type==='text')d.innerHTML='<div class="inner tinner"><div class="body" contenteditable="true" style="font-family:'+FONTS[it.font||'serif']+';font-size:'+(it.size||28)+'px"></div></div>';
  else d.innerHTML='<div class="inner"><div class="body" contenteditable="true"></div></div>';
  d.innerHTML+='<button class="cx" title="Remove" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="rs" title="Resize"></span>';
  if(it.type==='note'||it.type==='text'){var b=d.querySelector('.body');b.textContent=it.text||'';
    /* drag anywhere on the note; typing only once it's focused (double-click to edit) */
    b.addEventListener('pointerdown',function(e){if(document.activeElement===b)e.stopPropagation();});
    b.addEventListener('dblclick',function(e){e.stopPropagation();b.focus();});
    b.addEventListener('input',function(){it.text=b.textContent;qsave();});}
  d.querySelector('.cx').addEventListener('click',function(e){e.stopPropagation();if(it.locked)return;pushHist();items=items.filter(function(q){return q!==it;});d.remove();updateCtx();qsave();});
  /* drag: selection model (shift adds), group move, lock respected */
  d.addEventListener('pointerdown',function(e){
    if(e.target.closest('.cx'))return;
    e.stopPropagation();
    var wasSel=d.classList.contains('sel');
    if(e.shiftKey){d.classList.toggle('sel');updateCtx();if(!d.classList.contains('sel'))return;}
    else if(!wasSel){document.querySelectorAll('.citem.sel').forEach(function(n){n.classList.remove('sel');});d.classList.add('sel');}
    updateCtx();
    if(it.locked&&it.type!=='wall')return; /* locked walls: drag + resize allowed */
    if(it.type==='wall'){it.z=(window._wTop=(window._wTop||-9000)+1);d.style.zIndex=it.z;}
    else if(it.type==='furn'||it.type==='pin'){it.z=++fTop;d.style.zIndex=it.z;}
    else{it.z=++zTop;d.style.zIndex=zTop;}
    var rs=e.target.closest('.rs');
    var pre=JSON.stringify(items);
    var group=selItems().filter(function(q){return !q.locked;});
    if(group.indexOf(it)<0)group=[it];
    if(it.type==='wall'&&it.locked){
      group=[it].concat(items.filter(function(q){return q!==it&&q.type!=='wall'&&!q.locked&&q.x<it.x+it.w&&q.x+q.w>it.x&&q.y<it.y+it.h&&q.y+q.h>it.y;}));
    }
    var starts=group.map(function(q){return {q:q,x:q.x,y:q.y};});
    var sx=e.clientX,sy=e.clientY,ow=it.w,oh=it.h,moved=false,rsRaf=0;
    try{d.setPointerCapture(e.pointerId);}catch(_){}
    function mv(ev){
      var dx=(ev.clientX-sx)/view.z,dy=(ev.clientY-sy)/view.z;
      if(Math.abs(dx)>2||Math.abs(dy)>2)moved=true;
      if(rs){
        if(it.type==='wall'){
          /* export proportions: 3:2 max frame. Width free up to MAXW; height caps at the proportional height for the current width */
          var MAXW=1680,MAXH=1120;
          it.w=Math.max(240,Math.min(MAXW,ow+dx));
          it.h=Math.max(180,Math.min(it.w*MAXH/MAXW,oh+dy));
        }else{
          /* everything else resizes proportionally from its corner */
          var k=Math.max((ow+dx)/ow,(oh+dy)/oh);
          it.w=Math.max(70,ow*k);it.h=Math.max(54,oh*k);
        }
        if(rsRaf)return;rsRaf=requestAnimationFrame(function(){rsRaf=0;
          d.style.width=it.w+'px';d.style.height=it.h+'px';
          if(it.type==='plan')d.querySelector('.planface').innerHTML=planSVG(it);
          if(it.type==='room'){var rf=d.querySelector('.rvface');if(rf)rf.innerHTML=roomSVG(it);}
        });}
      else{starts.forEach(function(s){s.q.x=s.x+dx;s.q.y=s.y+dy;var n=nodeFor(s.q);if(n){n.style.left=s.q.x+'px';n.style.top=s.q.y+'px';}});}
    }
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
      if(moved){hist.push(pre);if(hist.length>60)hist.shift();redoS.length=0;qsave();
        if(!rs&&it.type==='swatch'&&group.length===1){var tgt=stackTargetAt(it);if(tgt)mergeIntoStack(it,tgt);}
      }}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
    e.preventDefault();
  });
  if(it.type==='plan'){wirePlan(d,it);applyCardGrid(d,it);}
  if(it.type==='stack')wireStack(d,it);
  if(it.type==='pin'){var _px0,_py0;
    d.addEventListener('pointerdown',function(e){_px0=e.clientX;_py0=e.clientY;});
    d.addEventListener('pointerup',function(e){if(Math.abs(e.clientX-_px0)<5&&Math.abs(e.clientY-_py0)<5)openPin(it);});}
  if(it.type==='wall'){
    var wm=d.querySelector('.wmin');
    wm.addEventListener('pointerdown',function(e){e.stopPropagation();});
    wm.addEventListener('click',function(e){e.stopPropagation();dockWall(it);});
    var pa=d.querySelector('.wpadd');
    pa.addEventListener('pointerdown',function(e){e.stopPropagation();});
    pa.addEventListener('click',function(e){e.stopPropagation();
      it.pages=it.pages||[[]];
      /* current page contents = overlapping items; stash their ids then hide */
      var cur=wallItems(it).map(function(q){return q.id;});
      it.pages[it.pg||0]=cur;
      cur.forEach(function(id){var q=items.filter(function(p){return p.id===id;})[0];if(q){q.hiddenPage=true;var n2=nodeFor(q);if(n2)n2.style.display='none';}});
      it.pages.push([]);it.pg=it.pages.length-1;
      rerender(it);qsave();toast((it.name||'Wall')+' \u2014 page '+(it.pg+1));});
    [].forEach.call(d.querySelectorAll('.wpg'),function(bt){
      bt.addEventListener('pointerdown',function(e){e.stopPropagation();});
      bt.addEventListener('click',function(e){e.stopPropagation();wallGoPage(it,(it.pg||0)+ +bt.getAttribute('data-d'));});
    });
  }
  if(it.type==='room'){
    if(it.min)d.classList.add('min');
    var mb=d.querySelector('.rvmin');
    mb.addEventListener('pointerdown',function(e){e.stopPropagation();});
    mb.addEventListener('click',function(e){e.stopPropagation();
      it.min=!it.min;d.classList.toggle('min',it.min);
      if(it.min){it.hFull=it.h;it.h=46;}else{it.h=it.hFull||340;}
      d.style.height=it.h+'px';qsave();});
  }
  plane.appendChild(d);
  return d;
}
function add(it){pushHist();it.id=it.id||('c'+Date.now()+Math.random().toString(36).slice(2,6));it.z=(it.type==='wall')?(window._wTop=(window._wTop||-9000)+1):((it.type==='furn'||it.type==='pin')?++fTop:++zTop);items.push(it);
  if(it.type==='img'&&it.src&&it.src.length>400000)compressImg(it.src,function(small){it.src=small;var n0=nodeFor(it);if(n0){var im0=n0.querySelector('img');if(im0)im0.src=small;}qsave();libAdd(small,it.name);});
  else if(it.type==='img'&&it.src)libAdd(it.src,it.name);
  render(it);qsave();return it;}
function centre(){var r=world.getBoundingClientRect();return {x:(r.width/2-view.x)/view.z,y:(r.height/2-view.y)/view.z};}

/* ---------- pan & zoom ---------- */
var pinching=false,pin=null;
world.addEventListener('touchstart',function(e){
  if(e.touches.length===2){
    pinching=true;e.preventDefault();
    var t1=e.touches[0],t2=e.touches[1];
    pin={d:Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY),
         mx:(t1.clientX+t2.clientX)/2,my:(t1.clientY+t2.clientY)/2,
         z:view.z,x:view.x,y:view.y};
  }
},{passive:false});
world.addEventListener('touchmove',function(e){
  if(!pinching||e.touches.length<2||!pin)return;
  e.preventDefault();
  var t1=e.touches[0],t2=e.touches[1];
  var d2=Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);
  var mx2=(t1.clientX+t2.clientX)/2,my2=(t1.clientY+t2.clientY)/2;
  var r=world.getBoundingClientRect();
  var nz=Math.max(.02,Math.min(12,pin.z*d2/Math.max(pin.d,1)));
  var wx=(pin.mx-r.left-pin.x)/pin.z,wy=(pin.my-r.top-pin.y)/pin.z;
  view.z=nz;
  view.x=(mx2-r.left)-wx*nz;view.y=(my2-r.top)-wy*nz;
  applyView();
},{passive:false});
world.addEventListener('touchend',function(e){
  if(pinching&&e.touches.length<2){pinching=false;pin=null;qsave();}
});
world.addEventListener('pointerdown',function(e){
  if(drawMode){
    e.stopPropagation();e.preventDefault();
    if(world.setPointerCapture)try{world.setPointerCapture(e.pointerId);}catch(_){/**/}
    var p=drawPt(e),raw=[p],traced=false,base=drawVerts.slice();
    function rawPt(ev){var r=world.getBoundingClientRect();return [((ev.clientX-r.left-view.x)/view.z)*MMPP,((ev.clientY-r.top-view.y)/view.z)*MMPP];}
    function tm(ev){
      var q=rawPt(ev),lq=raw[raw.length-1];
      if(Math.hypot(q[0]-lq[0],q[1]-lq[1])<80)return;
      raw.push(q);
      if(raw.length>3)traced=true;
      if(traced){drawVerts=base.concat(rdp(raw,220));renderDraw(q);}
    }
    function tu(){
      document.removeEventListener('pointermove',tm);document.removeEventListener('pointerup',tu);
      if(!traced){ /* a tap: corner mode as before */
        drawVerts=base;
        if(drawVerts.length>=3){var f=drawVerts[0];if(Math.hypot(p[0]-f[0],p[1]-f[1])<220){endDraw(true);return;}}
        drawVerts.push(p);renderDraw(p);return;
      }
      var simp=base.concat(rdp(raw,220)).map(function(v){return [Math.round(v[0]/50)*50,Math.round(v[1]/50)*50];});
      /* drop the closing point if the finger came back near the start */
      if(simp.length>3){var f2=simp[0],l2=simp[simp.length-1];
        if(Math.hypot(l2[0]-f2[0],l2[1]-f2[1])<500){simp.pop();drawVerts=simp;endDraw(true);return;}}
      drawVerts=simp;renderDraw(null);
      toast('Keep tracing or tapping \u2014 tap the first corner to close');
    }
    document.addEventListener('pointermove',tm);document.addEventListener('pointerup',tu);
    return;
  }
  if(e.target.closest('.citem'))return;
  if(e.shiftKey){startMarquee(e);return;}
  document.querySelectorAll('.citem.sel').forEach(function(n){n.classList.remove('sel');});
  updateCtx();
  world.classList.add('panning');
  var sx=e.clientX,sy=e.clientY,ox=view.x,oy=view.y;
  function mv(ev){if(pinching)return;view.x=ox+ev.clientX-sx;view.y=oy+ev.clientY-sy;applyView();}
  function up(){world.classList.remove('panning');document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);qsave();}
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
});
world.addEventListener('dblclick',function(e){if(!e.target.closest('.citem')&&!drawMode)openPalette(null);});
world.addEventListener('wheel',function(e){
  e.preventDefault();
  var r=world.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  var nz=Math.max(.02,Math.min(12,view.z*(e.deltaY<0?1.08:0.925)));
  view.x=mx-(mx-view.x)*nz/view.z;view.y=my-(my-view.y)*nz/view.z;view.z=nz;
  applyView();qsave();
},{passive:false});

/* ---------- photos: button, drop, paste ---------- */
function addImageFile(f,at){
  if(!f||f.type.indexOf('image/')!==0)return;
  var rd=new FileReader();
  rd.onload=function(){
    var im=new Image();
    im.onload=function(){
      var w=Math.min(420,im.width),h=w*im.height/im.width;
      var p=at||centre();
      add({type:'img',src:rd.result,x:p.x-w/2,y:p.y-h/2,w:w,h:h});
    };
    im.src=rd.result;
  };
  rd.readAsDataURL(f);
}
el('cvUpload').onclick=function(){el('cvFile').click();};
el('cvFile').addEventListener('change',function(){[].forEach.call(this.files,function(f,i){addImageFile(f);});this.value='';});
world.addEventListener('dragover',function(e){e.preventDefault();world.classList.add('dropping');});
world.addEventListener('dragleave',function(){world.classList.remove('dropping');});
world.addEventListener('drop',function(e){
  e.preventDefault();world.classList.remove('dropping');
  var r=world.getBoundingClientRect();
  var at={x:(e.clientX-r.left-view.x)/view.z,y:(e.clientY-r.top-view.y)/view.z};
  [].forEach.call(e.dataTransfer.files,function(f){addImageFile(f,at);});
});
document.addEventListener('paste',function(e){
  [].forEach.call((e.clipboardData||{}).items||[],function(itm){
    if(itm.type.indexOf('image/')===0)addImageFile(itm.getAsFile());
  });
});

/* ---------- floor plan: geometry ported verbatim from sturij-visualiser (plan.ts / polygon.ts) ---------- */
var MMPP=12; // mm per board px at z=1
function snapDrawPoint(mm,drawVerts){
  var p=[mm[0],mm[1]];
  if(drawVerts.length>0){
    var last=drawVerts[drawVerts.length-1];
    var dx=p[0]-last[0],dy=p[1]-last[1],len=Math.hypot(dx,dy);
    if(len>10){var ang=Math.atan2(dy,dx),k=Math.round(ang/(Math.PI/4))*(Math.PI/4);
      if(Math.abs(ang-k)<0.16)p=[last[0]+len*Math.cos(k),last[1]+len*Math.sin(k)];}
  }
  return [Math.round(p[0]/50)*50,Math.round(p[1]/50)*50];
}
function polygonArea(v){var a=0;for(var i=0;i<v.length;i++){var p=v[i],q=v[(i+1)%v.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a)/2;}
/* polygon helpers — ported verbatim from sturij-visualiser/src/geometry/polygon.ts */
var WALL_T=100;
function wallA(v,i){return v[i];}function wallB(v,i){return v[(i+1)%v.length];}
function wallLen(v,i){var a=wallA(v,i),b=wallB(v,i);return Math.hypot(b[0]-a[0],b[1]-a[1]);}
function wallDir(v,i){var a=wallA(v,i),b=wallB(v,i),l=wallLen(v,i)||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];}
function pointInPoly(p,v){var inside=false,n=v.length;for(var i=0,j=n-1;i<n;j=i++){var xi=v[i][0],yi=v[i][1],xj=v[j][0],yj=v[j][1];if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
function wallNormals(v,i){var a=wallA(v,i),b=wallB(v,i),d=wallDir(v,i),nIn=[-d[1],d[0]];
  var mid=[(a[0]+b[0])/2+nIn[0]*30,(a[1]+b[1])/2+nIn[1]*30];
  if(!pointInPoly(mid,v))nIn=[d[1],-d[0]];
  return {dIr:d,nIn:nIn,nOut:[-nIn[0],-nIn[1]]};}
function wallPoint(v,i,pos){var a=wallA(v,i),d=wallDir(v,i);return [a[0]+d[0]*pos,a[1]+d[1]*pos];}
function posOnWall(v,i,mm){var a=wallA(v,i),d=wallDir(v,i);return (mm[0]-a[0])*d[0]+(mm[1]-a[1])*d[1];}
function planBaseFor(it){
  var v=it.verts,minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  v.forEach(function(q){minX=Math.min(minX,q[0]);minY=Math.min(minY,q[1]);maxX=Math.max(maxX,q[0]);maxY=Math.max(maxY,q[1]);});
  var pad=560,w=Math.round(it.w),h=Math.round(it.h);
  var bw=maxX-minX+2*pad,bh=maxY-minY+2*pad,s=Math.min(w/bw,h/bh);
  return {s:s,ox:(w-bw*s)/2-(minX-pad)*s,oy:(h-bh*s)/2-(minY-pad)*s,w:w,h:h};
}
function planSVG(it){
  var verts=it.verts,ops=it.openings||[],base=planBaseFor(it),w=base.w,h=base.h;
  var T=it.wallT||100,n=verts.length,st=it.wallStyle||'solid';
  function colFor(i){return (it.wallCols&&it.wallCols[i])||it.wallHex||'#9a9284';}
  /* mitred outer offsets: intersect adjacent offset lines so corners join */
  var offs=[],k;
  for(k=0;k<n;k++){var ak=wallA(verts,k),nk=wallNormals(verts,k).nOut;offs.push({p:[ak[0]+nk[0]*T,ak[1]+nk[1]*T],d:wallDir(verts,k),nOut:nk});}
  var O=[];
  for(k=0;k<n;k++){var e1=offs[(k-1+n)%n],e2=offs[k],cr=e1.d[0]*e2.d[1]-e1.d[1]*e2.d[0];
    if(Math.abs(cr)<1e-9)O.push(e2.p.slice());
    else{var tI=((e2.p[0]-e1.p[0])*e2.d[1]-(e2.p[1]-e1.p[1])*e2.d[0])/cr;O.push([e1.p[0]+e1.d[0]*tI,e1.p[1]+e1.d[1]*tI]);}}
  function S(p){return [base.ox+p[0]*base.s,base.oy+p[1]*base.s];}
  function path(q){return 'M '+q.map(function(p){var sp=S(p);return sp[0].toFixed(1)+' '+sp[1].toFixed(1);}).join(' L ')+' Z';}
  var svg='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:100%;display:block">';
  var defs='';
  if(it.floorSrc)defs+='<pattern id="flp'+it.id+'" patternUnits="userSpaceOnUse" width="140" height="140"><image href="'+it.floorSrc+'" width="140" height="140" preserveAspectRatio="xMidYMid slice"/></pattern>';
  if(st==='hatch'){var seenC={};for(k=0;k<n;k++){var hc=colFor(k);if(seenC[hc])continue;seenC[hc]=1;
    defs+='<pattern id="hp'+it.id+hc.replace(/[^a-zA-Z0-9]/g,'')+'" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#FAF8F3"/><line x1="0" y1="0" x2="0" y2="7" stroke="'+hc+'" stroke-width="1.6"/></pattern>';}}
  var gf=it.gridFloor;
  if(gf&&gf.a){var gsp=(gf.sp||500)*base.s;
    defs+='<pattern id="gr'+it.id+'" width="'+gsp+'" height="'+gsp+'" patternUnits="userSpaceOnUse"><path d="M '+gsp+' 0 L 0 0 0 '+gsp+'" fill="none" stroke="'+gridColFor(it.floorHex,gf.a)+'" stroke-width="1"/></pattern>';}
  if(defs)svg+='<defs>'+defs+'</defs>';
  svg+='<path d="'+path(verts)+'" fill="'+(it.floorSrc?('url(#flp'+it.id+')'):(it.floorHex||'#efece5'))+'" stroke="rgba(35,31,27,.08)"/>';
  if(gf&&gf.a)svg+='<path d="'+path(verts)+'" fill="url(#gr'+it.id+')" pointer-events="none"/>';
  /* zones: coloured sections with a centred watermark title */
  (it.zones||[]).forEach(function(z,zi){
    var p1=S([z.x,z.y]),zw=z.w*base.s,zh=z.h*base.s;
    svg+='<g data-zone="'+zi+'" style="cursor:pointer"><rect x="'+p1[0]+'" y="'+p1[1]+'" width="'+zw+'" height="'+zh+'" fill="'+(z.hex||'#D4A01B')+'" fill-opacity=".16" stroke="'+(z.hex||'#D4A01B')+'" stroke-opacity=".5" stroke-width="1" stroke-dasharray="6 4"/>';
    if(z.name)svg+='<text x="'+(p1[0]+zw/2)+'" y="'+(p1[1]+zh/2+4)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="'+Math.max(10,Math.min(15,zw/12))+'" letter-spacing="2.5" fill="rgba(29,29,27,.3)" pointer-events="none">'+z.name.toUpperCase()+'</text>';
    svg+='</g>';});
  if(it._tmpZone){var tz=it._tmpZone,tp=S([tz.x,tz.y]);svg+='<rect x="'+tp[0]+'" y="'+tp[1]+'" width="'+(tz.w*base.s)+'" height="'+(tz.h*base.s)+'" fill="rgba(212,160,27,.12)" stroke="#D4A01B" stroke-width="1" stroke-dasharray="5 4" pointer-events="none"/>';}
  /* internal walls */
  (it.inWalls||[]).forEach(function(iw,ii){
    var d2=[iw.b[0]-iw.a[0],iw.b[1]-iw.a[1]],L2=Math.hypot(d2[0],d2[1])||1;d2=[d2[0]/L2,d2[1]/L2];
    var nn=[-d2[1],d2[0]],t2=(iw.t||100)/2;
    var q=[[iw.a[0]+nn[0]*t2,iw.a[1]+nn[1]*t2],[iw.b[0]+nn[0]*t2,iw.b[1]+nn[1]*t2],[iw.b[0]-nn[0]*t2,iw.b[1]-nn[1]*t2],[iw.a[0]-nn[0]*t2,iw.a[1]-nn[1]*t2]];
    svg+='<path data-iw="'+ii+'" d="'+path(q)+'" fill="'+(iw.hex||'#9a9284')+'" stroke="rgba(35,31,27,.3)" stroke-width="1" style="cursor:pointer"/>';
    var zm=S([(iw.a[0]+iw.b[0])/2+nn[0]*(t2+300),(iw.a[1]+iw.b[1])/2+nn[1]*(t2+300)]);
    svg+='<text x="'+zm[0]+'" y="'+(zm[1]+3)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#9a9284" pointer-events="none">'+Math.round(L2)+'</text>';});
  if(it._tmpWall){var tw=it._tmpWall,ta=S(tw.a),tb=S(tw.b);svg+='<line x1="'+ta[0]+'" y1="'+ta[1]+'" x2="'+tb[0]+'" y2="'+tb[1]+'" stroke="#D4A01B" stroke-width="3" stroke-dasharray="6 4" pointer-events="none"/>';}
  var i;
  for(i=0;i<verts.length;i++){
    var a=wallA(verts,i),b=wallB(verts,i),nOut=wallNormals(verts,i).nOut;
    var wc=colFor(i),fill,strk;
    if(st==='hatch'){fill='url(#hp'+it.id+wc.replace(/[^a-zA-Z0-9]/g,'')+')';strk=wc;}
    else if(st==='lines'){fill='#FAF8F3';strk=wc==='#9a9284'?'#1D1D1D':wc;}
    else{fill=wc;strk='rgba(35,31,27,.3)';}
    svg+='<path data-wall="'+i+'" d="'+path([a,b,O[(i+1)%n],O[i]])+'" fill="'+fill+'" stroke="'+strk+'" stroke-width="1.1" stroke-linejoin="miter" style="cursor:pointer"/>';
    var len=Math.round(wallLen(verts,i));
    var mid=[(a[0]+b[0])/2+nOut[0]*(T+430),(a[1]+b[1])/2+nOut[1]*(T+430)],sm=S(mid);
    svg+='<text x="'+sm[0]+'" y="'+(sm[1]+4)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10.5" fill="#6b6358" pointer-events="none">W'+(i+1)+' · '+len+'</text>';
  }
  /* segment dims: wall · opening · wall */
  for(i=0;i<verts.length;i++){
    var wOps=ops.filter(function(o){return o.wall===i;}).sort(function(x,y){return x.pos-y.pos;});
    if(!wOps.length)continue;
    var nO=wallNormals(verts,i).nOut,L=wallLen(verts,i),marks=[],cur=0;
    wOps.forEach(function(o){if(o.pos-cur>1)marks.push([cur,o.pos,false]);marks.push([o.pos,o.pos+o.width,true]);cur=o.pos+o.width;});
    if(L-cur>1)marks.push([cur,L,false]);
    marks.forEach(function(mk){
      var m=wallPoint(verts,i,(mk[0]+mk[1])/2),p=S([m[0]+nO[0]*(T+200),m[1]+nO[1]*(T+200)]);
      svg+='<text x="'+p[0]+'" y="'+(p[1]+3)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="'+(mk[2]?'#1D1D1D':'#9a9284')+'" stroke="#faf8f2" stroke-width="2.5" paint-order="stroke" pointer-events="none">'+Math.round(mk[1]-mk[0])+'</text>';});
  }
  /* openings: doors paper + swing arc, windows teal */
  ops.forEach(function(op){
    var a=wallPoint(verts,op.wall,op.pos),b=wallPoint(verts,op.wall,op.pos+op.width);
    var ns=wallNormals(verts,op.wall),nOut=ns.nOut,nIn=ns.nIn;
    var isDoor=op.type==='door';
    var g='<g data-op="'+op.id+'" style="cursor:grab">';
    g+='<path d="'+path([a,b,[b[0]+nOut[0]*T,b[1]+nOut[1]*T],[a[0]+nOut[0]*T,a[1]+nOut[1]*T]])+'" fill="'+(isDoor?'#faf8f2':'#5b8a9a')+'" stroke="'+(isDoor?'rgba(35,31,27,.4)':'#3f6472')+'" stroke-width="1.5"/>';
    if(isDoor){
      var sA=S(a),sB=S(b),wpx=op.width*base.s;
      var leaf=[sA[0]+nIn[0]*wpx,sA[1]+nIn[1]*wpx];
      var cross=nIn[0]*(sB[1]-sA[1])-nIn[1]*(sB[0]-sA[0]),sweep=cross>0?1:0;
      g+='<path d="M '+sA[0].toFixed(1)+' '+sA[1].toFixed(1)+' L '+leaf[0].toFixed(1)+' '+leaf[1].toFixed(1)+' A '+wpx.toFixed(1)+' '+wpx.toFixed(1)+' 0 0 '+sweep+' '+sB[0].toFixed(1)+' '+sB[1].toFixed(1)+'" fill="none" stroke="#6b6358" stroke-width="1.2" stroke-dasharray="5 4" pointer-events="none"/>';
    }
    g+='</g>';svg+=g;
  });
  Object.keys(it.wallNotes||{}).forEach(function(kk){
    var nt=it.wallNotes[kk];if(!nt)return;
    var i2=+kk,aa=wallA(verts,i2),bb=wallB(verts,i2),no=wallNormals(verts,i2).nOut;
    var mp=S([(aa[0]+bb[0])/2+no[0]*(T+760),(aa[1]+bb[1])/2+no[1]*(T+760)]);
    svg+='<g data-note="'+kk+'" style="cursor:pointer"><circle cx="'+mp[0]+'" cy="'+mp[1]+'" r="8" fill="'+(nt.open?'#D4A01B':'#FAF8F3')+'" stroke="#D4A01B" stroke-width="1.4"/><text x="'+mp[0]+'" y="'+(mp[1]+3.5)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10" font-weight="600" fill="'+(nt.open?'#1D1D1D':'#D4A01B')+'" pointer-events="none">!</text></g>';
  });
  var cen=[0,0];verts.forEach(function(q){cen[0]+=q[0];cen[1]+=q[1];});cen=[cen[0]/verts.length,cen[1]/verts.length];
  var sc2=S(cen);
  svg+='<text x="'+sc2[0]+'" y="'+(sc2[1]+4)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" letter-spacing="1.5" fill="#D4A01B" pointer-events="none">'+(polygonArea(verts)/1e6).toFixed(1)+' M²</text>';
  svg+='</svg>';
  return svg;
}
function shadeRGB(hex,f){var c=parseInt((hex||'#FDFCF8').slice(1),16),r=(c>>16)&255,g=(c>>8)&255,b=c&255;return [Math.round(r*(1-f)),Math.round(g*(1-f)),Math.round(b*(1-f))];}
function gridColFor(hex,a){
  var pale=!hex||['#fdfcf8','#ffffff','#faf8f3'].indexOf((hex||'').toLowerCase())>=0;
  var rgb=pale?[168,165,158]:shadeRGB(hex,0.35);
  return 'rgba('+rgb.join(',')+','+a+')';}
function applyCardGrid(d,it){
  var card=d.querySelector('.plancard');if(!card)return;
  var g=it.gridCard;
  if(!g||!g.a){card.style.backgroundImage='';return;}
  var col=gridColFor(it.frameHex,g.a),sp=g.sp||40;
  card.style.backgroundImage='repeating-linear-gradient(0deg,'+col+' 0 1px,transparent 1px '+sp+'px),repeating-linear-gradient(90deg,'+col+' 0 1px,transparent 1px '+sp+'px)';}
function planNotes(d,it){
  var face=d.querySelector('.planface');if(!face)return;
  face.querySelectorAll('.pnote').forEach(function(q){q.remove();});
  var verts=it.verts,T=it.wallT||100,base=planBaseFor(it);
  Object.keys(it.wallNotes||{}).forEach(function(kk){
    var nt=it.wallNotes[kk];if(!nt||!nt.open)return;
    var i2=+kk,aa=wallA(verts,i2),bb=wallB(verts,i2),no=wallNormals(verts,i2).nOut;
    var x=base.ox+((aa[0]+bb[0])/2+no[0]*(T+760))*base.s,y=base.oy+((aa[1]+bb[1])/2+no[1]*(T+760))*base.s;
    var el=document.createElement('div');el.className='pnote';
    el.style.left=Math.min(72,Math.max(2,x/base.w*100+2))+'%';el.style.top=Math.min(74,Math.max(2,y/base.h*100+2))+'%';
    el.innerHTML='<div class="pnh"><span>W'+(i2+1)+'</span><button class="pnx">\u00d7</button></div><div class="pnb" contenteditable="true"></div>';
    el.querySelector('.pnb').textContent=nt.text||'';
    el.addEventListener('pointerdown',function(e){e.stopPropagation();});
    el.querySelector('.pnb').addEventListener('input',function(){nt.text=el.querySelector('.pnb').textContent;qsave();});
    el.querySelector('.pnx').addEventListener('click',function(){nt.open=false;face.innerHTML=planSVG(it);planNotes(d,it);qsave();});
    face.appendChild(el);
  });
}
/* opening interactions on a plan card: arm door/window, tap a wall to place (centred, clamped), drag along the wall */
function wirePlan(d,it){
  var face=d.querySelector('.planface');
  function refresh(){face.innerHTML=planSVG(it);planNotes(d,it);}
  planNotes(d,it);
  face.addEventListener('dblclick',function(e){
    var iwEl=e.target.closest('[data-iw]');
    if(iwEl){e.stopPropagation();e.preventDefault();
      it.inWalls.splice(+iwEl.getAttribute('data-iw'),1);refresh();qsave();toast('Internal wall removed');return;}
    var opEl=e.target.closest('[data-op]');if(!opEl)return;
    e.stopPropagation();e.preventDefault();
    var id=+opEl.getAttribute('data-op');
    var op=(it.openings||[]).filter(function(o){return o.id===id;})[0];
    it.openings=(it.openings||[]).filter(function(o){return o.id!==id;});
    refresh();qsave();toast((op&&op.type==='door'?'Door':'Window')+' removed');
  });
  function toMM2(ev){var base=planBaseFor(it),rect=face.querySelector('svg').getBoundingClientRect();
    var lx=(ev.clientX-rect.left)/rect.width*base.w,ly=(ev.clientY-rect.top)/rect.height*base.h;
    return [(lx-base.ox)/base.s,(ly-base.oy)/base.s];}
  function snapMM(p){
    var xs=[],ys=[];it.verts.forEach(function(v){xs.push(v[0]);ys.push(v[1]);});
    (it.inWalls||[]).forEach(function(w2){xs.push(w2.a[0],w2.b[0]);ys.push(w2.a[1],w2.b[1]);});
    var x=p[0],y=p[1];
    xs.forEach(function(v){if(Math.abs(v-x)<150)x=v;});ys.forEach(function(v){if(Math.abs(v-y)<150)y=v;});
    return [Math.round(x/50)*50,Math.round(y/50)*50];}
  face.addEventListener('pointerdown',function(e){
    if(it._mode==='iw'){e.stopPropagation();e.preventDefault();
      var a0=snapMM(toMM2(e));
      function mvW(ev){var b0=snapMM(toMM2(ev));
        if(Math.abs(b0[0]-a0[0])>Math.abs(b0[1]-a0[1]))b0[1]=a0[1];else b0[0]=a0[0]; /* ortho */
        it._tmpWall={a:a0,b:b0};refresh();}
      function upW(ev){document.removeEventListener('pointermove',mvW);document.removeEventListener('pointerup',upW);
        var t3=it._tmpWall;delete it._tmpWall;
        if(t3&&Math.hypot(t3.b[0]-t3.a[0],t3.b[1]-t3.a[1])>200){it.inWalls=it.inWalls||[];it.inWalls.push({a:t3.a,b:t3.b,t:it.wallT||100});toast('Internal wall added \u2014 click it to colour, double-click to remove');}
        it._mode=null;d.querySelectorAll('.parm').forEach(function(q){q.classList.remove('on');});refresh();qsave();}
      document.addEventListener('pointermove',mvW);document.addEventListener('pointerup',upW);return;}
    if(it._mode==='zone'){e.stopPropagation();e.preventDefault();
      var z0=snapMM(toMM2(e));
      function mvZ(ev){var z1=snapMM(toMM2(ev));
        it._tmpZone={x:Math.min(z0[0],z1[0]),y:Math.min(z0[1],z1[1]),w:Math.abs(z1[0]-z0[0]),h:Math.abs(z1[1]-z0[1])};refresh();}
      function upZ(ev){document.removeEventListener('pointermove',mvZ);document.removeEventListener('pointerup',upZ);
        var t4=it._tmpZone;delete it._tmpZone;
        if(t4&&t4.w>300&&t4.h>300){it.zones=it.zones||[];it.zones.push({x:t4.x,y:t4.y,w:t4.w,h:t4.h,hex:'#D4A01B',name:'Zone '+(it.zones.length+1)});toast('Section added \u2014 click it to name and colour');}
        it._mode=null;d.querySelectorAll('.parm').forEach(function(q){q.classList.remove('on');});refresh();qsave();}
      document.addEventListener('pointermove',mvZ);document.addEventListener('pointerup',upZ);return;}
    var iwEl=e.target.closest('[data-iw]');
    if(iwEl){e.stopPropagation();e.preventDefault();
      it._paintIwIdx=+iwEl.getAttribute('data-iw');openPalette(it);return;}
    var znEl=e.target.closest('[data-zone]');
    if(znEl){e.stopPropagation();e.preventDefault();openZoneEditor(+znEl.getAttribute('data-zone'),e);return;}
    var ntEl=e.target.closest('[data-note]');
    if(ntEl){e.stopPropagation();e.preventDefault();
      var nk=ntEl.getAttribute('data-note');
      it.wallNotes[nk].open=!it.wallNotes[nk].open;refresh();qsave();return;}
    var opEl=e.target.closest('[data-op]');
    if(opEl){
      e.stopPropagation();
      var op=(it.openings||[]).filter(function(o){return o.id===+opEl.getAttribute('data-op');})[0];
      if(!op)return;
      var base=planBaseFor(it),rect=face.querySelector('svg').getBoundingClientRect();
      function toMM(ev){var lx=(ev.clientX-rect.left)/rect.width*base.w,ly=(ev.clientY-rect.top)/rect.height*base.h;return [(lx-base.ox)/base.s,(ly-base.oy)/base.s];}
      var grab=posOnWall(it.verts,op.wall,toMM(e))-op.pos;
      function mv(ev){var pos=posOnWall(it.verts,op.wall,toMM(ev))-grab;
        op.pos=Math.round(Math.max(0,Math.min(wallLen(it.verts,op.wall)-op.width,pos)));refresh();}
      var moved=false,sx0=e.clientX,sy0=e.clientY;
      var mv2=function(ev){if(Math.abs(ev.clientX-sx0)>4||Math.abs(ev.clientY-sy0)>4)moved=true;mv(ev);};
      function up(ev){document.removeEventListener('pointermove',mv2);document.removeEventListener('pointerup',up);qsave();
        if(!moved)openEditor(op,ev);}
      document.addEventListener('pointermove',mv2);document.addEventListener('pointerup',up);
      e.preventDefault();return;
    }
    var wallEl=e.target.closest('[data-wall]');
    if(wallEl&&!it._placing){
      e.stopPropagation();
      openWallEditor(+wallEl.getAttribute('data-wall'),e);return;
    }
    if(wallEl&&it._placing){
      e.stopPropagation();e.preventDefault();
      var i=+wallEl.getAttribute('data-wall');
      var base2=planBaseFor(it),rect2=face.querySelector('svg').getBoundingClientRect();
      var lx=(e.clientX-rect2.left)/rect2.width*base2.w,ly=(e.clientY-rect2.top)/rect2.height*base2.h;
      var mm=[(lx-base2.ox)/base2.s,(ly-base2.oy)/base2.s];
      var isDoor=it._placing==='door',width=isDoor?750:1000;
      var pos=Math.max(0,Math.min(wallLen(it.verts,i)-width,posOnWall(it.verts,i,mm)-width/2));
      it.openings=it.openings||[];it._nextOp=it._nextOp||1;
      it.openings.push({id:it._nextOp++,type:it._placing,wall:i,pos:Math.round(pos),width:width,height:isDoor?2000:1000,sill:isDoor?0:900});
      it._placing=null;d.querySelectorAll('.pbtn').forEach(function(b){b.classList.remove('on');});
      refresh();qsave();toast((isDoor?'Door':'Window')+' placed on W'+(i+1)+' — drag it along the wall');
      return;
    }
  });
  function openEditor(op,ev){
    var old=d.querySelector('.oped');if(old)old.remove();
    var pop=document.createElement('div');pop.className='oped';
    var isDoor=op.type==='door';
    pop.innerHTML='<div class="oh">'+(isDoor?'Door':'Window')+' · W'+(op.wall+1)+'</div>'
      +'<label>Width <input type="number" step="50" data-f="width" value="'+op.width+'"></label>'
      +'<label>Height <input type="number" step="50" data-f="height" value="'+op.height+'"></label>'
      +(isDoor?'':'<label>Sill <input type="number" step="50" data-f="sill" value="'+(op.sill==null?900:op.sill)+'"></label>')
      +'<div class="oprow"><button class="orm">Remove</button><button class="ook">Done</button></div>';
    pop.style.left=Math.max(4,Math.min(it.w-170,(ev.clientX-d.getBoundingClientRect().left)-80))+'px';
    pop.addEventListener('pointerdown',function(e2){e2.stopPropagation();});
    pop.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('input',function(){
        var v=Math.max(50,Math.round((+inp.value||0)/50)*50);
        op[inp.getAttribute('data-f')]=v;
        if(inp.getAttribute('data-f')==='width')op.pos=Math.max(0,Math.min(wallLen(it.verts,op.wall)-op.width,op.pos));
        refresh();qsave();
      });});
    pop.querySelector('.orm').onclick=function(){it.openings=it.openings.filter(function(o){return o!==op;});pop.remove();refresh();qsave();toast((isDoor?'Door':'Window')+' removed');};
    pop.querySelector('.ook').onclick=function(){pop.remove();};
    d.appendChild(pop);
  }
  var ws=d.querySelector('[data-a="wset"]');
  if(ws){ws.addEventListener('pointerdown',function(e){e.stopPropagation();});
    ws.addEventListener('click',function(e){e.stopPropagation();
      var ex=d.querySelector('.wpop');if(ex){ex.remove();return;}
      var pop=document.createElement('div');pop.className='wpop';
      pop.innerHTML='<div class="wpr"><span>Width</span><span><input type="number" min="50" max="400" step="10" value="'+(it.wallT||100)+'"> mm</span></div>'
        +'<div class="wpr"><span>Style</span><span class="wseg">'+['solid','hatch','lines'].map(function(s){return '<button data-s="'+s+'" class="'+((it.wallStyle||'solid')===s?'on':'')+'">'+(s==='hatch'?'Hatched':s==='lines'?'Lines':'Solid')+'</button>';}).join('')+'</span></div>'
        +'<div class="wpr"><span>Card grid</span><span class="wgc"><input type="number" data-g="csp" min="10" max="200" step="5" value="'+((it.gridCard&&it.gridCard.sp)||40)+'"><input type="range" data-g="ca" min="0" max="0.8" step="0.05" value="'+((it.gridCard&&it.gridCard.a)||0)+'"></span></div>'
        +'<div class="wpr"><span>Floor grid</span><span class="wgc"><input type="number" data-g="fsp" min="100" max="2000" step="100" value="'+((it.gridFloor&&it.gridFloor.sp)||500)+'"><input type="range" data-g="fa" min="0" max="0.8" step="0.05" value="'+((it.gridFloor&&it.gridFloor.a)||0)+'"></span></div>'
        +'<div class="wpr"><button class="wall-all">Colour all walls\u2026</button></div>';
      pop.addEventListener('pointerdown',function(e2){e2.stopPropagation();});
      pop.querySelector('input').addEventListener('input',function(){it.wallT=Math.max(50,Math.min(400,+this.value||100));refresh();qsave();});
      pop.querySelectorAll('[data-s]').forEach(function(b2){b2.addEventListener('click',function(){it.wallStyle=b2.getAttribute('data-s');pop.querySelectorAll('[data-s]').forEach(function(q){q.classList.toggle('on',q===b2);});refresh();qsave();});});
      pop.querySelectorAll('[data-g]').forEach(function(gi){gi.addEventListener('input',function(){
        it.gridCard=it.gridCard||{sp:40,a:0};it.gridFloor=it.gridFloor||{sp:500,a:0};
        var gk=gi.getAttribute('data-g'),v=+gi.value;
        if(gk==='csp')it.gridCard.sp=v;else if(gk==='ca')it.gridCard.a=v;
        else if(gk==='fsp')it.gridFloor.sp=v;else if(gk==='fa')it.gridFloor.a=v;
        applyCardGrid(d,it);refresh();qsave();});});
      pop.querySelector('.wall-all').addEventListener('click',function(){pop.remove();delete it._paintWallIdx;openPalette(it);});
      d.appendChild(pop);
    });}
  d.querySelectorAll('.pbtn').forEach(function(b){
    b.addEventListener('pointerdown',function(e){e.stopPropagation();});
    b.addEventListener('click',function(e){
      e.stopPropagation();
      var kind=b.getAttribute('data-kind');
      it._mode=null;d.querySelectorAll('.parm').forEach(function(q){q.classList.remove('on');});
      it._placing=(it._placing===kind)?null:kind;
      d.querySelectorAll('.pbtn').forEach(function(q){q.classList.toggle('on',q===b&&!!it._placing);});
      toast(it._placing?('Tap a wall to place the '+kind):'Placement cancelled');
    });
  });
  d.querySelectorAll('.parm').forEach(function(b){
    b.addEventListener('pointerdown',function(e){e.stopPropagation();});
    b.addEventListener('click',function(e){e.stopPropagation();
      var m=b.getAttribute('data-m');
      it._placing=null;d.querySelectorAll('.pbtn').forEach(function(q){q.classList.remove('on');});
      it._mode=(it._mode===m)?null:m;
      d.querySelectorAll('.parm').forEach(function(q){q.classList.toggle('on',q===b&&!!it._mode);});
      toast(it._mode==='iw'?'Drag on the plan to draw an internal wall':it._mode==='zone'?'Drag on the plan to mark a section':'Cancelled');
    });
  });
  function openWallEditor(wi,ev){
    var old=d.querySelector('.oped');if(old)old.remove();
    var pop=document.createElement('div');pop.className='oped';
    pop.innerHTML='<div class="oh">W'+(wi+1)+'</div><label>Length <input type="number" step="50" data-f="len" value="'+Math.round(wallLen(it.verts,wi))+'"></label>'
      +'<div class="oprow"><button class="ozc">Colour\u2026</button><button class="ook">Done</button></div>';
    pop.style.left=Math.max(4,Math.min(it.w-190,(ev.clientX-d.getBoundingClientRect().left)-90))+'px';
    pop.addEventListener('pointerdown',function(e2){e2.stopPropagation();});
    pop.querySelector('[data-f="len"]').addEventListener('change',function(){
      var nl=Math.max(300,Math.round((+this.value||0)/50)*50),ol=wallLen(it.verts,wi);
      var dd=wallDir(it.verts,wi),dl=nl-ol,vi=(wi+1)%it.verts.length;
      it.verts[vi]=[it.verts[vi][0]+dd[0]*dl,it.verts[vi][1]+dd[1]*dl];
      refresh();qsave();toast('W'+(wi+1)+' \u2192 '+nl+'mm');
    });
    pop.querySelector('.ozc').onclick=function(){pop.remove();it._paintWallIdx=wi;openPalette(it);};
    pop.querySelector('.ook').onclick=function(){pop.remove();};
    d.appendChild(pop);
  }
  function openZoneEditor(zi,ev){
    var z=it.zones[zi];var old=d.querySelector('.oped');if(old)old.remove();
    var pop=document.createElement('div');pop.className='oped';
    pop.innerHTML='<div class="oh">Section</div><label>Name <input type="text" data-f="name" value="'+(z.name||'')+'"></label>'
      +'<div class="oprow"><button class="ozc">Colour\u2026</button><button class="orm">Remove</button><button class="ook">Done</button></div>';
    pop.style.left=Math.max(4,Math.min(it.w-190,(ev.clientX-d.getBoundingClientRect().left)-90))+'px';
    pop.addEventListener('pointerdown',function(e2){e2.stopPropagation();});
    pop.querySelector('[data-f="name"]').addEventListener('input',function(){z.name=this.value;refresh();qsave();});
    pop.querySelector('.ozc').onclick=function(){pop.remove();it._paintZoneIdx=zi;openPalette(it);};
    pop.querySelector('.orm').onclick=function(){it.zones.splice(zi,1);pop.remove();refresh();qsave();};
    pop.querySelector('.ook').onclick=function(){pop.remove();};
    d.appendChild(pop);
  }
}
var drawMode=false,drawVerts=[],drawLayer=null;
function rdp(pts,eps){ /* Ramer\u2013Douglas\u2013Peucker: keeps only real direction changes */
  if(pts.length<3)return pts.slice();
  var keep=new Uint8Array(pts.length);keep[0]=1;keep[pts.length-1]=1;
  var st2=[[0,pts.length-1]];
  while(st2.length){
    var sg=st2.pop(),lo=sg[0],hi=sg[1];
    var ax=pts[lo][0],ay=pts[lo][1],dx=pts[hi][0]-ax,dy=pts[hi][1]-ay;
    var len=Math.hypot(dx,dy)||1e-9,worst=-1,wd=eps;
    for(var i=lo+1;i<hi;i++){
      var d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/len;
      if(d>wd){wd=d;worst=i;}}
    if(worst>0){keep[worst]=1;st2.push([lo,worst],[worst,hi]);}
  }
  var out=[];for(var j=0;j<pts.length;j++)if(keep[j])out.push(pts[j]);
  return out;
}
function drawPt(e){var r=world.getBoundingClientRect();return snapDrawPoint([((e.clientX-r.left-view.x)/view.z)*MMPP,((e.clientY-r.top-view.y)/view.z)*MMPP],drawVerts);}
function renderDraw(cur){
  if(!drawLayer){drawLayer=document.createElement('div');drawLayer.className='drawlayer';plane.appendChild(drawLayer);}
  var pts=drawVerts.map(function(v){return (v[0]/MMPP)+','+(v[1]/MMPP);});
  if(cur)pts.push((cur[0]/MMPP)+','+(cur[1]/MMPP));
  var minX=0,minY=0,maxX=100,maxY=100;
  drawLayer.innerHTML='<svg style="position:absolute;left:-50000px;top:-50000px;width:100000px;height:100000px;overflow:visible" viewBox="-50000 -50000 100000 100000">'
    +'<polyline points="'+pts.join(' ')+'" fill="none" stroke="#D4A01B" stroke-width="'+(2/view.z)+'" stroke-dasharray="'+(6/view.z)+' '+(4/view.z)+'"/>'
    +drawVerts.map(function(v){return '<circle cx="'+(v[0]/MMPP)+'" cy="'+(v[1]/MMPP)+'" r="'+(4/view.z)+'" fill="#D4A01B"/>';}).join('')
    +(cur&&drawVerts.length?'<text x="'+(cur[0]/MMPP+10/view.z)+'" y="'+(cur[1]/MMPP-10/view.z)+'" font-family="IBM Plex Mono,monospace" font-size="'+(12/view.z)+'" fill="#62584F">'+Math.round(Math.hypot(cur[0]-drawVerts[drawVerts.length-1][0],cur[1]-drawVerts[drawVerts.length-1][1]))+'mm</text>':'')
    +'</svg>';
}
function endDraw(commit){
  drawMode=false;world.classList.remove('drawing');el('cvHint').textContent='Drag to pan · scroll to zoom · drop photos anywhere';
  if(drawLayer){drawLayer.remove();drawLayer=null;}
  if(commit&&drawVerts.length>=3){
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    drawVerts.forEach(function(v){minX=Math.min(minX,v[0]);minY=Math.min(minY,v[1]);maxX=Math.max(maxX,v[0]);maxY=Math.max(maxY,v[1]);});
    var w=Math.max(180,(maxX-minX)/MMPP+80),h=Math.max(140,(maxY-minY)/MMPP+80);
    add({type:'plan',verts:drawVerts.slice(),openings:[],x:minX/MMPP-40,y:minY/MMPP-40,w:w,h:h});
    toast('Floor plan placed · '+(polygonArea(drawVerts)/1e6).toFixed(1)+' m²');
  }
  drawVerts=[];
}
el('cvPlan').onclick=function(){
  if(drawMode){endDraw(drawVerts.length>=3);return;}
  drawMode=true;drawVerts=[];world.classList.add('drawing');
  el('cvHint').textContent='Tap corners one by one, or drag to trace the whole room in one stroke · close at the first corner · Esc cancels';
  toast('Draw your room — wall by wall');
};
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&drawMode){endDraw(false);return;}
  var editing=e.target&&(e.target.isContentEditable||/INPUT|TEXTAREA/.test(e.target.tagName));
  if((e.ctrlKey||e.metaKey)&&!editing){
    var k=e.key.toLowerCase();
    if(k==='z'&&!e.shiftKey){doUndo();e.preventDefault();return;}
    if(k==='y'||(k==='z'&&e.shiftKey)){doRedo();e.preventDefault();return;}
    if(k==='d'){if(selItems().length){duplicateSel();e.preventDefault();}return;}
  }
  if((e.key==='Delete'||e.key==='Backspace')&&!editing){
    var g2=selItems().filter(function(q){return !q.locked;});
    if(g2.length){pushHist();g2.forEach(function(q){items=items.filter(function(p){return p!==q;});var n=nodeFor(q);if(n)n.remove();});updateCtx();qsave();e.preventDefault();}
  }
});
world.addEventListener('pointermove',function(e){if(drawMode)renderDraw(drawPt(e));});
/* ---------- live-view room cards (the visualiser treatment) ---------- */
function shade(hex,f){var n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(r*f);g=Math.round(g*f);b=Math.round(b*f);
  return 'rgb('+r+','+g+','+b+')';}
function roomSVG(it){
  var W=100,H=70,cT=H*0.09,bx1=W*0.21,by1=H*0.30,bx2=W*0.79,by2=H*0.86,sk=H*0.028;
  var wall=it.wallHex||'#D9CBD2',ceil=it.ceilHex||'#EFECE2',side=shade(wall,0.88);
  var ln='rgba(35,31,27,.16)';
  function P(pts){return pts.map(function(p){return p[0].toFixed(2)+','+p[1].toFixed(2);}).join(' ');}
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:100%;display:block">';
  if(it.floorSrc)s+='<defs><pattern id="rfp'+it.id+'" patternUnits="userSpaceOnUse" width="26" height="26"><image href="'+it.floorSrc+'" width="26" height="26" preserveAspectRatio="xMidYMid slice"/></pattern></defs>';
  s+='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="'+ceil+'"/>';
  s+='<polygon points="'+P([[0,H],[bx1,by2],[bx2,by2],[W,H]])+'" fill="'+(it.floorSrc?('url(#rfp'+it.id+')'):(it.floorHex||'#E6E1D3'))+'"/>';
  s+='<polygon points="'+P([[0,cT],[bx1,by1],[bx1,by2],[0,H]])+'" fill="'+side+'" stroke="'+ln+'" stroke-width=".4"/>';
  s+='<polygon points="'+P([[W,cT],[bx2,by1],[bx2,by2],[W,H]])+'" fill="'+side+'" stroke="'+ln+'" stroke-width=".4"/>';
  s+='<rect x="'+bx1+'" y="'+by1+'" width="'+(bx2-bx1)+'" height="'+(by2-by1)+'" fill="'+wall+'" stroke="'+ln+'" stroke-width=".4"/>';
  s+='<rect x="'+bx1+'" y="'+(by2-sk)+'" width="'+(bx2-bx1)+'" height="'+sk+'" fill="'+(it.skirtHex||'#F2EFE7')+'"/>';
  s+='<polygon points="'+P([[0,cT],[W,cT],[bx2,by1],[bx1,by1]])+'" fill="'+ceil+'" stroke="'+ln+'" stroke-width=".4"/>';
  s+='</svg>';
  return s;
}
el('cvRoom').onclick=function(){
  var p=centre();
  add({type:'room',x:p.x-230,y:p.y-170,w:460,h:340,name:'Live view'});
  toast('Live view added — select it, then tap swatches: paint colours the walls, textures lay the floor');
};
/* ---------- walls ---------- */
el('cvWall').onclick=function(){
  docModal('Name this wall \u2014 v1 doc is created with it','Wall '+(items.filter(function(q){return q.type==='wall';}).length+1),function(nm){
    var c=centre();
    add({type:'wall',name:nm,ver:1,pages:[[]],pg:0,x:c.x-420,y:c.y-280,w:840,h:560});
    toast(nm+' \u00b7 v1 \u2014 doc created');
  });
};
/* ---------- notes ---------- */
el('cvNote').onclick=function(){
  var p=centre();
  var it=add({type:'note',x:p.x-80,y:p.y-70,w:160,h:140,text:''});
  var n=plane.querySelector('.citem[data-id="'+it.id+'"] .body');if(n)setTimeout(function(){n.focus();},50);
};

/* ---------- type tool ---------- */
el('cvText').onclick=function(){
  var p=centre();
  var it=add({type:'text',x:p.x-150,y:p.y-32,w:300,h:64,text:'',font:'serif',size:28});
  var n=plane.querySelector('.citem[data-id="'+it.id+'"] .body');if(n)setTimeout(function(){n.focus();},50);
};
/* ---------- context bar ---------- */
var ctx=el('ctxbar');
ctx.addEventListener('pointerdown',function(e){e.stopPropagation();});
function updateCtx(){
  var g=selItems();
  ctx.classList.toggle('on',g.length>0);
  if(!g.length)return;
  var allLocked=g.every(function(q){return q.locked;});
  ctx.querySelector('[data-a="lock"]').textContent=allLocked?'Unlock':'Lock';
  var isText=g.length===1&&g[0].type==='text';
  ctx.querySelector('.tctl').style.display=isText?'flex':'none';
  var imgs=g.filter(function(q){return q.type==='img';}),sws=g.filter(function(q){return q.type==='swatch';});
  ctx.querySelector('[data-a="enh"]').style.display=(imgs.length===1&&g.length===1)?'':'none';
  ctx.querySelector('[data-a="vis"]').style.display=(sws.length>=1&&g.length>=2)?'':'none';
  ctx.querySelector('[data-a="tovis"]').style.display=(g.length===1&&g[0].type==='plan')?'':'none';
  ctx.querySelector('[data-a="dock"]').style.display=(g.length===1&&g[0].type==='wall')?'':'none';
  ctx.querySelector('[data-a="pub"]').style.display=(g.length===1&&g[0].type==='wall')?'':'none';
  ctx.querySelector('[data-a="unstk"]').style.display=(g.length===1&&g[0].type==='stack')?'':'none';
  ctx.querySelector('[data-a="saver"]').style.display=(g.length>=1&&g.length<=3&&g.every(function(q){return q.type==='img'&&q.src;}))?'':'none';
  ctx.querySelector('[data-a="rot"]').style.display=(g.length&&g.every(function(q){return q.type==='furn';}))?'':'none';
  ctx.querySelector('[data-a="fdim"]').style.display=(g.length===1&&g[0].type==='furn')?'':'none';
  ctx.querySelector('[data-a="pal"]').style.display=(g.length===1&&(g[0].type==='wall'||g[0].type==='room'||g[0].type==='plan'))?'':'none';
  ctx.querySelector('[data-a="frame"]').style.display=(g.length===1&&(g[0].type==='wall'||g[0].type==='plan'))?'':'none';
  var swsel=g.filter(function(q){return q.type==='swatch';});
  var apBtn=ctx.querySelector('[data-a="appr"]');
  apBtn.style.display=(swsel.length&&swsel.length===g.length)?'':'none';
  apBtn.textContent=swsel.length&&swsel.every(function(q){return q.approved;})?'Unapprove':'Approve';
  ctx.querySelector('[data-a="restyle"]').style.display=(imgs.length===1&&sws.length>=1)?'':'none';
  ctx.querySelector('[data-a="export"]').textContent=(g.length===1&&g[0].type==='wall')?'Export wall':'Export';
}
function duplicateSel(){
  var g=selItems();if(!g.length)return;
  document.querySelectorAll('.citem.sel').forEach(function(n){n.classList.remove('sel');});
  g.forEach(function(q){
    var c=JSON.parse(JSON.stringify(q));c.id=null;c.locked=false;c.x+=28;c.y+=28;
    if(q.type==='wall'){c.ver=(q.ver||1)+1;toast((c.name||'Wall')+' \u2014 now working on v'+c.ver);}
    c=add(c);var n=nodeFor(c);if(n)n.classList.add('sel');
  });
  updateCtx();toast(g.length>1?g.length+' items duplicated':'Duplicated');
}
ctx.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]');if(!b)return;
  var a=b.getAttribute('data-a'),g=selItems();if(!g.length)return;
  if(a==='lock'){pushHist();var to=!g.every(function(q){return q.locked;});
    g.forEach(function(q){q.locked=to;var n=nodeFor(q);if(n)n.classList.toggle('locked',to);});
    updateCtx();qsave();toast(to?'Locked — it will hold still':'Unlocked');}
  else if(a==='front'||a==='back'){pushHist();
    g.forEach(function(q){var n=nodeFor(q);
      if(q.type==='wall'){
        if(a==='front')q.z=(window._wTop=(window._wTop||-9000)+1);
        else{var mn=-9000;items.forEach(function(p){if(p.type==='wall')mn=Math.min(mn,p.z||0);});q.z=mn-1;}
      }else if(q.type==='furn'||q.type==='pin'){
        if(a==='front')q.z=++fTop;
        else{var mnF=1e9;items.forEach(function(p){if(p.type==='furn'||p.type==='pin')mnF=Math.min(mnF,p.z||10000);});q.z=Math.max(10000,mnF-1);}
      }else{
        if(a==='front')q.z=++zTop;
        else{var mn2=1e9;items.forEach(function(p){if(p.type!=='wall'&&p.type!=='furn')mn2=Math.min(mn2,p.z||1);});q.z=Math.max(1,mn2-1);}
      }
      if(n)n.style.zIndex=q.z;});
    qsave();}
  else if(a==='dup')duplicateSel();
  else if(a==='enh'){var im1=g.filter(function(q){return q.type==='img';})[0];if(im1)aiEnhance(im1);}
  else if(a==='vis')visualiseSel(g);
  else if(a==='fdim'){var fq=g[0],fn=nodeFor(fq);
    var oldP=fn.querySelector('.oped');if(oldP){oldP.remove();}
    else{var popF=document.createElement('div');popF.className='oped';
      popF.innerHTML='<div class="oh">'+(fq.name||'Piece')+'</div><label>Length <input type="number" step="50" data-f="w" value="'+Math.round(fq.w*10)+'"></label><label>Depth <input type="number" step="50" data-f="h" value="'+Math.round(fq.h*10)+'"></label><div class="oprow"><button class="ook">Done</button></div>';
      popF.addEventListener('pointerdown',function(e2){e2.stopPropagation();});
      popF.querySelectorAll('input').forEach(function(inp){inp.addEventListener('input',function(){
        var v=Math.max(100,+inp.value||100)/10;fq[inp.getAttribute('data-f')]=v;
        fn.style.width=fq.w+'px';fn.style.height=fq.h+'px';
        var inn=fn.querySelector('.inner');inn.innerHTML=furnSVG(fq.furn,fq.w,fq.h)+'<div class="fmeta">'+(fq.name||'').toUpperCase()+' \u00b7 '+Math.round(fq.w*10)+' \u00d7 '+Math.round(fq.h*10)+'</div>';qsave();});});
      popF.querySelector('.ook').onclick=function(){popF.remove();};
      fn.appendChild(popF);}}
  else if(a==='rot'){pushHist();g.forEach(function(q){q.rot=((q.rot||0)+90)%360;var n2=nodeFor(q);if(n2)n2.querySelector('.inner').style.transform=q.rot?'rotate('+q.rot+'deg)':'';});qsave();}
  else if(a==='pal')openPalette(g[0]);
  else if(a==='frame'){g[0]._paintFrame=true;openPalette(g[0]);}
  else if(a==='dock')dockWall(g[0]);
  else if(a==='pub')publishWall(g[0]);
  else if(a==='appr'){pushHist();var to2=!g.every(function(q){return q.approved;});
    g.forEach(function(q){q.approved=to2;var n=nodeFor(q);if(n){var ok=n.querySelector('.okb');if(to2&&!ok){var sp=document.createElement('span');sp.className='okb';sp.title='Approved';sp.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="11" height="11"><path d="M4 12l6 6L20 6"/></svg>';n.querySelector('.inner').appendChild(sp);}else if(!to2&&ok)ok.remove();}});
    renderDock();qsave();toast(to2?'Approved \u2014 added to the approved doc':'Approval removed');}
  else if(a==='unstk'){unstackOne(g[0]);toast('Top swatch lifted out of the stack');}
  else if(a==='saver'){
    try{localStorage.setItem('sturij-saver-rooms',JSON.stringify(g.map(function(q){return q.src;})));}catch(e){toast('Images too large to store');return;}
    toast(g.length+' image'+(g.length===1?'':'s')+' set as the screensaver backdrop \u2014 select none and use Background \u203a Screensaver to reset');
  }
  else if(a==='tovis'){var pl3=g[0];
    var payload=btoa(unescape(encodeURIComponent(JSON.stringify({verts:pl3.verts,openings:pl3.openings||[],H:2400,t:100}))));
    window.open('https://sturij.vercel.app/#/visualiser?plan='+payload,'_blank');
    toast('Opening the visualiser with this plan');}
  else if(a==='restyle'){var im2=g.filter(function(q){return q.type==='img';})[0],sw2=g.filter(function(q){return q.type==='swatch';});if(im2&&sw2.length)restyleMenu(b,im2,sw2);}
  else if(a==='export')exportItems(g);
  else if(a==='del'){pushHist();
    g.filter(function(q){return !q.locked;}).forEach(function(q){items=items.filter(function(p){return p!==q;});var n=nodeFor(q);if(n)n.remove();});
    updateCtx();qsave();}
  else if(a==='font'||a==='sizeup'||a==='sizedn'){
    var t=g[0];if(!t||t.type!=='text')return;
    if(a==='font'){var order=['serif','sans','mono'];t.font=order[(order.indexOf(t.font||'serif')+1)%3];}
    if(a==='sizeup')t.size=Math.min(160,(t.size||28)+4);
    if(a==='sizedn')t.size=Math.max(12,(t.size||28)-4);
    var n3=nodeFor(t),b3=n3&&n3.querySelector('.body');
    if(b3){b3.style.fontFamily=FONTS[t.font];b3.style.fontSize=t.size+'px';}
    qsave();
  }
});
/* ---------- marquee select (shift-drag on empty board) ---------- */
function startMarquee(e){
  var r=world.getBoundingClientRect();
  var mq=document.createElement('div');mq.className='marq';world.appendChild(mq);
  var sx=e.clientX,sy=e.clientY;
  function mv(ev){
    var x1=Math.min(sx,ev.clientX)-r.left,y1=Math.min(sy,ev.clientY)-r.top,
        x2=Math.max(sx,ev.clientX)-r.left,y2=Math.max(sy,ev.clientY)-r.top;
    mq.style.cssText='left:'+x1+'px;top:'+y1+'px;width:'+(x2-x1)+'px;height:'+(y2-y1)+'px';
    mq._b=[(x1-view.x)/view.z,(y1-view.y)/view.z,(x2-view.x)/view.z,(y2-view.y)/view.z];
  }
  function up(){
    document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
    var b=mq._b;mq.remove();
    if(!b)return;
    items.forEach(function(q){
      if(q.x<b[2]&&q.x+q.w>b[0]&&q.y<b[3]&&q.y+q.h>b[1]){var n=nodeFor(q);if(n)n.classList.add('sel');}
    });
    updateCtx();
  }
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  e.preventDefault();
}
/* ---------- swatches from the studio scheme ---------- */
function studioSwatches(){
  var out=[],S=null;
  try{S=JSON.parse(localStorage.getItem('sturij.studio.scheme')||'null');}catch(e){}
  if(!S)return out;
  (S.faves||[]).forEach(function(f){
    if(!f)return;
    if(f.hex)out.push({name:f.n,hex:f.hex});
    else if(f.k==='board'||f.k==='carcass')out.push({name:f.n,src:'showcase/finishes/'+(f.key||f.s)+'.webp'});
    else if(f.img||f.url)out.push({name:f.n,src:f.img||f.url});
  });
  (S.list||[]).forEach(function(g){
    if(!g||!g.it)return;
    var it=g.it;
    if(g.t==='paint'&&it[0])out.push({name:it[0],hex:it[1]});
    else if(it.n)out.push({name:it.n,src:it.img||(it.s?'showcase/finishes/'+it.s+'.webp':null)});
  });
  if(S.fl)out.push({name:S.fl.name,src:S.fl.url});
  var seen={};return out.filter(function(s){if(!s.name||(!s.hex&&!s.src))return false;var k=s.name+(s.hex||s.src);if(seen[k])return false;seen[k]=1;return true;});
}
el('cvSwatches').onclick=function(){
  var t=el('swtray');
  if(t.classList.contains('on')){t.classList.remove('show');setTimeout(function(){t.classList.remove('on');},300);return;}
  var row=el('swrow');row.innerHTML='';
  var sw=studioSwatches();
  if(!sw.length)row.innerHTML='<div class="swempty">No scheme yet — pair materials in the studio first</div>';
  sw.forEach(function(s){
    var c=document.createElement('div');c.className='swcard';
    c.innerHTML='<div class="fill" style="'+(s.hex?'background:'+s.hex:"background-image:url('"+s.src+"')")+'"></div><div class="cn">'+s.name+'</div>';
    c.onclick=function(){
      var rm=document.querySelector('.citem.room.sel');
      if(rm){var r2=null;items.forEach(function(q){if(q.id===rm.dataset.id)r2=q;});
        if(r2){
          if(s.hex){r2.wallHex=s.hex;r2.name=s.name;toast('Walls painted — '+s.name);}
          else{r2.floorSrc=s.src;toast('Floor laid — '+s.name);}
          rm.querySelector('.rvhd span').textContent=r2.name||'Live view';
          rm.querySelector('.rvface').innerHTML=roomSVG(r2);qsave();return;}}
      var pl=document.querySelector('.citem.plan.sel');
      if(pl){var p2=null;items.forEach(function(q){if(q.id===pl.dataset.id)p2=q;});
        if(p2){
          if(s.hex){p2.wallHex=s.hex;toast('Walls painted — '+s.name);}
          else{p2.floorSrc=s.src;toast('Floor laid — '+s.name);}
          pl.querySelector('.planface').innerHTML=planSVG(p2);qsave();return;}}
      var selEl=document.querySelector('.citem.wall.sel');
      if(selEl&&s.hex){var w=null;items.forEach(function(q){if(q.id===selEl.dataset.id)w=q;});
        if(w){w.hex=s.hex;var f=selEl.querySelector('.wface');if(f)f.style.background=s.hex;qsave();toast('Wall painted — '+s.name);return;}}
      var p=centre();add({type:'swatch',x:p.x-70,y:p.y-55,w:140,h:110,hex:s.hex,src:s.src,name:s.name});toast(s.name+' placed');};
    row.appendChild(c);
  });
  t.classList.add('on');requestAnimationFrame(function(){t.classList.add('show');});
};

/* ---------- export: selection (or whole board) at high resolution ---------- */
el('cvExport').onclick=function(){var g=selItems();exportItems(g.length?g:items);};
function exportItems(list){
  if(!list.length){toast('The board is empty');return;}
  renderItems(list,function(cv){
    var a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download=(list.length===1&&list[0].type==='wall'?'sturij-wall':'sturij-board')+'.png';a.click();
    toast('Exported at '+cv.width+' \u00d7 '+cv.height);
  });
}
function renderItems(list,cb){
  var pad=60,minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  list.forEach(function(it){minX=Math.min(minX,it.x);minY=Math.min(minY,it.y);maxX=Math.max(maxX,it.x+it.w);maxY=Math.max(maxY,it.y+it.h);});
  var W0=maxX-minX+pad*2,H0=maxY-minY+pad*2;
  var scale=Math.max(1,Math.min(4,5000/Math.max(W0,H0)));
  var cv=document.createElement('canvas');cv.width=Math.round(W0*scale);cv.height=Math.round(H0*scale);
  var x=cv.getContext('2d');x.scale(scale,scale);
  x.fillStyle='#FAF8F3';x.fillRect(0,0,W0,H0);
  var sorted=list.slice().sort(function(a,b){return (a.z||0)-(b.z||0);});
  var pend=0,fin=false;
  function done(){
    if(pend>0||fin)return;fin=true;cb(cv);
  }
  sorted.forEach(function(it){
    var ix=it.x-minX+pad,iy=it.y-minY+pad;
    if(it.type==='plan'){
      x.fillStyle='#FDFCF8';x.fillRect(ix,iy,it.w,it.h);
      x.fillStyle='#62584F';x.font='500 12px "IBM Plex Mono",monospace';
      x.fillText('FLOOR PLAN \u00b7 '+(polygonArea(it.verts)/1e6).toFixed(1)+' M\u00b2',ix+14,iy+22);
      pend++;
      (function(){var im=new Image();
        im.onload=function(){x.drawImage(im,ix+12,iy+34,it.w-24,it.h-46);pend--;done();};
        im.onerror=function(){pend--;done();};
        im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(planSVG(it).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.round(it.w)+'" height="'+Math.round(it.h)+'" '));})();
    }
    else if(it.type==='room'){
      x.fillStyle='#FDFCF8';x.fillRect(ix,iy,it.w,it.h);
      x.fillStyle='#62584F';x.font='500 12px "IBM Plex Mono",monospace';x.fillText((it.name||'LIVE VIEW').toUpperCase(),ix+14,iy+22);
      pend++;
      (function(){var im=new Image();
        im.onload=function(){x.drawImage(im,ix+12,iy+34,it.w-24,it.h-46);pend--;done();};
        im.onerror=function(){pend--;done();};
        im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(roomSVG(it).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.round(it.w-24)+'" height="'+Math.round(it.h-46)+'" '));})();
    }
    else if(it.type==='pin'){
      x.fillStyle='#D4A01B';x.strokeStyle='#1D1D1D';x.lineWidth=1.5;
      x.beginPath();x.arc(ix+it.w/2,iy+it.h/3,10,0,7);x.fill();x.stroke();
    }
    else if(it.type==='furn'){
      pend++;
      (function(){var im=new Image();
        im.onload=function(){x.save();x.translate(ix+it.w/2,iy+it.h/2);x.rotate((it.rot||0)*Math.PI/180);x.drawImage(im,-it.w/2,-it.h/2,it.w,it.h);x.restore();pend--;done();};
        im.onerror=function(){pend--;done();};
        im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(furnSVG(it.furn,it.w,it.h));})();
    }
    else if(it.type==='wall'){
      x.fillStyle=it.frameHex||'#FDFCF8';x.fillRect(ix,iy,it.w,it.h);
      x.fillStyle='#62584F';x.font='500 12px "IBM Plex Mono",monospace';
      x.fillText(((it.name||'WALL')+' \u00b7 V'+(it.ver||1)).toUpperCase(),ix+14,iy+22);
      x.fillStyle=it.hex||'#F0EDE8';x.fillRect(ix+12,iy+34,it.w-24,it.h-46);}
    else if(it.type==='note'){x.fillStyle='#F6EEC9';x.fillRect(ix,iy,it.w,it.h);x.fillStyle='#4A4232';x.font='14px "Source Serif 4",serif';
      var words=(it.text||'').split(/\s+/),line='',ly=iy+26;
      words.forEach(function(w){if(x.measureText(line+' '+w).width>it.w-26){x.fillText(line,ix+13,ly);ly+=19;line=w;}else line=line?line+' '+w:w;});
      x.fillText(line,ix+13,ly);}
    else if(it.type==='text'){x.fillStyle='#1D1D1D';var fs=it.size||28;x.font=fs+'px '+FONTS[it.font||'serif'];
      var words2=(it.text||'').split(/\s+/),line2='',ly2=iy+fs;
      words2.forEach(function(w){if(x.measureText(line2+' '+w).width>it.w-8){x.fillText(line2,ix+4,ly2);ly2+=fs*1.3;line2=w;}else line2=line2?line2+' '+w:w;});
      x.fillText(line2,ix+4,ly2);}
    else if(it.hex){x.fillStyle=it.hex;x.fillRect(ix,iy,it.w,it.h-22);x.fillStyle='#62584F';x.font='500 11px "IBM Plex Mono",monospace';x.fillText((it.name||'').toUpperCase(),ix+4,iy+it.h-7);}
    else if(it.src){pend++;var im=new Image();
      im.onload=function(){var sc=Math.max(it.w/im.width,(it.h-(it.type==='swatch'?22:0))/im.height);
        x.save();x.beginPath();x.rect(ix,iy,it.w,it.h-(it.type==='swatch'?22:0));x.clip();
        x.drawImage(im,ix+(it.w-im.width*sc)/2,iy+((it.h-(it.type==='swatch'?22:0))-im.height*sc)/2,im.width*sc,im.height*sc);x.restore();
        if(it.type==='swatch'){x.fillStyle='#62584F';x.font='500 11px "IBM Plex Mono",monospace';x.fillText((it.name||'').toUpperCase(),ix+4,iy+it.h-7);}
        pend--;done();};
      im.onerror=function(){pend--;done();};im.src=it.src;}
  });
  done();
}

/* ---------- clear ---------- */
el('cvClear').onclick=function(){
  if(!items.length){toast('Already empty');return;}
  if(!confirm('Clear the whole board?'))return;
  pushHist();items=[];plane.innerHTML='';updateCtx();save();toast('Board cleared');
};

/* ---------- Sprint 2: AI on the board (Nano Banana via the visualiser endpoint) ---------- */
var RENDER_ENDPOINT='https://sturij.vercel.app/api/render';
function rasterItem(it,px,cb){
  var cv=document.createElement('canvas');cv.width=px;cv.height=px;var x=cv.getContext('2d');
  if(it.hex){x.fillStyle=it.hex;x.fillRect(0,0,px,px);cb(cv.toDataURL('image/jpeg',0.9));}
  else{var im=new Image();im.onload=function(){var sc=Math.max(px/im.width,px/im.height);
      cv.height=Math.round(px*Math.min(1.4,im.height/im.width))||px;x=cv.getContext('2d');
      var sc2=Math.max(cv.width/im.width,cv.height/im.height);
      x.drawImage(im,(cv.width-im.width*sc2)/2,(cv.height-im.height*sc2)/2,im.width*sc2,im.height*sc2);
      cb(cv.toDataURL('image/jpeg',0.88));};
    im.onerror=function(){cb(null);};im.src=it.src;}
}
function aiCall(base,prompt,swatches,onDone){
  SturijProgress.open('Rendering',['Packing your materials\u2026','Sending to the studio\u2026','Composing the room\u2026','Painting light and shadow\u2026','Final grade\u2026']);
  fetch(RENDER_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({base:base,prompt:prompt,requestId:'board-'+Date.now(),swatches:swatches||[],scenario:'pairing-studio'})})
  .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
  .then(function(res){
    var img=res.j&&res.j.outputs&&res.j.outputs[0]&&res.j.outputs[0].image;
    if(!res.ok||!img){SturijProgress.fail('Render failed'+(res.j&&res.j.error?' \u2014 '+res.j.error:''));return;}
    SturijProgress.done('Done',function(){onDone(img);});
  })
  .catch(function(){SturijProgress.fail('Render failed \u2014 check the connection');});
}
function aiEnhance(it){
  rasterItem(it,1280,function(base){
    if(!base){toast('Could not read that image');return;}
    var prompt='CONTEXT\nRecreate the attached image at maximum resolution, sharpness and clarity.\n\nINSTRUCTIONAL LOGIC\nDo not change the composition, crop, objects, materials, colours or lighting in any way. Output the same image, cleaner and higher-fidelity.\n\nNEGATIVE CONSTRAINTS\nNo new objects. No style change. No text.';
    aiCall(base,prompt,[],function(img){
      add({type:'img',src:img,x:it.x+it.w+30,y:it.y,w:it.w,h:it.h});
      toast('Enhanced version placed beside the original');
    });
  });
}
var PRESETS=[
  ['Reupholster','Reupholster all fabric-covered furniture in the attached image with the referenced material, keeping the exact shape, stitching style, lighting and everything else unchanged.'],
  ['Repaint','Repaint the painted surfaces (walls and painted furniture) in the attached image with the referenced colour, keeping everything else exactly as it is.'],
  ['Worktop','Replace the worktop / counter surfaces in the attached image with the referenced material, keeping everything else exactly as it is.'],
  ['Flooring','Replace the floor in the attached image with the referenced flooring material, keeping everything else exactly as it is.']
];
function restyleMenu(anchor,imgIt,swIts){
  var old=document.querySelector('.rsmenu');if(old){old.remove();return;}
  var m=document.createElement('div');m.className='rsmenu';
  PRESETS.forEach(function(p){
    var b=document.createElement('button');b.textContent=p[0];
    b.onclick=function(){m.remove();
      rasterItem(imgIt,1280,function(base){
        if(!base){toast('Could not read that image');return;}
        var pend=swIts.length,refs=[];
        swIts.forEach(function(sw){rasterItem(sw,640,function(r){
          if(r)refs.push({label:sw.name||'Material reference',image:r});
          if(--pend===0){
            var prompt='CONTEXT\nEdit one photograph.\n\nMATERIAL FACTS (STRICT)\n'+refs.map(function(q){return '- '+q.label;}).join('\n')+'\n\nINSTRUCTIONAL LOGIC\n'+p[1]+' Match the referenced swatch exactly.\n\nNEGATIVE CONSTRAINTS\nChange nothing except the named surfaces. No text, no new objects.';
            aiCall(base,prompt,refs,function(img){
              add({type:'img',src:img,x:imgIt.x+imgIt.w+30,y:imgIt.y,w:imgIt.w,h:imgIt.h});
              toast(p[0]+' — result placed beside the original');
            });
          }});});
      });};
    m.appendChild(b);
  });
  m.addEventListener('pointerdown',function(e){e.stopPropagation();});
  anchor.parentElement.appendChild(m);
}
function visualiseSel(g){
  g=g.filter(function(q){return !(q.type==='furn'&&q.cat==='ward');}); /* fitted wardrobes are spec'd, not sent to the render */
  var sws=g.filter(function(q){return q.type==='swatch';});
  g.filter(function(q){return q.type==='stack';}).forEach(function(s){var c=s.cards[s.ix||0];sws.push({type:'swatch',hex:c.hex,src:c.src,name:c.name,x:s.x,y:s.y,w:s.w,h:s.h});});
  if(!sws.length){toast('Select at least one swatch');return;}
  renderItems(g,function(cv){
    var scl=Math.min(1,1280/cv.width);
    var c2=document.createElement('canvas');c2.width=Math.round(cv.width*scl);c2.height=Math.round(cv.height*scl);
    c2.getContext('2d').drawImage(cv,0,0,c2.width,c2.height);
    var base=c2.toDataURL('image/jpeg',0.85);
    var pend=sws.length,refs=[];
    sws.forEach(function(sw){rasterItem(sw,640,function(r){
      if(r)refs.push({label:sw.name||'Material',image:r});
      if(--pend===0){
        var prompt='CONTEXT\nCreate one photorealistic photograph of a single furnished room. The attached image is a designer moodboard \u2014 the palette and inspiration record only, not a room.\n\nMATERIAL FACTS (STRICT)\n'+refs.map(function(q){return '- '+q.label;}).join('\n')+'\n- Fitted joinery: made by Sturij.\n\nINSTRUCTIONAL LOGIC\nApply each labelled reference swatch to an appropriate surface, matched exactly. Take the room mood from the moodboard photos.\n\nSTYLE & FINISH (VISUAL FIDELITY)\nNatural daylight. True material sheen: matt emulsion paint, oiled timber, honed stone.\n\nNEGATIVE CONSTRAINTS\nNo swatch board or grid in the scene. No text or labels. Only the listed materials.';
        var bx=Math.max.apply(null,g.map(function(q){return q.x+q.w;}));
        var by=Math.min.apply(null,g.map(function(q){return q.y;}));
        aiCall(base,prompt,refs,function(img){
          add({type:'img',src:img,x:bx+40,y:by,w:520,h:380});
          toast('Room render placed beside the selection');
        });
      }});});
  });
}
/* ---------- Sprint 3: presentation builder ---------- */
function wallPages(){
  var walls=items.filter(function(q){return q.type==='wall';});
  if(!walls.length)return [{name:'Board',list:items.slice()}];
  return walls.map(function(w){
    var group=[w].concat(items.filter(function(q){
      return q!==w&&q.type!=='wall'&&q.x<w.x+w.w&&q.x+q.w>w.x&&q.y<w.y+w.h&&q.y+q.h>w.y;}));
    return {name:w.name||'Wall',list:group};
  });
}
el('cvPresent').onclick=function(){
  if(!items.length){toast('The board is empty');return;}
  var pages=wallPages(),outs=[],i=0;
  toast('Composing presentation\u2026');
  (function next(){
    if(i>=pages.length){deckNarrative(outs,function(nar){openDeck(outs,nar);});return;}
    var p=pages[i++];
    renderItems(p.list,function(cv){outs.push({name:p.name,png:cv.toDataURL('image/jpeg',0.9)});next();});
  })();
};
function deckNarrative(pages,cb){
  if(!(window.claude&&window.claude.complete)){cb(null);return;}
  var sws=items.filter(function(q){return q.type==='swatch';}).map(function(q){return q.name;}).filter(Boolean).slice(0,30);
  var p='You are writing a short interior-scheme presentation for a Sturij client. British English, warm but plain, no emoji, no hyperbole.\n'
    +'Walls in the scheme: '+pages.map(function(q){return q.name;}).join(', ')+'.\nMaterials: '+sws.join(', ')+'.\n'
    +'Reply with ONLY valid JSON: {"title":"...","intro":"2 sentences","captions":{'+pages.map(function(q){return '"'+q.name+'":"1-2 sentences"';}).join(',')+'},"close":"1 sentence"}';
  toast('Writing the narrative\u2026');
  window.claude.complete(p).then(function(r){
    try{cb(JSON.parse(r.replace(/^[^{]*/,'').replace(/[^}]*$/,'')));}catch(e){cb(null);}
  }).catch(function(){cb(null);});
}
function openDeck(pages,nar){
  nar=nar||{};
  var sws=items.filter(function(q){return q.type==='swatch';});
  var w=window.open('','_blank');
  if(!w){toast('Allow pop-ups to build the presentation');return;}
  var d='<!doctype html><html><head><meta charset="utf-8"><title>Sturij \u2014 Scheme presentation</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;background:#FAF8F3;color:#1D1D1D}.pg{page-break-after:always;min-height:100vh;box-sizing:border-box;padding:56px;display:flex;flex-direction:column;justify-content:center}'
    +'.k{font:500 12px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#62584F}'
    +'h1{font:400 44px "Source Serif 4",serif;margin:12px 0 0}h2{font:400 28px "Source Serif 4",serif;margin:8px 0 20px}'
    +'img.pi{max-width:100%;max-height:74vh;object-fit:contain;border:1px solid #D4A01B}'
    +'.sched{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:24px}'
    +'.si{display:flex;align-items:center;gap:12px}.sw{width:44px;height:44px;border-radius:8px;border:1px solid #D4A01B;background-size:cover;flex:none}'
    +'.sn{font:500 12px "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase}'
    +'.pr{position:fixed;top:16px;right:16px;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;background:#1D1D1D;color:#FAF8F3;border:0;border-radius:999px;padding:10px 18px;cursor:pointer}'
    +'@media print{.pr{display:none}}</style></head><body>'
    +'<button class="pr" onclick="print()">Save as PDF</button>'
    +'<div class="pg"><div class="k">Sturij \u00b7 Scheme presentation</div><h1>'+(nar.title||'Your scheme')+'</h1>'
    +(nar.intro?'<p style="font:400 17px/1.65 \'Source Serif 4\',serif;max-width:520px;margin:18px 0 0">'+nar.intro+'</p>':'')
    +'<div class="k" style="margin-top:14px">'+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+'</div></div>';
  pages.forEach(function(p){
    var cap=nar.captions&&nar.captions[p.name];
    d+='<div class="pg"><div class="k">'+(p.name||'Wall').toUpperCase()+'</div>'
      +(cap?'<p style="font:400 15px/1.6 \'Source Serif 4\',serif;max-width:520px;margin:8px 0 14px">'+cap+'</p>':'')
      +'<img class="pi" src="'+p.png+'"></div>';
  });
  if(sws.length){
    d+='<div class="pg"><div class="k">Materials schedule</div><h2>Everything in this scheme</h2><div class="sched">';
    var seen={};
    sws.forEach(function(s){var k=s.name+(s.hex||s.src);if(seen[k])return;seen[k]=1;
      d+='<div class="si"><span class="sw" style="'+(s.hex?'background:'+s.hex:'background-image:url('+s.src+')')+'"></span><span class="sn">'+(s.name||'')+'</span></div>';});
    d+='</div>'+(nar.close?'<p style="font:400 15px/1.6 \'Source Serif 4\',serif;max-width:520px;margin:26px 0 0">'+nar.close+'</p>':'')+'</div>';
  }
  d+='</body></html>';
  w.document.write(d);w.document.close();
  toast('Presentation ready \u2014 Save as PDF in the new tab');
}
/* ---------- radial paint picker (the Motion color-picker treatment, Sturij palette) ---------- */
var PAINTS=null;
function loadPaints(cb){
  if(PAINTS)return cb(PAINTS);
  fetch('showcase/paints/paints.json').then(function(r){return r.json();}).then(function(j){
    PAINTS=j.map(function(p){return [p.name,p.hex];});cb(PAINTS);
  }).catch(function(){PAINTS=[['All White','#f6f6f2']];cb(PAINTS);});
}
function openPalette(target){
  var old=document.getElementById('palwrap');if(old){old.remove();return;}
  loadPaints(function(paints){
    var wrap=document.createElement('div');wrap.id='palwrap';
    wrap.innerHTML='<div class="paldisc"></div><div class="palname"></div>';
    document.body.appendChild(wrap);
    var disc=wrap.firstChild,nameEl=wrap.querySelector('.palname');
    var rings=[[0,1],[1,7],[2,14]],dots=[],pi=0;
    /* a curated sweep across the palette so the wheel reads tonal, not random */
    var step=Math.max(1,Math.floor(paints.length/19));
    rings.forEach(function(rg){
      for(var i=0;i<rg[1];i++){
        var p=paints[Math.min(paints.length-1,pi*step)];pi++;
        var ang=(i/rg[1])*Math.PI*2-Math.PI/2, rad=rg[0]*62;
        var d=document.createElement('button');d.className='paldot';
        d.style.background=p[1];d.setAttribute('data-n',p[0]);d.setAttribute('data-h',p[1]);
        d._bx=Math.cos(ang)*rad;d._by=Math.sin(ang)*rad;d._x=d._bx;d._y=d._by;d._vx=0;d._vy=0;
        d.style.transform='translate('+d._bx+'px,'+d._by+'px) scale(0)';
        d.style.transitionDelay=(dots.length*22)+'ms';
        disc.appendChild(d);dots.push(d);
      }
    });
    requestAnimationFrame(function(){requestAnimationFrame(function(){dots.forEach(function(d){d.classList.add('in');d.style.transform='translate('+d._bx+'px,'+d._by+'px) scale(1)';});setTimeout(function(){dots.forEach(function(d){d.style.transition='';d.style.transitionDelay='';});},900);});});
    var px=-9999,py=-9999,run=true;
    wrap.addEventListener('pointermove',function(e){
      var r=disc.getBoundingClientRect();px=e.clientX-(r.left+r.width/2);py=e.clientY-(r.top+r.height/2);
      var hov=e.target.closest('.paldot');
      nameEl.textContent=hov?hov.getAttribute('data-n'):'';
    });
    (function tick(){
      if(!run)return;
      dots.forEach(function(d){
        var cx=d._bx-px,cy=d._by-py,dist=Math.hypot(cx,cy),tx=d._bx,ty=d._by;
        if(dist<80&&dist>0.01){var push=(1-dist/80)*16;tx+=cx/dist*push;ty+=cy/dist*push;}
        /* spring: stiffness ~120, damping ~0.72 */
        d._vx=(d._vx+(tx-d._x)*0.12)*0.72;d._vy=(d._vy+(ty-d._y)*0.12)*0.72;
        d._x+=d._vx;d._y+=d._vy;
        if(d.classList.contains('in'))d.style.transform='translate('+d._x.toFixed(2)+'px,'+d._y.toFixed(2)+'px)';
      });
      requestAnimationFrame(tick);
    })();
    function close(){run=false;wrap.classList.add('bye');setTimeout(function(){wrap.remove();},200);}
    wrap.addEventListener('pointerdown',function(e){
      var d=e.target.closest('.paldot');
      if(!d){if(e.target===wrap)close();return;}
      e.stopPropagation();
      var hex=d.getAttribute('data-h'),nm=d.getAttribute('data-n');
      if(!target){boardBg=hex;applyBg();qsave();toast('Canvas \u2014 '+nm);close();return;}
      pushHist();
      var n=nodeFor(target);
      if((target.type==='wall'||target.type==='plan')&&target._paintFrame){delete target._paintFrame;target.frameHex=hex;if(n&&target.type==='plan')applyCardGrid(n,target);if(n){var fc=n.querySelector('.wallcard,.plancard');if(fc){fc.style.background=hex;fc.classList.toggle('inklight',inkFor(hex)==='light');}}}
      else if(target.type==='wall'){target.hex=hex;if(n){var f=n.querySelector('.wface');if(f)f.style.background=hex;}}
      else if(target.type==='room'){target.wallHex=hex;if(n)n.querySelector('.rvface').innerHTML=roomSVG(target);}
      else if(target.type==='plan'&&target._paintIwIdx!=null){var iwi=target._paintIwIdx;delete target._paintIwIdx;
        target.inWalls[iwi].hex=hex;
        if(n){n.querySelector('.planface').innerHTML=planSVG(target);planNotes(n,target);}}
      else if(target.type==='plan'&&target._paintZoneIdx!=null){var zzi=target._paintZoneIdx;delete target._paintZoneIdx;
        target.zones[zzi].hex=hex;
        if(n){n.querySelector('.planface').innerHTML=planSVG(target);planNotes(n,target);}}
      else if(target.type==='plan'&&target._paintWallIdx!=null){var wi=target._paintWallIdx;delete target._paintWallIdx;
        target.wallCols=target.wallCols||{};target.wallCols[wi]=hex;
        target.wallNotes=target.wallNotes||{};
        if(!target.wallNotes[wi])target.wallNotes[wi]={text:nm+' \u00b7 '+hex,open:false};
        else target.wallNotes[wi].text=(nm+' \u00b7 '+hex+'\n'+(target.wallNotes[wi].text||'')).trim();
        if(n){n.querySelector('.planface').innerHTML=planSVG(target);planNotes(n,target);}}
      else if(target.type==='plan'){delete target.wallCols;target.wallHex=hex;if(n){n.querySelector('.planface').innerHTML=planSVG(target);planNotes(n,target);}}
      qsave();toast('Painted \u2014 '+nm);close();
    });
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}});
    requestAnimationFrame(function(){wrap.classList.add('show');});
  });
}
/* ---------- Sprint 4: publish a wall version for customer review ---------- */
function pubLoad(){try{return JSON.parse(localStorage.getItem('sj-review')||'[]');}catch(e){return [];}}
function pubSave(p){try{localStorage.setItem('sj-review',JSON.stringify(p));}catch(e){toast('Review store is full \u2014 remove an old publication');}}
function publishWall(w){
  var members=wallMembers(w);
  renderItems([w].concat(members),function(cv){
    var mats=members.filter(function(q){return q.type==='swatch';}).map(function(q){
      return {id:q.id,name:q.name||'',hex:q.hex||null,src:q.src||null,approved:!!q.approved};});
    var pubs=pubLoad();
    /* one live publication per wall: republishing replaces it, keeping notes that are still open */
    var old=pubs.filter(function(p){return p.wallId===w.id;})[0];
    var pub={pubId:'p'+Date.now().toString(36),wallId:w.id,name:w.name||'Wall',ver:w.ver||1,
      png:cv.toDataURL('image/jpeg',0.82),mats:mats,notes:old?old.notes.filter(function(n){return !n.done;}):[],
      status:'published',published:Date.now()};
    pubs=pubs.filter(function(p){return p.wallId!==w.id;});pubs.unshift(pub);pubSave(pubs);
    toast((w.name||'Wall')+' v'+(w.ver||1)+' published \u2014 open review.html to see the customer view');
  });
}
/* approvals made by the customer flow back onto the board */
window.addEventListener('storage',function(e){
  if(e.key!=='sj-review')return;
  var changed=false;
  pubLoad().forEach(function(p){(p.mats||[]).forEach(function(m){
    var q=items.filter(function(x){return x.id===m.id;})[0];
    if(q&&m.approved&&!q.approved){q.approved=true;changed=true;rerender(q);}
  });});
  if(changed){renderDock();qsave();toast('Customer approved materials \u2014 added to the approved doc');}
});
/* ---------- docs: dock walls to the shelf, approved materials doc ---------- */
function wallMembers(w){
  return items.filter(function(q){return q!==w&&q.type!=='wall'&&!q.hiddenPage&&q.x<w.x+w.w&&q.x+q.w>w.x&&q.y<w.y+w.h&&q.y+q.h>w.y;});
}
var wallItems=wallMembers;
function inkFor(hex){
  var m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return null;
  var v=parseInt(m[1],16),r=(v>>16)&255,g=(v>>8)&255,b=v&255;
  var L=0.2126*Math.pow(r/255,2.2)+0.7152*Math.pow(g/255,2.2)+0.0722*Math.pow(b/255,2.2);
  return L>0.35?'':'light';
}
function applyFrameInk(it,n){
  if(!n)return;var card=n.querySelector('.wallcard');if(!card)return;
  card.classList.toggle('inklight',inkFor(it.frameHex)==='light');
}
function rerender(q){var n=nodeFor(q);var s=n&&n.classList.contains('sel');if(n)n.remove();var n2=render(q);if(n2&&s)n2.classList.add('sel');}
function wallGoPage(w,to){
  w.pages=w.pages||[[]];
  if(to<0||to>=w.pages.length)return;
  w.pages[w.pg||0]=wallMembers(w).map(function(q){return q.id;});
  wallMembers(w).forEach(function(q){q.hiddenPage=true;var n=nodeFor(q);if(n)n.style.display='none';});
  w.pg=to;
  (w.pages[to]||[]).forEach(function(id){var q=items.filter(function(p){return p.id===id;})[0];
    if(q){delete q.hiddenPage;var n=nodeFor(q);if(n)n.style.display='';else render(q);}});
  rerender(w);qsave();
}
function docModal(title,def,cb){
  var old=document.getElementById('docmodal');if(old)old.remove();
  var m=document.createElement('div');m.id='docmodal';
  m.innerHTML='<div class="dmcard"><div class="dmk">'+title+'</div><input class="dmin" value="'+(def||'').replace(/"/g,'&quot;')+'" spellcheck="false"><div class="dmrow"><button class="dmb ghost">Cancel</button><button class="dmb go">Create doc</button></div></div>';
  document.body.appendChild(m);
  var inp=m.querySelector('.dmin');inp.focus();inp.select();
  function close(){m.classList.add('bye');setTimeout(function(){m.remove();},180);}
  m.querySelector('.ghost').onclick=close;
  m.querySelector('.go').onclick=function(){var v=inp.value.trim();close();cb(v||def);};
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){m.querySelector('.go').click();}if(e.key==='Escape')close();});
  m.addEventListener('pointerdown',function(e){if(e.target===m)close();});
  requestAnimationFrame(function(){m.classList.add('show');});
}
function dockWall(w){
  if(!w||w.type!=='wall')return;
  pushHist();
  var nm=w.name; /* wall already owns its doc name from creation */
  w.name=nm||'Wall';w.docked=true;
  wallMembers(w).forEach(function(q){q.dockedTo=w.id;var n=nodeFor(q);if(n)n.remove();});
  var n2=nodeFor(w);if(n2)n2.remove();
  document.querySelectorAll('.citem.sel').forEach(function(n){n.classList.remove('sel');});
  updateCtx();renderDock();qsave();
  toast(w.name+' \u00b7 v'+(w.ver||1)+' docked');
}
function undockWall(w){
  pushHist();
  delete w.docked;
  items.forEach(function(q){if(q.dockedTo===w.id)delete q.dockedTo;});
  restore(JSON.stringify(items));
  hist.pop(); /* restore() isn't a user action on top of the push */
  renderDock();toast(w.name+' \u00b7 v'+(w.ver||1)+' back on the board');
}
var dockMin=false;
function renderDock(){
  var tray=el('docktray');tray.innerHTML='';
  var docs=items.filter(function(q){return q.type==='wall'&&q.docked;});
  var appr=items.filter(function(q){return q.type==='swatch'&&q.approved;});
  var any=docs.length||appr.length;
  tray.classList.toggle('on',!!any);
  if(!any)return;
  if(dockMin){
    var mini=document.createElement('button');mini.className='dockmini';mini.textContent='Docs';
    mini.onclick=function(){dockMin=false;renderDock();};
    tray.appendChild(mini);wireDockDrag(mini);return;
  }
  var card=document.createElement('div');card.className='dockcard';
  var h='<div class="dchd"><span>Docs</span><span class="dcbtns"><button class="dcb" data-d="min" title="Minimise">\u2212</button><button class="dcb" data-d="x" title="Hide until something docks">\u00d7</button></span></div><div class="dcrow">';
  docs.forEach(function(w,i){
    h+='<button class="dctile" data-w="'+i+'" title="'+w.name+' \u00b7 v'+(w.ver||1)+' \u2014 open back onto the board"><span class="dcsw" style="background:'+(w.hex||'#F0EDE8')+'"></span><span class="dcnm">'+w.name+' \u00b7 v'+(w.ver||1)+'</span></button>';});
  if(appr.length)
    h+='<button class="dctile" data-w="appr" title="The approved materials doc"><span class="dcsw dcok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16"><path d="M4 12l6 6L20 6"/></svg></span><span class="dcnm">Approved \u00b7 '+appr.length+'</span></button>';
  h+='</div>';
  card.innerHTML=h;
  card.querySelectorAll('.dctile').forEach(function(t){t.onclick=function(){
    var k=t.getAttribute('data-w');
    if(k==='appr')openApprovedDoc(appr);else undockWall(docs[+k]);};});
  card.querySelector('[data-d="min"]').onclick=function(e){e.stopPropagation();dockMin=true;renderDock();};
  card.querySelector('[data-d="x"]').onclick=function(e){e.stopPropagation();tray.classList.remove('on');};
  tray.appendChild(card);
  wireDockDrag(card.querySelector('.dchd'));
}
function wireDockDrag(handle){
  var tray=el('docktray');
  handle.addEventListener('pointerdown',function(e){
    if(e.target.closest('.dcb'))return;
    var r=tray.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top,moved=false;
    function mv(ev){moved=true;tray.style.left=Math.max(4,Math.min(innerWidth-r.width-4,ev.clientX-ox))+'px';tray.style.top=Math.max(4,Math.min(innerHeight-40,ev.clientY-oy))+'px';tray.style.bottom='auto';}
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  });
}
function openApprovedDoc(appr){
  var w=window.open('','_blank');
  if(!w){toast('Allow pop-ups to open the doc');return;}
  var d='<!doctype html><html><head><meta charset="utf-8"><title>Sturij \u2014 Approved materials</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;background:#FAF8F3;color:#1D1D1D;padding:56px;font-family:"Source Serif 4",serif}'
    +'.k{font:500 12px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#62584F}'
    +'h1{font-weight:400;font-size:40px;margin:10px 0 30px}'
    +'.sched{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}'
    +'.si{display:flex;align-items:center;gap:14px}.sw{width:56px;height:56px;border-radius:10px;border:1px solid #D4A01B;background-size:cover;flex:none}'
    +'.sn{font:500 12px "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase}'
    +'.pr{position:fixed;top:16px;right:16px;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;background:#1D1D1D;color:#FAF8F3;border:0;border-radius:999px;padding:10px 18px;cursor:pointer}@media print{.pr{display:none}}</style></head><body>'
    +'<button class="pr" onclick="print()">Save as PDF</button>'
    +'<div class="k">Sturij \u00b7 Approved materials</div><h1>Signed off</h1><div class="sched">';
  var seen={};
  appr.forEach(function(s){var k=s.name+(s.hex||s.src);if(seen[k])return;seen[k]=1;
    d+='<div class="si"><span class="sw" style="'+(s.hex?'background:'+s.hex:'background-image:url('+s.src+')')+'"></span><span class="sn">'+(s.name||'')+'</span></div>';});
  d+='</div></body></html>';
  w.document.write(d);w.document.close();
}
/* ---------- Sprint 2: studio inbox ---------- */
function drainInbox(){
  var inbox=[];
  try{inbox=JSON.parse(localStorage.getItem('sturij.board.inbox')||'[]');}catch(e){}
  if(!inbox.length)return;
  localStorage.removeItem('sturij.board.inbox');
  var p=centre(),i=0;
  inbox.forEach(function(q){
    if(!q||!q.src)return;
    var w=q.kind==='img'?380:150,h=q.kind==='img'?260:120;
    add({type:q.kind==='img'?'img':'swatch',src:q.src,name:q.name,x:p.x-w/2+(i%3)*40,y:p.y-h/2+Math.floor(i/3)*40,w:w,h:h});i++;
  });
  toast(i+' item'+(i>1?'s':'')+' arrived from the studio');
}
/* ---------- boot ---------- */
(function(){
  var S=null;try{S=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  if(S&&S.v===1){view=S.view||view;items=S.items||[];boardBg=S.bg||null;applyBg();
    items.forEach(function(q){delete q._placing;});items.forEach(function(it){if(it.type==='furn'||it.type==='pin'){if((it.z||0)<10000)it.z=++fTop;fTop=Math.max(fTop,it.z||10000);}else if(it.type!=='wall')zTop=Math.max(zTop,it.z||0);render(it);});}
  applyView();drainInbox();renderDock();
})();

/* ===================== top-down furniture ===================== */
var FCATS=[['ward','Fitted wardrobes'],['kitchen','Kitchen + utility'],['living','Living + dining'],['bed','Bedroom'],['office','Home office'],['bath','Bath + ensuite'],['plumb','Plumbing'],['light','Lighting']];
var FURN=[
 ['wsingle','Single unit',50,60,'ward'],['wstd','Standard unit',60,60,'ward'],['wdouble','Double unit',100,60,'ward'],
 ['wwide','Wide unit',120,60,'ward'],['wcorner','Corner unit',90,90,'ward'],['wslide','Sliding run',200,68,'ward'],
 ['wdrawer','Drawer pack',45,50,'ward'],['wshelf','Shelf pack',45,30,'ward'],['wrail','Hanging rail',45,12,'ward'],['wshoe','Shoe rack',45,30,'ward'],
 ['kbase','Base unit',60,60,'kitchen'],['island','Island',180,90,'kitchen'],['sink','Kitchen sink',90,55,'kitchen'],
 ['hob','Hob + oven',70,70,'kitchen'],['fridge','Fridge',70,70,'kitchen'],['dw','Dishwasher',60,60,'kitchen'],['wm','Washing machine',60,60,'kitchen'],
 ['sofa','Sofa',220,95,'living'],['armchair','Armchair',95,95,'living'],['coffee','Coffee table',110,60,'living'],
 ['dining','Dining table',200,110,'living'],['rug','Rug',200,140,'living'],['plant','Plant',60,60,'living'],
 ['bed','Double bed',160,200,'bed'],['sbed','Single bed',95,195,'bed'],['bedside','Bedside',45,40,'bed'],['chest','Chest of drawers',100,50,'bed'],['wardrobe','Wardrobe',180,65,'bed'],
 ['desk','Desk',150,70,'office'],['ochair','Task chair',55,55,'office'],['bookcase','Bookcase',90,32,'office'],
 ['bath','Bath',170,80,'bath'],['shower','Shower',90,90,'bath'],['wc','WC',60,75,'bath'],['basin','Basin',60,50,'bath'],['trail','Towel rail',60,14,'bath'],
 ['boiler','Boiler',45,35,'plumb'],['cyl','HW cylinder',55,55,'plumb'],['rad','Radiator',120,14,'plumb'],['stop','Stopcock',22,22,'plumb'],['mani','Manifold',44,22,'plumb'],
 ['pend','Pendant',32,32,'light'],['down','Downlight',20,20,'light'],['walll','Wall light',26,14,'light'],['switch','Switch',18,18,'light'],['socket','Socket 2G',20,14,'light'],['cu','Consumer unit',44,26,'light']
];
function furnSVG(k,w,h){
  var s='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:100%;display:block" fill="none" stroke="#1D1D1D" stroke-width="2" stroke-linejoin="round">';
  var W=w,H=h;
  if(k==='wsingle'||k==='wstd'||k==='wdouble'||k==='wwide'){
    s+='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2)+'"/>';
    var n=k==='wsingle'||k==='wstd'?1:2;
    for(var i9=1;i9<n;i9++)s+='<line x1="'+(W*i9/n)+'" y1="1" x2="'+(W*i9/n)+'" y2="'+(H-2)+'"/>';
    /* door swing arcs on the room side */
    for(var j9=0;j9<n;j9++){var cx9=W*j9/n+2;s+='<path d="M'+cx9+' '+(H-2)+' A'+(W/n-4)+' '+(W/n-4)+' 0 0 1 '+(cx9+W/n-4)+' '+(H-2-(W/n-4)>2?(H-2-(W/n-4)):2)+'" stroke-dasharray="3 3" stroke-width="1"/>';}
    s+='<line x1="1" y1="'+(H*.33)+'" x2="'+(W-1)+'" y2="'+(H*.33)+'" stroke-width="1" stroke-dasharray="2 3"/>';
    return s+'</svg>';}
  if(k==='wcorner'){s+='<path d="M1 1H'+(W-1)+'V'+(H*.55)+'H'+(W*.55)+'V'+(H-1)+'H1Z"/><line x1="1" y1="1" x2="'+(W*.55)+'" y2="'+(H*.55)+'" stroke-width="1" stroke-dasharray="2 3"/>';return s+'</svg>';}
  if(k==='wslide'){s+='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2)+'"/><line x1="1" y1="'+(H*.45)+'" x2="'+(W*.62)+'" y2="'+(H*.45)+'" stroke-width="3"/><line x1="'+(W*.38)+'" y1="'+(H*.62)+'" x2="'+(W-1)+'" y2="'+(H*.62)+'" stroke-width="3"/><polyline points="'+(W*.56)+','+(H*.38)+' '+(W*.62)+','+(H*.45)+' '+(W*.56)+','+(H*.52)+'" stroke-width="1.4"/>';return s+'</svg>';}
  if(k==='wdrawer'){s+='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2)+'"/>';for(var d9=1;d9<4;d9++)s+='<line x1="1" y1="'+(H*d9/4)+'" x2="'+(W-1)+'" y2="'+(H*d9/4)+'"/>';s+='<line x1="'+(W*.35)+'" y1="'+(H*.12)+'" x2="'+(W*.65)+'" y2="'+(H*.12)+'" stroke-width="1.4"/>';return s+'</svg>';}
  if(k==='wshelf'){s+='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2)+'"/><line x1="1" y1="'+(H/2)+'" x2="'+(W-1)+'" y2="'+(H/2)+'"/><line x1="'+(W/2)+'" y1="1" x2="'+(W/2)+'" y2="'+(H-1)+'" stroke-width="1" stroke-dasharray="2 2"/>';return s+'</svg>';}
  if(k==='wrail'){s+='<line x1="2" y1="'+(H/2)+'" x2="'+(W-2)+'" y2="'+(H/2)+'" stroke-width="3"/><circle cx="'+(W*.3)+'" cy="'+(H/2)+'" r="3"/><circle cx="'+(W*.7)+'" cy="'+(H/2)+'" r="3"/>';return s+'</svg>';}
  if(k==='wshoe'){s+='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2)+'"/><line x1="1" y1="'+(H*.5)+'" x2="'+(W-1)+'" y2="'+(H*.5)+'" stroke-dasharray="3 2" stroke-width="1.4" transform="rotate(-6 '+(W/2)+' '+(H/2)+')"/>';return s+'</svg>';}
  if(k==='sofa')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="10" fill="#FDFCF8"/><rect x="4" y="4" width="'+(W-8)+'" height="18" rx="8"/><rect x="4" y="4" width="18" height="'+(H-8)+'" rx="8"/><rect x="'+(W-22)+'" y="4" width="18" height="'+(H-8)+'" rx="8"/><line x1="'+(W/2)+'" y1="22" x2="'+(W/2)+'" y2="'+(H-6)+'"/>';
  else if(k==='armchair')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="12" fill="#FDFCF8"/><rect x="4" y="4" width="'+(W-8)+'" height="16" rx="8"/><rect x="4" y="4" width="14" height="'+(H-8)+'" rx="7"/><rect x="'+(W-18)+'" y="4" width="14" height="'+(H-8)+'" rx="7"/>';
  else if(k==='coffee')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="8" fill="#FDFCF8"/><rect x="14" y="12" width="'+(W-28)+'" height="'+(H-24)+'" rx="4" stroke-dasharray="4 3" stroke-width="1.2"/>';
  else if(k==='dining'){s+='<rect x="24" y="16" width="'+(W-48)+'" height="'+(H-32)+'" rx="6" fill="#FDFCF8"/>';
    for(var c=0;c<3;c++){var cx=44+c*(W-88)/2;s+='<rect x="'+(cx-11)+'" y="2" width="22" height="12" rx="4"/><rect x="'+(cx-11)+'" y="'+(H-14)+'" width="22" height="12" rx="4"/>';}}
  else if(k==='bed')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="6" fill="#FDFCF8"/><rect x="12" y="10" width="'+((W-32)/2)+'" height="26" rx="5"/><rect x="'+(W/2+4)+'" y="10" width="'+((W-32)/2)+'" height="26" rx="5"/><line x1="4" y1="'+(H*0.42)+'" x2="'+(W-4)+'" y2="'+(H*0.42)+'"/>';
  else if(k==='wardrobe')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" fill="#FDFCF8"/><line x1="'+(W/2)+'" y1="4" x2="'+(W/2)+'" y2="'+(H-4)+'"/><line x1="8" y1="'+(H/2)+'" x2="'+(W-8)+'" y2="'+(H/2)+'" stroke-dasharray="5 4" stroke-width="1.2"/>';
  else if(k==='desk')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="4" fill="#FDFCF8"/><rect x="'+(W/2-22)+'" y="'+(H-26)+'" width="44" height="20" rx="9"/>';
  else if(k==='bath')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="14" fill="#FDFCF8"/><rect x="14" y="12" width="'+(W-28)+'" height="'+(H-24)+'" rx="20"/><circle cx="26" cy="'+(H/2)+'" r="4"/>';
  else if(k==='wc')s+='<rect x="12" y="4" width="'+(W-24)+'" height="20" rx="4" fill="#FDFCF8"/><ellipse cx="'+(W/2)+'" cy="'+(H/2+12)+'" rx="'+(W/2-10)+'" ry="'+(H/2-18)+'" fill="#FDFCF8"/>';
  else if(k==='basin')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="6" fill="#FDFCF8"/><ellipse cx="'+(W/2)+'" cy="'+(H/2+3)+'" rx="'+(W/2-14)+'" ry="'+(H/2-14)+'"/>';
  else if(k==='fridge')s+='<rect x="6" y="6" width="'+(W-12)+'" height="'+(H-12)+'" rx="3" fill="#FDFCF8"/><line x1="6" y1="'+(H/2)+'" x2="'+(W-6)+'" y2="'+(H/2)+'" stroke-width="1.2"/><text x="'+(W/2)+'" y="'+(H/2-8)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="#62584F" stroke="none">FR</text>';
  else if(k==='hob'){s+='<rect x="6" y="6" width="'+(W-12)+'" height="'+(H-12)+'" rx="3" fill="#FDFCF8"/>';[[0.3,0.3],[0.7,0.3],[0.3,0.7],[0.7,0.7]].forEach(function(p){s+='<circle cx="'+(W*p[0])+'" cy="'+(H*p[1])+'" r="8" stroke-width="1.4"/>';});}
  else if(k==='sink')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="4" fill="#FDFCF8"/><rect x="10" y="12" width="'+(W/2-16)+'" height="'+(H-24)+'" rx="4"/><circle cx="'+(W*0.75)+'" cy="'+(H/2)+'" r="3"/>';
  else if(k==='plant'){s+='<circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="'+(W/2-6)+'" fill="#FDFCF8"/>';for(var a2=0;a2<6;a2++){var an=a2*Math.PI/3,r0=W/2-6;s+='<path d="M '+(W/2)+' '+(H/2)+' Q '+(W/2+Math.cos(an+0.5)*r0*0.7)+' '+(H/2+Math.sin(an+0.5)*r0*0.7)+' '+(W/2+Math.cos(an)*r0*0.92)+' '+(H/2+Math.sin(an)*r0*0.92)+'" stroke-width="1.2"/>';}}
  else if(k==='rug')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="4" fill="#FDFCF8" stroke-dasharray="7 5"/><rect x="16" y="14" width="'+(W-32)+'" height="'+(H-28)+'" rx="3" stroke-dasharray="4 3" stroke-width="1.2"/>';
  else if(k==='kbase')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" fill="#FDFCF8"/><line x1="4" y1="10" x2="'+(W-8)+'" y2="10" stroke-width="1.2"/>';
  else if(k==='island')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="4" fill="#FDFCF8"/><line x1="'+(W/3)+'" y1="4" x2="'+(W/3)+'" y2="'+(H-4)+'" stroke-width="1.2"/><line x1="'+(2*W/3)+'" y1="4" x2="'+(2*W/3)+'" y2="'+(H-4)+'" stroke-width="1.2"/>';
  else if(k==='dw'||k==='wm'||k==='boiler'||k==='cyl'||k==='cu')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="3" fill="#FDFCF8"/><text x="'+(W/2)+'" y="'+(H/2+4)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="#62584F" stroke="none">'+(k==='dw'?'DW':k==='wm'?'WM':k==='boiler'?'B':k==='cyl'?'HW':'CU')+'</text>';
  else if(k==='sbed')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="6" fill="#FDFCF8"/><rect x="14" y="10" width="'+(W-28)+'" height="24" rx="5"/><line x1="4" y1="'+(H*0.36)+'" x2="'+(W-4)+'" y2="'+(H*0.36)+'"/>';
  else if(k==='bedside'||k==='chest')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" fill="#FDFCF8"/><line x1="'+(W/2)+'" y1="4" x2="'+(W/2)+'" y2="'+(H-4)+'" stroke-width="1.2"/>';
  else if(k==='ochair')s+='<circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="'+(W/2-8)+'" fill="#FDFCF8"/><rect x="'+(W/2-14)+'" y="2" width="28" height="10" rx="5"/>';
  else if(k==='bookcase')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" fill="#FDFCF8"/><line x1="'+(W/3)+'" y1="4" x2="'+(W/3)+'" y2="'+(H-4)+'" stroke-width="1.2"/><line x1="'+(2*W/3)+'" y1="4" x2="'+(2*W/3)+'" y2="'+(H-4)+'" stroke-width="1.2"/>';
  else if(k==='shower')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="6" fill="#FDFCF8"/><circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="10" stroke-width="1.4"/><line x1="8" y1="8" x2="'+(W-8)+'" y2="'+(H-8)+'" stroke-width="1" stroke-dasharray="3 3"/>';
  else if(k==='trail')s+='<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" rx="6" fill="#FDFCF8"/><line x1="10" y1="'+(H/2)+'" x2="'+(W-10)+'" y2="'+(H/2)+'" stroke-width="2.2"/>';
  else if(k==='rad')s+='<rect x="4" y="3" width="'+(W-8)+'" height="'+(H-6)+'" rx="4" fill="#FDFCF8"/><path d="'+(function(){var p2='';for(var r2=12;r2<W-10;r2+=9)p2+='M '+r2+' 4 L '+r2+' '+(H-4)+' ';return p2;})()+'" stroke-width="1"/>';
  else if(k==='stop')s+='<circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="'+(W/2-5)+'" fill="#FDFCF8"/><line x1="5" y1="'+(H/2)+'" x2="'+(W-5)+'" y2="'+(H/2)+'" stroke-width="1.4"/><line x1="'+(W/2)+'" y1="3" x2="'+(W/2)+'" y2="'+(H/2)+'" stroke-width="1.4"/>';
  else if(k==='mani')s+='<rect x="3" y="6" width="'+(W-6)+'" height="'+(H-12)+'" rx="3" fill="#FDFCF8"/>'+(function(){var p3='';for(var r3=10;r3<W-6;r3+=8)p3+='<line x1="'+r3+'" y1="2" x2="'+r3+'" y2="'+(H-2)+'" stroke-width="1"/>';return p3;})();
  else if(k==='pend')s+='<circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="'+(W/2-5)+'" fill="#FDFCF8"/><line x1="'+(W/2-8)+'" y1="'+(H/2-8)+'" x2="'+(W/2+8)+'" y2="'+(H/2+8)+'" stroke-width="1.4"/><line x1="'+(W/2+8)+'" y1="'+(H/2-8)+'" x2="'+(W/2-8)+'" y2="'+(H/2+8)+'" stroke-width="1.4"/>';
  else if(k==='down')s+='<circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="'+(W/2-4)+'" fill="#FDFCF8"/><circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="3" fill="#1D1D1D" stroke="none"/>';
  else if(k==='walll')s+='<rect x="3" y="3" width="'+(W-6)+'" height="'+(H-6)+'" rx="'+(H/2-3)+'" fill="#FDFCF8"/><circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="3" fill="#1D1D1D" stroke="none"/>';
  else if(k==='switch')s+='<circle cx="'+(W/2)+'" cy="'+(H/2)+'" r="'+(W/2-4)+'" fill="#FDFCF8"/><text x="'+(W/2)+'" y="'+(H/2+3.5)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#1D1D1D" stroke="none">S</text>';
  else if(k==='socket')s+='<rect x="3" y="3" width="'+(W-6)+'" height="'+(H-6)+'" rx="3" fill="#FDFCF8"/><circle cx="'+(W/2-4)+'" cy="'+(H/2)+'" r="1.6" fill="#1D1D1D" stroke="none"/><circle cx="'+(W/2+4)+'" cy="'+(H/2)+'" r="1.6" fill="#1D1D1D" stroke="none"/>';
  return s+'</svg>';
}
(function(){
  var pal=el('furnpal'),grid=el('fpg'),cats=el('fpcats'),curCat=FCATS[0][0];
  function renderCats(){cats.innerHTML='';FCATS.forEach(function(c){
    var b=document.createElement('button');b.className='fpc'+(c[0]===curCat?' on':'');b.textContent=c[1];
    b.onclick=function(){curCat=c[0];renderCats();fill();};cats.appendChild(b);});}
  function fill(){grid.innerHTML='';FURN.filter(function(f){return f[4]===curCat;}).forEach(wire);}
  function wire(f){
    var c=document.createElement('div');c.className='fpi';c.title=f[1];
    c.innerHTML='<div class="fpsym">'+furnSVG(f[0],f[2],f[3])+'</div><span>'+f[1]+'</span>';
    c.addEventListener('pointerdown',function(e){
      e.preventDefault();
      var ghost=document.createElement('div');ghost.className='fghost';ghost.innerHTML=furnSVG(f[0],f[2],f[3]);
      ghost.innerHTML='<div class="gcard">'+ghost.innerHTML+'<div class="fmeta">'+f[1].toUpperCase()+' \u00b7 '+(f[2]*10)+' \u00d7 '+(f[3]*10)+'</div></div>';
      ghost.style.width=(f[2]+24)+'px';document.body.appendChild(ghost);
      function place(ev){ghost.style.left=(ev.clientX-f[2]/2)+'px';ghost.style.top=(ev.clientY-f[3]/2)+'px';}
      place(e);
      function mv(ev){place(ev);}
      function up(ev){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);ghost.remove();
        var r=world.getBoundingClientRect();
        if(ev.clientX<r.left||ev.clientY<r.top)return;
        var wx=(ev.clientX-r.left-view.x)/view.z,wy=(ev.clientY-r.top-view.y)/view.z;
        add({type:'furn',furn:f[0],name:f[1],cat:f[4],x:wx-f[2]/2,y:wy-f[3]/2,w:f[2],h:f[3]});
      }
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
    });
    grid.appendChild(c);
  }
  renderCats();fill();
  /* drag the palette by its header, like the dock card */
  var fh=pal.querySelector('.fph');
  fh.addEventListener('pointerdown',function(e){
    if(e.target.id==='fpx')return;
    e.preventDefault();
    var r=pal.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;
    pal.style.right='auto';
    function mv(ev){pal.style.left=Math.max(4,Math.min(innerWidth-r.width-4,ev.clientX-ox))+'px';pal.style.top=Math.max(4,Math.min(innerHeight-60,ev.clientY-oy))+'px';}
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  });
  el('cvFurn').onclick=function(){pal.hidden=!pal.hidden;};
  el('fpx').onclick=function(){pal.hidden=true;};
})();

/* ===================== projects ===================== */
function saveProjs(){localStorage.setItem(PROJS_KEY,JSON.stringify(projs));localStorage.setItem('sturij.canvas.curproj',curP);}
saveProjs();
(function(){
  var pill=el('projpill');if(!pill)return;
  function nameOf(){var p=projs.filter(function(q){return q.id===curP;})[0];return p?p.name:'Project';}
  pill.textContent=nameOf();
  pill.onclick=function(){
    if(pill.isContentEditable)return;
    var old=document.querySelector('.projmenu');if(old){old.remove();return;}
    var m=document.createElement('div');m.className='projmenu';
    projs.forEach(function(p){
      var r=document.createElement('button');r.className='pmrow'+(p.id===curP?' on':'');r.textContent=p.name;
      r.onclick=function(){m.remove();if(p.id!==curP){localStorage.setItem('sturij.canvas.curproj',p.id);location.reload();}};
      m.appendChild(r);});
    var nw=document.createElement('button');nw.className='pmrow pmnew';nw.textContent='+ New project';
    nw.onclick=function(){var np={id:'p'+Date.now(),name:'Project '+(projs.length+1)};projs.push(np);localStorage.setItem(PROJS_KEY,JSON.stringify(projs));localStorage.setItem('sturij.canvas.curproj',np.id);location.reload();};
    m.appendChild(nw);
    var rn=document.createElement('button');rn.className='pmrow pmnew';rn.textContent='Rename\u2026';
    rn.onclick=function(){m.remove();
      pill.contentEditable='true';pill.focus();
      var sel=window.getSelection(),rg=document.createRange();rg.selectNodeContents(pill);sel.removeAllRanges();sel.addRange(rg);
      function fin(){pill.contentEditable='false';var nm=pill.textContent.trim()||nameOf();pill.textContent=nm;projs.forEach(function(q){if(q.id===curP)q.name=nm;});saveProjs();pill.removeEventListener('blur',fin);}
      pill.addEventListener('blur',fin);
      pill.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();pill.blur();}});
    };
    m.appendChild(rn);
    document.body.appendChild(m);
    var r2=pill.getBoundingClientRect();m.style.left=r2.left+'px';m.style.top=(r2.bottom+10)+'px';
    setTimeout(function(){document.addEventListener('pointerdown',function h(ev){if(!m.contains(ev.target)){m.remove();document.removeEventListener('pointerdown',h);}});},0);
  };
})();
/* ===================== image library ===================== */
var lib=[];try{lib=JSON.parse(localStorage.getItem(LIBKEY)||'[]');}catch(e){}
function libSave(){try{localStorage.setItem(LIBKEY,JSON.stringify(lib));}catch(e){toast('Library full \u2014 remove some images');}}
function compressImg(src,cb){
  var im=new Image();
  im.onload=function(){
    var sc=Math.min(1,1600/Math.max(im.width,im.height));
    var cv=document.createElement('canvas');cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);
    cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
    var out=cv.toDataURL('image/jpeg',0.85);
    cb(out.length<src.length?out:src);
  };
  im.onerror=function(){cb(src);};
  im.src=src;
}
function libAdd(src,name){if(!src)return null;
  var ex=lib.filter(function(q){return q.src===src||q.orig===src;})[0];if(ex)return ex.id;
  var id='l'+Date.now()+Math.random().toString(36).slice(2,4);
  if(src.length<=400000){lib.push({id:id,src:src,name:name||''});libSave();renderLib();return id;}
  /* big photo: store a downscaled library copy (~1100px JPEG); board keeps full-res */
  var im=new Image();
  im.onload=function(){
    var sc=Math.min(1,1100/Math.max(im.width,im.height));
    var cv=document.createElement('canvas');cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);
    cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
    var small=cv.toDataURL('image/jpeg',0.8);
    if(lib.some(function(q){return q.orig===src;}))return;
    lib.push({id:id,src:small,orig:src,name:name||''});libSave();renderLib();
  };
  im.src=src;return id;}
function libSrc(ref){if(!ref)return null;if(/^(data:|http|showcase\/)/.test(ref))return ref;var q=lib.filter(function(p){return p.id===ref;})[0];return q?q.src:null;}
function renderLib(){
  var g=el('lpg');if(!g)return;g.innerHTML='';
  if(!lib.length){g.innerHTML='<div class="lpempty">Images you add to the board collect here \u2014 drag one out to place it</div>';return;}
  lib.forEach(function(p){
    var c=document.createElement('div');c.className='lpi';c.title=p.name||'';
    c.innerHTML='<img src="'+p.src+'" alt=""><button class="lpx">\u00d7</button>';
    c.querySelector('.lpx').addEventListener('pointerdown',function(e){e.stopPropagation();});
    c.querySelector('.lpx').onclick=function(e){e.stopPropagation();lib=lib.filter(function(q){return q!==p;});libSave();renderLib();};
    c.addEventListener('pointerdown',function(e){
      e.preventDefault();
      var ghost=document.createElement('img');ghost.className='lghost';ghost.src=p.src;document.body.appendChild(ghost);
      function place(ev){ghost.style.left=(ev.clientX-60)+'px';ghost.style.top=(ev.clientY-45)+'px';}
      place(e);
      function mv(ev){place(ev);}
      function up(ev){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);ghost.remove();
        var r=world.getBoundingClientRect();if(ev.clientX<r.left||ev.clientY<r.top)return;
        var wx=(ev.clientX-r.left-view.x)/view.z,wy=(ev.clientY-r.top-view.y)/view.z;
        var im=new Image();im.onload=function(){var w0=280,h0=Math.round(w0*im.height/im.width)+22;add({type:'img',src:p.src,name:p.name,x:wx-w0/2,y:wy-h0/2,w:w0,h:h0});};im.src=p.src;}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
    });
    g.appendChild(c);});
}
el('cvLib').onclick=function(){var p=el('libpal');p.hidden=!p.hidden;if(!p.hidden)renderLib();};
el('lbx').onclick=function(){el('libpal').hidden=true;};
/* one-off: compress oversized board images in place, then seed the library */
(function(){
  var big=items.filter(function(q){return q.type==='img'&&q.src&&q.src.length>400000;});
  var small=items.filter(function(q){return q.type==='img'&&q.src&&q.src.length<=400000;});
  small.forEach(function(q){libAdd(q.src,q.name);});
  var left=big.length;
  big.forEach(function(q){compressImg(q.src,function(sm){
    q.src=sm;var n0=nodeFor(q);if(n0){var im0=n0.querySelector('img');if(im0)im0.src=sm;}
    libAdd(sm,q.name);
    if(--left===0){qsave();libSave();toast('Board images compressed for storage');}
  });});
})();
/* ===================== pins + lightbox ===================== */
el('cvPin').onclick=function(){var c=centre();add({type:'pin',x:c.x-18,y:c.y-23,w:36,h:46,photos:[]});toast('Pin dropped \u2014 click it to attach photos');};
function pinSVG(count){
  return '<svg viewBox="0 0 36 46" style="width:100%;height:100%;display:block;filter:drop-shadow(0 3px 6px rgba(35,31,27,.3))"><path d="M18 45C18 45 4 27 4 16a14 14 0 1 1 28 0c0 11-14 29-14 29z" fill="#D4A01B" stroke="#1D1D1D" stroke-width="1.6"/><circle cx="18" cy="16" r="6.5" fill="#FAF8F3"/>'+(count>1?'<text x="18" y="19.5" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" font-weight="600" fill="#1D1D1D">'+count+'</text>':'')+'</svg>';}
function openPin(it){
  var ph=(it.photos||[]).map(libSrc).filter(Boolean);
  if(ph.length)pinLightbox(it,ph);else pinPicker(it);
}
function pinPicker(it){
  var old=document.querySelector('.pinpick');if(old)old.remove();
  var n=nodeFor(it);if(!n)return;
  var pop=document.createElement('div');pop.className='pinpick oped';
  var inner='<div class="oh">Pin photos</div><div class="ppgrid">';
  if(!lib.length)inner+='<div class="lpempty">No images in the library yet \u2014 add photos to the board first</div>';
  lib.forEach(function(p){var onSel=(it.photos||[]).indexOf(p.id)>=0;
    inner+='<div class="ppth'+(onSel?' on':'')+'" data-lid="'+p.id+'"><img src="'+p.src+'"></div>';});
  inner+='</div><div class="oprow"><button class="orm">Remove pin</button><button class="ook">Done</button></div>';
  pop.innerHTML=inner;
  pop.addEventListener('pointerdown',function(e){e.stopPropagation();});
  pop.querySelectorAll('.ppth').forEach(function(t){t.addEventListener('click',function(){
    var lid=t.getAttribute('data-lid');it.photos=it.photos||[];
    var ix=it.photos.indexOf(lid);
    if(ix>=0)it.photos.splice(ix,1);else it.photos.push(lid);
    t.classList.toggle('on',ix<0);qsave();
    n.querySelector('.inner').innerHTML=pinSVG((it.photos||[]).length);
  });});
  pop.querySelector('.orm').onclick=function(){pop.remove();items=items.filter(function(q){return q!==it;});n.remove();qsave();};
  pop.querySelector('.ook').onclick=function(){pop.remove();};
  n.appendChild(pop);
}
function pinLightbox(it,ph){
  var i=0;
  var ov=document.createElement('div');ov.className='lboxov';
  ov.innerHTML='<button class="lbc">\u00d7</button><button class="lba lbp">\u2039</button><img class="lbimg"><button class="lba lbn">\u203a</button><div class="lbfoot"><span class="lbcount"></span><button class="lbman">Manage</button></div>';
  function show(){ov.querySelector('.lbimg').src=ph[i];ov.querySelector('.lbcount').textContent=(i+1)+' / '+ph.length;
    var one=ph.length<2;ov.querySelector('.lbp').style.visibility=one?'hidden':'visible';ov.querySelector('.lbn').style.visibility=one?'hidden':'visible';}
  ov.querySelector('.lbp').onclick=function(e){e.stopPropagation();i=(i-1+ph.length)%ph.length;show();};
  ov.querySelector('.lbn').onclick=function(e){e.stopPropagation();i=(i+1)%ph.length;show();};
  ov.querySelector('.lbc').onclick=function(){ov.remove();};
  ov.querySelector('.lbman').onclick=function(e){e.stopPropagation();ov.remove();pinPicker(it);};
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  function key(e){if(e.key==='Escape'){ov.remove();document.removeEventListener('keydown',key);}
    if(e.key==='ArrowLeft')ov.querySelector('.lbp').click();if(e.key==='ArrowRight')ov.querySelector('.lbn').click();}
  document.addEventListener('keydown',key);
  document.body.appendChild(ov);show();
}

/* ===================== trade plans ===================== */
var TRADES=[
 ['plumber','Plumber',['plumb','bath'],['sink','dw','wm']],
 ['electrician','Electrician',['light'],[]],
 ['joiner','Joiner',['kitchen','office','bed'],[]],
 ['flooring','Flooring',[],[]],
 ['decorator','Decorator',[],[]],
 ['plasterer','Plasterer',[],[]]
];
el('cvTrade').onclick=function(){
  var plans=items.filter(function(q){return q.type==='plan';});
  if(!plans.length){toast('Draw a floor plan first');return;}
  var selN=document.querySelector('.citem.plan.sel');
  var pl=plans[0];if(selN)plans.forEach(function(q){if(q.id===selN.dataset.id)pl=q;});
  var ov=document.createElement('div');ov.className='trmodal';
  ov.innerHTML='<div class="trbox"><div class="oh">Trade plan \u00b7 '+(pl.name||'Floor plan')+'</div><div class="trgrid">'
    +TRADES.map(function(t){return '<button data-t="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  ov.querySelectorAll('[data-t]').forEach(function(b){b.onclick=function(){ov.remove();tradeSheet(b.getAttribute('data-t'),pl);};});
  document.body.appendChild(ov);
};
function planItemsFor(pl,cats,extra){
  var fx=pl.x+18,fy=pl.y+46,fw=pl.w-36,fh=pl.h-64,base=planBaseFor(pl);
  var minX=1e9,minY=1e9;pl.verts.forEach(function(v){minX=Math.min(minX,v[0]);minY=Math.min(minY,v[1]);});
  return items.filter(function(q){return q.type==='furn'&&(cats.indexOf(q.cat)>=0||extra.indexOf(q.furn)>=0);}).map(function(q){
    var cx=q.x+q.w/2,cy=q.y+q.h/2;
    if(cx<fx||cx>fx+fw||cy<fy||cy>fy+fh)return null;
    var px=(cx-fx)/fw*base.w,py=(cy-fy)/fh*base.h;
    var mm=[(px-base.ox)/base.s,(py-base.oy)/base.s];
    return {it:q,x:Math.round((mm[0]-minX)/10)*10,y:Math.round((mm[1]-minY)/10)*10,mm:mm};
  }).filter(Boolean);
}
function tradeSheet(tk,pl){
  var t=TRADES.filter(function(q){return q[0]===tk;})[0];
  var listed=planItemsFor(pl,t[2],t[3]);
  var base=planBaseFor(pl);
  function S2(p){return [base.ox+p[0]*base.s,base.oy+p[1]*base.s];}
  var marks='';
  listed.forEach(function(en,i){var sp=S2(en.mm);
    marks+='<circle cx="'+sp[0]+'" cy="'+sp[1]+'" r="11" fill="#D4A01B" stroke="#1D1D1D" stroke-width="1.2"/><text x="'+sp[0]+'" y="'+(sp[1]+3.8)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10.5" font-weight="600" fill="#1D1D1D">'+(i+1)+'</text>';});
  var svg=planSVG(pl).replace('</svg>',marks+'</svg>');
  var K='<style>body{margin:0;background:#FAF8F3;color:#1D1D1D;font-family:"IBM Plex Mono",monospace}'
    +'.hd{display:flex;justify-content:space-between;align-items:baseline;padding:34px 44px 10px}'
    +'.k{font:500 11px "IBM Plex Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:#62584F}'
    +'h1{font:400 26px "Source Serif 4",serif;margin:4px 0 0}'
    +'.pw{margin:14px 44px;background:#FFF;border:1px solid #D4A01B;border-radius:8px}'
    +'.pw>div{width:100%;height:520px}'
    +'table{border-collapse:collapse;margin:8px 44px 30px;width:calc(100% - 88px)}'
    +'th{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#62584F;text-align:left;padding:7px 10px;border-bottom:1px solid #D4A01B}'
    +'td{font:400 12px "IBM Plex Mono",monospace;padding:7px 10px;border-bottom:1px solid rgba(29,29,29,.1)}'
    +'.num{width:26px;height:26px;border-radius:50%;background:#D4A01B;color:#1D1D1D;display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:11px}'
    +'.pr{position:fixed;top:16px;right:16px;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;background:#1D1D1D;color:#FAF8F3;border:0;border-radius:999px;padding:10px 18px;cursor:pointer}'
    +'@media print{.pr{display:none}}</style>';
  var head='<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">';
  var projName=(projs.filter(function(q){return q.id===curP;})[0]||{}).name||'Project';
  var body='<button class="pr" onclick="print()">Save as PDF</button>'
    +'<div class="hd"><div><div class="k">Sturij \u00b7 '+projName+'</div><h1>'+t[1].charAt(0).toUpperCase()+t[1].slice(1)+'\u2019s plan \u00b7 '+(pl.name||'Floor plan')+'</h1></div>'
    +'<div class="k">'+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+' \u00b7 '+(polygonArea(pl.verts)/1e6).toFixed(1)+' m\u00b2</div></div>'
    +'<div class="pw"><div>'+svg+'</div></div>';
  if(listed.length){
    body+='<table><tr><th></th><th>Item</th><th>Size (mm)</th><th>X from origin</th><th>Y from origin</th></tr>';
    listed.forEach(function(en,i){body+='<tr><td><span class="num">'+(i+1)+'</span></td><td>'+en.it.name+'</td><td>'+Math.round(en.it.w*10)+' \u00d7 '+Math.round(en.it.h*10)+'</td><td>'+en.x+'</td><td>'+en.y+'</td></tr>';});
    body+='</table>';
  }else if(t[2].length){body+='<div class="k" style="margin:16px 44px">No '+t[1].toLowerCase()+' items placed on this plan yet \u2014 drag them from the Furniture palette onto the plan.</div>';}
  if(tk==='joiner'){
    body+='<table><tr><th>Internal wall</th><th>Length (mm)</th><th>Thickness</th></tr>';
    (pl.inWalls||[]).forEach(function(iw,i){body+='<tr><td>P'+(i+1)+'</td><td>'+Math.round(Math.hypot(iw.b[0]-iw.a[0],iw.b[1]-iw.a[1]))+'</td><td>'+(iw.t||100)+'</td></tr>';});
    body+='</table><table><tr><th>Opening</th><th>Wall</th><th>Width \u00d7 height (mm)</th><th>Sill</th></tr>';
    (pl.openings||[]).forEach(function(op){body+='<tr><td>'+(op.type==='door'?'Door':'Window')+'</td><td>W'+(op.wall+1)+'</td><td>'+op.width+' \u00d7 '+op.height+'</td><td>'+(op.type==='door'?'\u2014':(op.sill||0))+'</td></tr>';});
    body+='</table>';
  }
  if(tk==='flooring'){
    body+='<table><tr><th>Area</th><th>m\u00b2</th><th>Finish</th></tr>';
    body+='<tr><td>Whole floor</td><td>'+(polygonArea(pl.verts)/1e6).toFixed(1)+'</td><td>'+(pl.floorSrc?'As laid sample':'\u2014')+'</td></tr>';
    (pl.zones||[]).forEach(function(z){body+='<tr><td>'+(z.name||'Zone')+'</td><td>'+((z.w*z.h)/1e6).toFixed(1)+'</td><td>\u2014</td></tr>';});
    body+='</table>';
  }
  if(tk==='decorator'||tk==='plasterer'){
    var Hgt=2.4,tot=0;
    body+='<table><tr><th>Wall</th><th>Length (mm)</th>'+(tk==='plasterer'?'<th>Area @ 2.4m (m\u00b2)</th>':'<th>Colour</th><th>Notes</th>')+'</tr>';
    pl.verts.forEach(function(v,i){
      var L=Math.round(wallLen(pl.verts,i));
      if(tk==='plasterer'){var ar=L/1000*Hgt;tot+=ar;body+='<tr><td>W'+(i+1)+'</td><td>'+L+'</td><td>'+ar.toFixed(1)+'</td></tr>';}
      else{var col=(pl.wallCols&&pl.wallCols[i])||pl.wallHex||'\u2014';
        var nt=(pl.wallNotes&&pl.wallNotes[i]&&pl.wallNotes[i].text)||'';
        body+='<tr><td>W'+(i+1)+'</td><td>'+L+'</td><td>'+(col!=='\u2014'?'<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+col+';vertical-align:-1px;margin-right:6px"></span>':'')+col+'</td><td>'+nt.replace(/</g,'&lt;').replace(/\n/g,' \u00b7 ')+'</td></tr>';}});
    if(tk==='plasterer')body+='<tr><td></td><td class="k">Total</td><td>'+tot.toFixed(1)+'</td></tr>';
    body+='</table>';
  }
  var w=window.open('','_blank');
  if(!w){toast('Allow pop-ups to open the trade plan');return;}
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Sturij \u2014 '+t[1]+' plan</title>'+head+K+'</head><body>'+body+'</body></html>');
  w.document.close();
}

/* ===================== info modal: paint calculator + guides ===================== */
el('cvInfo').onclick=function(){
  var plans=items.filter(function(q){return q.type==='plan';});
  if(!plans.length){toast('Draw a floor plan first \u2014 the calculator works from it');return;}
  var selN=document.querySelector('.citem.plan.sel');
  var pl=plans[0];if(selN)plans.forEach(function(q){if(q.id===selN.dataset.id)pl=q;});
  openInfo(pl);
};
function paintCalc(pl,o){
  var H=2.4,perim=0;pl.verts.forEach(function(v,i){perim+=wallLen(pl.verts,i);});perim/=1000;
  var ops=pl.openings||[],opArea=0,doors=0,wins=0;
  ops.forEach(function(op){opArea+=op.width/1000*op.height/1000;if(op.type==='door')doors++;else wins++;});
  (pl.inWalls||[]).forEach(function(iw){perim+=2*Math.hypot(iw.b[0]-iw.a[0],iw.b[1]-iw.a[1])/1000;});
  var walls=Math.max(0,perim*H-opArea),ceilA=polygonArea(pl.verts)/1e6,wc=walls+ceilA;
  var wood=perim*0.15+doors*3.2+wins*0.6; /* skirting 150mm + door faces/frames + window frames */
  var f=1;
  if(o.age==='pre1950')f*=1.15;else if(o.age==='mid')f*=1.08;
  if(o.cond==='poor')f*=1.15;else if(o.cond==='fair')f*=1.05;
  var topCoats=o.mode==='lasting'?2:1;
  var primFrac=(o.mode==='lasting'||o.cond==='poor'||o.age==='new')?1:0.25;
  var cont=1+(o.cont||10)/100;
  var wcPrimL=wc*primFrac/10*f*cont, wcTopL=wc*topCoats/12*f*cont;
  var wdPrimL=wood*primFrac/10*f*cont, wdTopL=wood*(o.mode==='lasting'?2:1)/14*f*cont;
  function tins(L,can){return Math.max(1,Math.ceil(L/can));}
  var hrs=(o.mode==='lasting'?wc/4+wood/2:wc/8+wood/3)*f;
  return {
    wc:wc,wood:wood,walls:walls,ceilA:ceilA,f:f,cont:cont,hrs:hrs,days:Math.max(0.5,Math.round(hrs/8*2)/2),
    rows:[
      ['Walls + ceilings \u00b7 primer',wcPrimL,tins(wcPrimL,o.canW),o.canW],
      ['Walls + ceilings \u00b7 topcoat \u00d7'+topCoats,wcTopL,tins(wcTopL,o.canW),o.canW],
      ['Woodwork \u00b7 primer/undercoat',wdPrimL,tins(wdPrimL,o.canD),o.canD],
      ['Woodwork \u00b7 topcoat',wdTopL,tins(wdTopL,o.canD),o.canD]
    ]};
}
function wallpaperCalc(pl,o){
  var H=2.4,perim=0;pl.verts.forEach(function(v,i){perim+=wallLen(pl.verts,i);});
  var strips=Math.ceil(perim/(o.wp.w||530));
  var dropH=H+(o.wp.rep||0)/100,dpr=Math.max(1,Math.floor((o.wp.len||10.05)/dropH));
  var rolls=Math.ceil(strips/dpr*(1+(o.cont||10)/100));
  return {strips:strips,dpr:dpr,rolls:rolls,perim:perim/1000};
}
var EPRICE={standard:{wallPaint:28,woodPaint:18,wallpaper:35,hardFloor:25,underlay:4,carpet:18,gripper:5.5,decDay:220,fitDay:180},
            premium:{wallPaint:55,woodPaint:32,wallpaper:80,hardFloor:55,underlay:6,carpet:40,gripper:7,decDay:280,fitDay:220}};
var EWASTE={straight:0.08,diagonal:0.12,herringbone:0.15,chevron:0.2,tile:0.1};
function estCalc(pl,o){
  var r=paintCalc(pl,o),cont=1+(o.cont||10)/100,coats=o.mode==='lasting'?2:1;
  var P=EPRICE[o.tier==='premium'?'premium':'standard'];
  function uc(key,def){return (o.tier==='custom'&&o.custom[key]!=null)?o.custom[key]:def;}
  var lines=[],labourH=0;
  if(o.scope.walls){
    if(o.wallFin==='paper'){var wp=wallpaperCalc(pl,o);
      lines.push({k:'wallpaper',label:'Wallpaper \u00b7 '+wp.strips+' drops',qty:wp.rolls,unit:'roll',u:uc('wallpaper',P.wallpaper)});
      labourH+=wp.strips*0.4;}
    else{var wl=r.walls*coats/12*r.f*cont,wt=Math.max(1,Math.ceil(wl/o.canW));
      lines.push({k:'wallPaint',label:'Wall paint \u00b7 '+wl.toFixed(1)+'L',qty:wt,unit:o.canW+'L tin',u:uc('wallPaint',P.wallPaint)});
      labourH+=r.walls/8*(o.mode==='lasting'?2:1);}}
  if(o.scope.ceil){var cl=r.ceilA*coats/12*r.f*cont,ct2=Math.max(1,Math.ceil(cl/o.canW));
    lines.push({k:'ceilPaint',label:'Ceiling paint \u00b7 '+cl.toFixed(1)+'L',qty:ct2,unit:o.canW+'L tin',u:uc('ceilPaint',P.wallPaint)});
    labourH+=r.ceilA/7*coats;}
  if(o.scope.wood){var wdl=r.wood*(coats+1)/12*r.f*cont,wdt=Math.max(1,Math.ceil(wdl/o.canD));
    lines.push({k:'woodPaint',label:'Woodwork paint \u00b7 '+wdl.toFixed(1)+'L',qty:wdt,unit:o.canD+'L tin',u:uc('woodPaint',P.woodPaint)});
    labourH+=r.wood/2.5;}
  var fitDays=0;
  if(o.scope.floor){
    var regions=[],zoneA=0;
    (pl.zones||[]).forEach(function(z,zi){var A=z.w*z.h/1e6;zoneA+=A;regions.push({name:z.name||('Zone '+(zi+1)),area:A,type:o.zoneTypes[zi]||o.floorType});});
    var rest=Math.max(0,r.ceilA-zoneA);
    if(rest>0.5||!regions.length)regions.push({name:regions.length?'Remaining floor':'Whole floor',area:rest>0.5?rest:r.ceilA,type:o.floorType});
    regions.forEach(function(rg,i){
      if(rg.type==='hard'){var waste=EWASTE[o.pattern]||0.08,q=rg.area*(1+waste);
        lines.push({k:'hard'+i,label:rg.name+' \u00b7 '+o.pattern+' \u00b7 '+rg.area.toFixed(1)+'m\u00b2 +'+Math.round(waste*100)+'%',qty:+q.toFixed(1),unit:'m\u00b2',u:uc('hardFloor',P.hardFloor)});
        lines.push({k:'und'+i,label:rg.name+' \u00b7 underlay',qty:+rg.area.toFixed(1),unit:'m\u00b2',u:uc('underlay',P.underlay)});}
      else{lines.push({k:'carp'+i,label:rg.name+' \u00b7 carpet \u00b7 '+rg.area.toFixed(1)+'m\u00b2 +10%',qty:+(rg.area*1.1).toFixed(1),unit:'m\u00b2',u:uc('carpet',P.carpet)});
        lines.push({k:'grip'+i,label:rg.name+' \u00b7 underlay + gripper',qty:+rg.area.toFixed(1),unit:'m\u00b2',u:uc('gripper',P.gripper)});}});
    fitDays=Math.max(0.5,Math.round(r.ceilA/25*2)/2);
  }
  var decDays=Math.max(0.5,Math.round(labourH/8*2)/2);
  if(labourH>0)lines.push({k:'decDay',label:'Decorator \u00b7 '+decDays+' day'+(decDays===1?'':'s'),qty:decDays,unit:'day',u:uc('decDay',P.decDay)});
  if(fitDays>0)lines.push({k:'fitDay',label:'Floor fitter \u00b7 '+fitDays+' day'+(fitDays===1?'':'s'),qty:fitDays,unit:'day',u:uc('fitDay',P.fitDay)});
  var tot=0;lines.forEach(function(l){l.cost=l.qty*l.u;tot+=l.cost;});
  return {lines:lines,total:tot,decDays:decDays,fitDays:fitDays};
}
function openInfo(pl){
  var o={age:'mid',cond:'good',mode:'refresh',canW:5,canD:1,cont:10,
    wp:{w:530,len:10.05,rep:0},room:'living',wallFin:'paint',floorType:'hard',pattern:'straight',tier:'standard',custom:{},
    scope:{walls:true,ceil:true,wood:true,floor:true},zoneTypes:{}};
  var ov=document.createElement('div');ov.className='trmodal infomod';
  ov.innerHTML='<div class="trbox infobox"><div class="ifhd"><span class="oh">'+(pl.name||'Floor plan')+' \u00b7 room information</span><button class="ifx">\u00d7</button></div>'
    +'<div class="iftabs"><button class="ift on" data-t="paint">Paint</button><button class="ift" data-t="paper">Wallpaper</button><button class="ift" data-t="est">Estimate</button><button class="ift" data-t="ward">Wardrobes</button><button class="ift" data-t="guides">Guides</button></div>'
    +'<div class="ifbody" id="ifbody"></div></div>';
  function seg(id,opts,cur){return '<span class="wseg">'+opts.map(function(q){return '<button data-k="'+id+'" data-v="'+q[0]+'" class="'+(String(cur)===String(q[0])?'on':'')+'">'+q[1]+'</button>';}).join('')+'</span>';}
  function chk(id,label,onSel){return '<button class="ifchk'+(onSel?' on':'')+'" data-c="'+id+'">'+label+'</button>';}
  function paintTab(){
    var r=paintCalc(pl,o);
    var h='<div class="ifrow"><span>Property age</span>'+seg('age',[['pre1950','Pre-1950'],['mid','1950\u20132010'],['new','New build']],o.age)+'</div>'
      +'<div class="ifrow"><span>Condition</span>'+seg('cond',[['good','Good'],['fair','Fair'],['poor','Poor']],o.cond)+'</div>'
      +'<div class="ifrow"><span>Finish</span>'+seg('mode',[['refresh','Refresh'],['lasting','Long-lasting']],o.mode)+'</div>'
      +'<div class="ifrow"><span>Can \u00b7 walls</span>'+seg('canW',[[2.5,'2.5L'],[5,'5L'],[10,'10L']],o.canW)+'</div>'
      +'<div class="ifrow"><span>Can \u00b7 wood</span>'+seg('canD',[[0.75,'0.75L'],[1,'1L'],[2.5,'2.5L']],o.canD)+'</div>'
      +'<div class="ifrow"><span>Contingency</span><span class="wgc"><input type="range" id="ifcont" min="0" max="25" step="5" value="'+o.cont+'"><b>'+o.cont+'%</b></span></div>'
      +'<div class="ifareas">Walls + ceilings '+r.wc.toFixed(1)+' m\u00b2 \u00b7 woodwork '+r.wood.toFixed(1)+' m\u00b2 \u00b7 time allowance <b>'+r.days+' day'+(r.days===1?'':'s')+'</b> ('+(o.mode==='lasting'?'long-lasting':'refresh')+')</div>'
      +'<table class="iftab"><tr><th></th><th>Litres</th><th>Tins</th></tr>';
    r.rows.forEach(function(row){h+='<tr><td>'+row[0]+'</td><td>'+row[1].toFixed(1)+'L</td><td><b>'+row[2]+'</b> \u00d7 '+row[3]+'L</td></tr>';});
    h+='</table><div class="ifrow"><button class="ifpdf">Best-practice guide \u00b7 print / PDF</button></div>';
    return h;
  }
  function paperTab(){
    var wp=wallpaperCalc(pl,o);
    return '<div class="ifrow"><span>Roll width</span>'+seg('wpw',[[530,'530mm'],[686,'686mm'],[1000,'1000mm']],o.wp.w)+'</div>'
      +'<div class="ifrow"><span>Roll length</span>'+seg('wpl',[[10.05,'10.05m'],[15,'15m'],[25,'25m']],o.wp.len)+'</div>'
      +'<div class="ifrow"><span>Pattern repeat</span>'+seg('wpr',[[0,'None'],[32,'32cm'],[64,'64cm']],o.wp.rep)+'</div>'
      +'<div class="ifrow"><span>Contingency</span><span class="wgc"><input type="range" id="ifcont" min="0" max="25" step="5" value="'+o.cont+'"><b>'+o.cont+'%</b></span></div>'
      +'<div class="ifareas">Perimeter '+wp.perim.toFixed(1)+'m \u00b7 2.4m drops \u00b7 '+wp.dpr+' drops per roll</div>'
      +'<table class="iftab"><tr><th></th><th></th></tr>'
      +'<tr><td>Drops needed</td><td><b>'+wp.strips+'</b></td></tr>'
      +'<tr><td>Rolls (incl. '+o.cont+'%)</td><td><b>'+wp.rolls+'</b></td></tr></table>'
      +'<div class="ifareas">Openings are ignored per standard practice \u2014 offcuts dress reveals and repairs.</div>';
  }
  function estTab(){
    var e=estCalc(pl,o);
    var h='<div class="ifrow"><span>Room</span><select class="ifsel" id="ifroom">'+[['kitchen','Kitchen'],['utility','Utility'],['living','Living room'],['dining','Dining room'],['bed','Bedroom'],['office','Home office'],['bath','Bathroom'],['ensuite','Ensuite'],['hall','Hall + landing']].map(function(q){return '<option value="'+q[0]+'"'+(o.room===q[0]?' selected':'')+'>'+q[1]+'</option>';}).join('')+'</select></div>'
      +'<div class="ifrow"><span>Decorating</span><span class="ifchks">'+chk('walls','Walls',o.scope.walls)+chk('ceil','Ceilings',o.scope.ceil)+chk('wood','Woodwork',o.scope.wood)+chk('floor','Flooring',o.scope.floor)+'</span></div>';
    if(o.scope.walls)h+='<div class="ifrow"><span>Walls</span>'+seg('wallFin',[['paint','Paint'],['paper','Wallpaper']],o.wallFin)+'</div>';
    if(o.scope.floor){
      h+='<div class="ifrow"><span>Flooring</span>'+seg('floorType',[['hard','Hard'],['soft','Soft']],o.floorType)+'</div>';
      (pl.zones||[]).forEach(function(z,zi){
        h+='<div class="ifrow ifzone"><span>'+(z.name||('Zone '+(zi+1)))+' \u00b7 '+((z.w*z.h)/1e6).toFixed(1)+'m\u00b2</span>'+seg('zt'+zi,[['hard','Hard'],['soft','Soft']],o.zoneTypes[zi]||o.floorType)+'</div>';});
      if(o.floorType==='hard'||(pl.zones||[]).some(function(z,zi){return (o.zoneTypes[zi]||o.floorType)==='hard';}))
        h+='<div class="ifrow"><span>Pattern</span>'+seg('pattern',[['straight','Straight'],['diagonal','Diagonal'],['herringbone','Herringbone'],['chevron','Chevron'],['tile','Tile']],o.pattern)+'</div>';
    }
    h+='<div class="ifrow"><span>Materials</span>'+seg('tier',[['standard','Standard'],['premium','Premium'],['custom','Custom \u00a3']],o.tier)+'</div>'
      +'<table class="iftab estab"><tr><th>Item</th><th>Qty</th><th>Unit \u00a3</th><th>\u00a3</th></tr>';
    e.lines.forEach(function(l){
      h+='<tr><td>'+l.label+'</td><td>'+l.qty+' \u00d7 '+l.unit+'</td><td>'
        +(o.tier==='custom'?'<input class="ifuc" data-uk="'+l.k.replace(/[0-9]+$/,'')+'" type="number" step="1" value="'+l.u+'">':('\u00a3'+l.u))
        +'</td><td>\u00a3'+Math.round(l.cost)+'</td></tr>';});
    h+='<tr class="iftot"><td>Room budget \u00b7 '+(o.mode==='lasting'?'long-lasting':'refresh')+'</td><td></td><td></td><td>\u00a3'+Math.round(e.total)+'</td></tr></table>'
      +'<div class="ifareas">Decorator '+e.decDays+'d'+(e.fitDays?' \u00b7 floor fitter '+e.fitDays+'d':'')+' \u00b7 prices are planning allowances, not quotes</div>';
    return h;
  }
  var WPRICE={standard:{unit:340,slide:290,drawer:120,shelf:45,rail:22,shoe:38,fitDay:200},
            premium:{unit:620,slide:520,drawer:210,shelf:80,rail:38,shoe:65,fitDay:240}};
  function wardCalc(){
    var placed=planItemsFor(pl,['ward'],[]);
    var P=WPRICE[o.tier==='premium'?'premium':'standard'];
    function uc(key,def){return (o.tier==='custom'&&o.custom['wd_'+key]!=null)?o.custom['wd_'+key]:def;}
    var lines=[],runMM=0,units=0;
    placed.forEach(function(en){
      var q=en.it,wmm=Math.round(q.w*10);
      if(q.furn==='wslide'){lines.push({k:'slide',label:'Sliding run \u00b7 '+wmm+'mm',qty:+(wmm/1000).toFixed(2),unit:'lin m',u:uc('slide',P.slide)});runMM+=wmm;}
      else if(q.furn==='wcorner'){lines.push({k:'unit',label:'Corner unit \u00b7 '+wmm+' \u00d7 '+Math.round(q.h*10),qty:+(wmm/1000*1.4).toFixed(2),unit:'lin m',u:uc('unit',P.unit)});runMM+=wmm;units++;}
      else if(q.furn==='wdrawer')lines.push({k:'drawer',label:'Drawer pack',qty:1,unit:'pack',u:uc('drawer',P.drawer)});
      else if(q.furn==='wshelf')lines.push({k:'shelf',label:'Shelf pack',qty:1,unit:'pack',u:uc('shelf',P.shelf)});
      else if(q.furn==='wrail')lines.push({k:'rail',label:'Hanging rail \u00b7 '+wmm+'mm',qty:1,unit:'rail',u:uc('rail',P.rail)});
      else if(q.furn==='wshoe')lines.push({k:'shoe',label:'Shoe rack',qty:1,unit:'rack',u:uc('shoe',P.shoe)});
      else{lines.push({k:'unit',label:(q.name||'Unit')+' \u00b7 '+wmm+'mm',qty:+(wmm/1000).toFixed(2),unit:'lin m',u:uc('unit',P.unit)});runMM+=wmm;units++;}
    });
    /* merge identical internals into one line */
    var merged=[];lines.forEach(function(l){
      var m=merged.filter(function(x){return x.k===l.k&&x.unit===l.unit&&l.unit!=='lin m';})[0];
      if(m){m.qty+=l.qty;m.label=l.label.replace(/ \u00b7 .*/,'')+' \u00d7 '+m.qty;}else merged.push(l);});
    var fitDays=placed.length?Math.max(0.5,Math.round((runMM/2400+merged.length*0.1)*2)/2):0;
    if(fitDays)merged.push({k:'fitDay',label:'Sturij fitter \u00b7 '+fitDays+' day'+(fitDays===1?'':'s'),qty:fitDays,unit:'day',u:uc('fitDay',P.fitDay)});
    var tot=0;merged.forEach(function(l){l.cost=l.qty*l.u;tot+=l.cost;});
    return {lines:merged,total:tot,run:runMM,units:units,placed:placed.length};
  }
  function wardTab(){
    var wv=wardCalc();
    if(!wv.placed)return '<div class="ifareas">No wardrobe units on this plan yet \u2014 open the Furniture palette, pick <b>Fitted wardrobes</b> and drag units against a wall. Drop drawer packs, shelves and rails inside a unit to spec its internals.</div>';
    var h='<div class="ifrow"><span>Materials</span>'+seg('tier',[['standard','Standard'],['premium','Premium'],['custom','Custom \u00a3']],o.tier)+'</div>'
      +'<div class="ifareas">Run '+(wv.run/1000).toFixed(2)+' lin m \u00b7 '+wv.units+' unit'+(wv.units===1?'':'s')+' \u00b7 2.4m tall carcass assumed</div>'
      +'<table class="iftab estab"><tr><th>Item</th><th>Qty</th><th>Unit \u00a3</th><th>\u00a3</th></tr>';
    wv.lines.forEach(function(l){
      h+='<tr><td>'+l.label+'</td><td>'+l.qty+' \u00d7 '+l.unit+'</td><td>'
        +(o.tier==='custom'?'<input class="ifuc" data-uk="wd_'+l.k+'" type="number" step="1" value="'+l.u+'">':('\u00a3'+l.u))
        +'</td><td>\u00a3'+Math.round(l.cost)+'</td></tr>';});
    h+='<tr class="iftot"><td>Wardrobe budget</td><td></td><td></td><td>\u00a3'+Math.round(wv.total)+'</td></tr></table>'
      +'<div class="ifareas">Planning allowance, not a quote \u00b7 wardrobe units are excluded from room renders</div>';
    return h;
  }
  function guidesTab(){
    function g(q,t,d){return '<a class="ifg" href="https://www.youtube.com/results?search_query='+q+'" target="_blank" rel="noopener"><b>'+t+'</b><span>'+d+'</span></a>';}
    return '<div class="ifgl">'
      +g('how+to+prepare+walls+for+painting','Preparing walls','Filling, sanding, caulking and washing down before any paint goes on')
      +g('how+to+cut+in+painting+walls','Cutting in','Clean lines at ceilings, corners and woodwork without tape')
      +g('how+to+paint+a+ceiling+without+roller+marks','Ceilings','Rolling wet-edge technique to avoid banding and flashing')
      +g('how+to+paint+skirting+boards+and+door+frames','Woodwork','Undercoat and topcoat on skirting, architrave and doors')
      +g('how+to+hang+wallpaper+for+beginners','Wallpaper','Pasting, matching and trimming \u2014 for papered feature walls')
      +g('how+to+lay+herringbone+flooring','Hard flooring','Setting out, expansion gaps and pattern work')
      +'</div><div class="ifareas">Links open video guides on YouTube \u00b7 pin site photos to the plan for your trades</div>';
  }
  var body=ov.querySelector('#ifbody'),curTab='paint';
  function draw(tab){
    curTab=tab||curTab;
    body.innerHTML=curTab==='paint'?paintTab():curTab==='paper'?paperTab():curTab==='est'?estTab():curTab==='ward'?wardTab():guidesTab();
    body.querySelectorAll('[data-k]').forEach(function(b){b.onclick=function(){
      var k=b.getAttribute('data-k'),v=b.getAttribute('data-v');
      if(k==='canW'||k==='canD')o[k]=+v;
      else if(k==='wpw')o.wp.w=+v;else if(k==='wpl')o.wp.len=+v;else if(k==='wpr')o.wp.rep=+v;
      else if(k.indexOf('zt')===0)o.zoneTypes[+k.slice(2)]=v;
      else o[k]=v;
      draw();};});
    var ct=body.querySelector('#ifcont');
    if(ct)ct.oninput=function(){o.cont=+this.value;draw();};
    body.querySelectorAll('.ifchk').forEach(function(b){b.onclick=function(){var c=b.getAttribute('data-c');o.scope[c]=!o.scope[c];draw();};});
    var rm=body.querySelector('#ifroom');
    if(rm)rm.onchange=function(){o.room=this.value;draw();};
    body.querySelectorAll('.ifuc').forEach(function(inp){inp.addEventListener('change',function(){o.custom[inp.getAttribute('data-uk')]=+inp.value||0;draw();});});
    var pdf=body.querySelector('.ifpdf');
    if(pdf)pdf.onclick=function(){bestPractice(pl,o);};
  }
  ov.querySelectorAll('.ift').forEach(function(t){t.onclick=function(){
    ov.querySelectorAll('.ift').forEach(function(q){q.classList.toggle('on',q===t);});
    draw(t.getAttribute('data-t'));};});
  ov.querySelector('.ifx').onclick=function(){ov.remove();};
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);draw('paint');
}
function bestPractice(pl,o){
  var r=paintCalc(pl,o);
  var w=window.open('','_blank');
  if(!w){toast('Allow pop-ups for the guide');return;}
  var projName=(projs.filter(function(q){return q.id===curP;})[0]||{}).name||'Project';
  var steps=[
    ['Clear + protect','Empty the room where possible. Dust sheets on floors, low-tack tape on fixed edges. Remove switch and socket covers rather than cutting round them.'],
    ['Wash down','Sugar-soap all painted surfaces \u2014 paint will not bond to grease or nicotine. Rinse and let dry fully.'],
    ['Repair','Rake out and fill cracks and holes; two thin fills beat one thick one. Sand filled patches flush (120 grit) and dust off.'],
    ['Prime','Spot-prime bare patches and stains'+(o.mode==='lasting'?'; full-prime for the long-lasting finish':'')+'. Use stain block over water marks \u2014 emulsion alone will not hold them.'],
    ['Sequence','Ceiling first, then walls, then woodwork last. Cut in each surface before rolling, and keep a wet edge \u2014 finish a whole wall before breaking.'],
    ['Coats','Walls + ceilings: '+(o.mode==='lasting'?'two full topcoats':'one refresh topcoat')+'. Woodwork: undercoat, light de-nib (240 grit), then topcoat.'],
    ['Drying','Respect recoat times on the tin \u2014 typically 4 hours for emulsion, overnight for oil-based woodwork paint. Ventilate but avoid dust.'],
    ['Snag','Check in daylight at a low angle for misses and runs before removing tape and sheets. Peel tape at 45\u00b0 while the last coat is barely dry.']
  ];
  var h='<!doctype html><html><head><meta charset="utf-8"><title>Sturij \u2014 Decorating best practice</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;background:#FAF8F3;color:#1D1D1D;font-family:"IBM Plex Mono",monospace}'
    +'.hd{padding:36px 48px 6px}.k{font:500 11px "IBM Plex Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:#62584F}'
    +'h1{font:400 28px "Source Serif 4",serif;margin:6px 0 0}'
    +'ol{margin:22px 48px;padding:0;list-style:none;counter-reset:s}'
    +'li{counter-increment:s;display:flex;gap:16px;padding:13px 0;border-bottom:1px solid rgba(29,29,29,.1);max-width:820px}'
    +'li::before{content:counter(s,decimal-leading-zero);font:600 13px "IBM Plex Mono",monospace;color:#D4A01B;min-width:30px}'
    +'li b{display:block;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px}'
    +'li span{font:400 13px "Source Serif 4",serif;line-height:1.55}'
    +'table{border-collapse:collapse;margin:6px 48px 40px}th{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#62584F;text-align:left;padding:6px 14px 6px 0;border-bottom:1px solid #D4A01B}'
    +'td{font:400 12px "IBM Plex Mono",monospace;padding:6px 14px 6px 0;border-bottom:1px solid rgba(29,29,29,.08)}'
    +'.pr{position:fixed;top:16px;right:16px;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;background:#1D1D1D;color:#FAF8F3;border:0;border-radius:999px;padding:10px 18px;cursor:pointer}'
    +'@media print{.pr{display:none}}</style></head><body>'
    +'<button class="pr" onclick="print()">Save as PDF</button>'
    +'<div class="hd"><div class="k">Sturij \u00b7 '+projName+' \u00b7 '+(pl.name||'Floor plan')+'</div><h1>Decorating a room \u2014 best practice</h1>'
    +'<div class="k" style="margin-top:10px">'+(o.mode==='lasting'?'Long-lasting finish':'Refresh')+' \u00b7 contingency '+o.cont+'%</div></div>'
    +'<ol>'+steps.map(function(s){return '<li><div><b>'+s[0]+'</b><span>'+s[1]+'</span></div></li>';}).join('')+'</ol>'
    +'<table><tr><th>Paint</th><th>Litres</th><th>Tins</th></tr>'
    +r.rows.map(function(row){return '<tr><td>'+row[0]+'</td><td>'+row[1].toFixed(1)+'L</td><td>'+row[2]+' \u00d7 '+row[3]+'L</td></tr>';}).join('')
    +'</table></body></html>';
  w.document.write(h);w.document.close();
}
if(el('cvUndo'))el('cvUndo').onclick=doUndo;
if(el('cvRedo'))el('cvRedo').onclick=doRedo;
})();
