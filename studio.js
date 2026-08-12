
var FB=[],BOARDS=[],_ready=[];
window._railNotes=[];
window._floorNotes=[];
window._syncRailNotes=function(railEl,pool){
  (window._railNotes||[]).forEach(function(n){ if(n.rail!==railEl)return;
    var hit=null; for(var i=0;i<pool.length;i++)if(pool[i]._idx===n.idx){hit=pool[i];break;}
    if(hit){n.el.style.display='';n.el.style.left=n.dx+'px';n.el.style.top=((parseFloat(hit.style.top)||0)+n.dy)+'px';}
    else n.el.style.display='none';
  });
};
var REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Motion engine (Motion / Motion+): spring-smoothed panel + drawer motion when the library is present; CSS transitions otherwise */
function glideValue(from,to,velocity,cb){
  var M=window.Motion&&window.Motion.animate?window.Motion:null;
  if(!M||REDUCED)return null;
  try{return M.animate(from,to,{type:'spring',velocity:velocity,stiffness:46,damping:28,mass:1.1,restDelta:0.25,restSpeed:0.25,onUpdate:cb});}catch(e){return null;}
}
function spring(el,keyframes,opts){
  var M=window.Motion&&window.Motion.animate?window.Motion:null;
  if(!M||REDUCED)return false;
  try{M.animate(el,keyframes,opts||{type:'spring',stiffness:280,damping:28});return true;}catch(e){return false;}
}
_ready.push(fetch('showcase/paints/paints.json').then(function(r){return r.json();}).then(function(m){FB=m.map(function(p){return [p.name,p.hex];});}));
_ready.push(fetch('showcase/finishes/boards.json').then(function(r){return r.json();}).then(function(m){BOARDS=m.map(function(b){return {s:b.file.replace(/\.webp$/,''),n:b.name};});}));
function el(id){return document.getElementById(id)}
function slug(s){return s.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')}
function toast(t){if(window._quiet)return;var e=el('toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('on');},1400);}

/* Egger colour banding — one of Egger's decor colour families per board decor */
var BAND_COLOURS={Brown:'#6f4a2b',Beige:'#cdb996',Grey:'#8d9094',Black:'#2b2b2b',White:'#efeae0',Blue:'#4f6b86',Green:'#5f7356',Red:'#9e4740',Orange:'#d98a3d',Yellow:'#e3c766',Pink:'#d6a0a8',Violet:'#6b5b86','Not defined':'#b3ada1'};
var BAND_ORDER=['Brown','Beige','Grey','Black','White','Blue','Green','Red','Orange','Yellow','Pink','Violet','Not defined'];
function boardBand(b){var n=(b.n||'').toLowerCase();
  if(/black/.test(n))return'Black';
  if(/grey|gray|graphite|monument|pebble/.test(n))return'Grey';
  if(/blue/.test(n))return'Blue';
  if(/green|reed/.test(n))return'Green';
  if(/berry|cassis|\bred\b|rosso|bordeaux/.test(n))return'Red';
  if(/walnut|oak|chestnut|acacia|bolivar|wood|rovato|casella|bookmatch|alba|dimaro/.test(n))return'Brown';
  if(/beige|sand|caramel|champagne|travertine|soft|cream|natural/.test(n))return'Beige';
  return'Not defined';
}
function addBandFilter(sideEl, all, build){
  var seen={}; all.forEach(function(b){var bd=boardBand(b);seen[bd]=(seen[bd]||0)+1;});
  var bar=document.createElement('div'); bar.className='cbands';
  var allBtn=document.createElement('button'); allBtn.className='cband all on'; allBtn.textContent='All'; bar.appendChild(allBtn);
  var chips=[];
  BAND_ORDER.forEach(function(bd){ if(!seen[bd])return;
    var c=document.createElement('button'); c.className='cband'; c.style.background=BAND_COLOURS[bd]||'#ccc'; c.title=bd+' ('+seen[bd]+')'; c.setAttribute('data-band',bd);
    bar.appendChild(c); chips.push(c);
  });
  function setActive(t){ allBtn.classList.toggle('on',t===allBtn); chips.forEach(function(x){x.classList.toggle('on',x===t);}); }
  allBtn.onclick=function(e){e.stopPropagation();setActive(allBtn);build(all);};
  chips.forEach(function(c){ c.onclick=function(e){e.stopPropagation();setActive(c);var bd=c.getAttribute('data-band');build(all.filter(function(b){return boardBand(b)===bd;}));}; });
  sideEl.appendChild(bar);
}
function rail(sideEl, railEl, kind, items, paint){
  var track=railEl.querySelector('.track');
  var all=items.slice(), cur=all, y=0, dragging=false, lastY=0, vy=0, moved=0, raf=null, pool=[], glide=null;
  var brand = paint ? 'Farrow & Ball' : (kind==='worktop'?'Omega Stone':'Egger');
  function SH(){return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--swh'))||66;}
  function mkStrip(){var d=document.createElement('div');d.className='strip';d.setAttribute('data-tag','');d.setAttribute('data-brand',brand);d.style.position='absolute';d.style.left='0';d.style.right='0';d.innerHTML='<span class="lab"><span class="nm"></span><span class="add">Add swatch</span><span class="fav">Favourite</span></span>';track.appendChild(d);return d;}
  function fillStrip(d,it,i){
    d.setAttribute('data-i',i);d.setAttribute('data-name',paint?it[0]:it.n);
    if(paint){d.style.backgroundImage='none';d.style.backgroundColor=it[1];}
    else{d.style.backgroundColor='';d.style.backgroundImage="url('"+(it.img||('showcase/finishes/'+it.s+'.webp'))+"')";}
    d.querySelector('.nm').textContent=paint?it[0]:it.n;
  }
  /* windowed render: only the visible strips (+2 buffer) exist in the DOM */
  function render(){
    if(!cur.length){pool.forEach(function(d){d.remove();});pool=[];return;}
    if(!isFinite(y))y=0;
    var sh=SH(), H=cur.length*sh, vh=railEl.clientHeight||window.innerHeight;
    var w=((y%H)+H)%H, first=Math.floor(w/sh), off=w%sh, n=Math.ceil(vh/sh)+2;
    while(pool.length<n)pool.push(mkStrip());
    while(pool.length>n)pool.pop().remove();
    for(var k=0;k<n;k++){var idx=(first+k)%cur.length,d=pool[k];
      d.style.height=sh+'px';d.style.top=(k*sh-off)+'px';
      if(d._idx!==idx||d._list!==cur){d._idx=idx;d._list=cur;fillStrip(d,cur[idx],idx);}
    }
    railEl._pool=pool;
    try{if(window._syncRailNotes)_syncRailNotes(railEl,pool);}catch(e){}
  }
  var lastList=all;
  function favKeyOf(it){return paint?it[0]:it.s;}
  function build(list){lastList=(list&&list.length)?list:all;
    cur=lastList.filter(function(it){var k2=favKeyOf(it);return !(window.FAVES||[]).some(function(f){return (f.key||f.s)===k2;});});
    y=0;pool.forEach(function(d){d._idx=null;});render();}
  railEl._refresh=function(){build(lastList);};
  var wy=null;
  railEl.addEventListener('wheel',function(e){e.preventDefault();
    if(wy===null||!glide)wy=y; wy+=e.deltaY;
    if(glide)glide.stop();
    glide=glideValue(y,wy,0,function(v2){y=v2;render();});
    if(!glide){y+=e.deltaY;render();}},{passive:false});
  railEl.addEventListener('pointerdown',function(e){dragging=true;lastY=e.clientY;vy=0;moved=0;if(raf)cancelAnimationFrame(raf);if(glide){glide.stop();glide=null;}railEl.setPointerCapture(e.pointerId);railEl.classList.add('grabbing');});
  railEl.addEventListener('pointermove',function(e){if(!dragging)return;var dy=e.clientY-lastY;lastY=e.clientY;vy=dy;moved+=Math.abs(dy);y-=dy;render();});
  function momentum(){
    glide=glideValue(y, y-vy*19, -vy*60, function(v2){y=v2;render();});
    if(glide)return;
    vy*=0.93;if(Math.abs(vy)<0.4)return;y-=vy;render();raf=requestAnimationFrame(momentum);}
  railEl.addEventListener('pointerup',function(e){if(!dragging)return;dragging=false;railEl.classList.remove('grabbing');
    if(moved<14){ tap(e.clientX,e.clientY); } else if(!REDUCED) momentum(); });
  railEl.addEventListener('pointercancel',function(){dragging=false;railEl.classList.remove('grabbing');});
  function tap(x,yy){
    var t=document.elementFromPoint(x,yy); if(!t)return;
    var addBtn=t.closest('.add'); var favBtn=t.closest('.fav'); var st=t.closest('.strip'); if(!st)return;
    var i=parseInt(st.getAttribute('data-i')); var it=cur[i]; if(!it)return;
    if(favBtn){ favFromRail(kind,it); return; }
    if(addBtn){ addSwatch(kind,it); var lab=st.querySelector('.lab'); lab.classList.add('added'); setTimeout(function(){lab.classList.remove('added');},420); }
    else { fillSide(kind,it); sideEl._justFilled=Date.now(); }
  }
  window.addEventListener('resize',render);
  railEl._render=render;
  railEl._build=build;
  build(all);
  if(kind==='board'||kind==='doors'||kind==='carcass') addBandFilter(sideEl, all, build);
}
var sel={paint:null,board:null,doors:null,carcass:null,worktop:null};
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
/* ---- room: multi-colour paint side + ceiling/walls/skirting zones ---- */
var paints=[], zones={ceiling:false,walls:true,skirting:false,floor:false};
var wallMode='paint', floorType='hard', floor=null, paintTarget='wall', ceilCol=null, skirtCol=null, ceilOn=false, skirtOn=false;
var FLOORS={hard:[],soft:[]};   // Crucial Trading — Hard (sisal/coir/weaves) + Soft (wool), loaded from manifest
_ready.push(fetch('showcase/floors/floors.json').then(function(r){return r.json();}).then(function(m){
  ['hard','soft'].forEach(function(t){FLOORS[t]=(m[t]||[]).map(function(f){f.url='showcase/'+(f.dir||('floors/'+t))+'/'+f.file;f.type=t;return f;});});
  if(zones.floor&&!floor&&FLOORS[floorType]&&FLOORS[floorType][0])floor=FLOORS[floorType][0];
  renderFloorRail();
}).catch(function(){}));
function wallCss(c){if(wallMode==='wallpaper'){return wallPaper?'background-image:url(\''+wallPaper.img+'\');background-size:cover;background-position:center':'background-color:'+c+';background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.10) 0 11px,rgba(0,0,0,.06) 11px 22px);background-size:24px 24px';}return 'background:'+c;}
function renderRoom(){
  var f=el('fillPaint');
  var wallList=(wallMode==='wallpaper'&&!paints.length)?[['Wallpaper','#ded8cc']]:paints;
  var cols=wallList.map(function(p){
    var wname=(wallMode==='wallpaper'&&wallPaper)?wallPaper.n:p[0];
    return '<div class="rcol"><div class="rwall" data-tag data-brand="Farrow &amp; Ball" data-name="'+wname+'" '+(zones.walls?'style="'+wallCss(p[1])+'"':'')+'></div></div>';
  }).join('');
  var ceil=false?'<div class="rceil rband'+(paintTarget==='ceiling'?' rtsel':'')+'" data-surf="ceiling" data-tag data-brand="Farrow &amp; Ball" data-name="'+ceilCol[0]+'" style="background:'+ceilCol[1]+'"></div>':'';
  var skirt=false?'<div class="rskirt rband'+(paintTarget==='skirting'?' rtsel':'')+'" data-surf="skirting" data-tag data-brand="Farrow &amp; Ball" data-name="'+skirtCol[0]+'" style="background:'+skirtCol[1]+'"></div>':'';
  var fl=(zones.floor&&floor)?'<div class="rfloor" data-tag data-brand="'+(floor.type==='hard'?'Egger':'Crucial Trading')+'" data-name="'+floor.name+'" style="background-image:url(\''+floor.url+'\')"></div>':'';
  f.innerHTML='<div class="room">'+ceil+'<div class="rcols'+(paintTarget==='wall'?' rtsel':'')+'" data-surf="wall">'+cols+'</div>'+skirt+fl+'</div>';
  [].forEach.call(f.querySelectorAll('[data-surf]'),function(s){s.addEventListener('click',function(){setTarget(s.getAttribute('data-surf'));});});
}
function setTarget(t){paintTarget=t;el('sidePaint').classList.remove('chosen');if(window._openSide)_openSide(el('sidePaint'));var h=el('colhint');if(h)h.textContent='Walls';}
function addPaint(it){
  if(paintTarget==='ceiling'){ceilCol=it;ceilOn=true;}
  else if(paintTarget==='skirting'){skirtCol=it;skirtOn=true;}
  else{ paints=[it]; sel.paint=it; }
  el('sidePaint').classList.add('chosen');el('sidePaint').classList.remove('idle','active');
  renderRoom();updateBar();
}
function fillSide(kind,it){
  if(kind==='paint'){ addPaint(it); return; }
  if(kind==='ceiling'||kind==='skirting'){
    if(!it||!it[1]){return;}   /* never mark chosen without a colour — the black-panel bug */
    if(kind==='ceiling'){ceilCol=it;ceilOn=true;} else {skirtCol=it;skirtOn=true;}
    var fe2=el(kind==='ceiling'?'fillCeiling':'fillSkirting');
    if(fe2){fe2.style.background=it[1];fe2.style.backgroundImage='none';fe2.setAttribute('data-tag','');fe2.setAttribute('data-brand','Farrow & Ball');fe2.setAttribute('data-name',it[0]);}
    var sd2=el(kind==='ceiling'?'sideCeiling':'sideSkirting');
    if(sd2){sd2.classList.add('chosen');sd2.classList.remove('idle','active');selectedSide=sd2;if(typeof renderCbar==='function')renderCbar();}
    toast((kind==='ceiling'?'Ceiling':'Skirting')+' · '+it[0]);
    return;
  }
  if(kind==='wallpaper'){ wallPaper=it; wallMode='wallpaper'; el('sidePaint').classList.add('chosen'); el('sidePaint').classList.remove('idle','active'); renderRoom(); selectedSide=el('sidePaint'); if(typeof renderCbar==='function')renderCbar(); toast('Wallpaper · '+it.n); return; }
  sel[kind]=it;
  var fillEl=el('fill'+cap(kind)), label=(kind==='board'?'Boards':cap(kind)), brand=(kind==='worktop'?'Omega Stone':'Egger');
  var texUrl="url('"+(it.img||('showcase/finishes/'+it.s+'.webp'))+"')";
  fillEl.style.backgroundImage=texUrl;
  fillEl.style.setProperty('--tex',texUrl); fillEl.classList.add('rotable');
  fillEl.style.setProperty('--rot','0deg'); fillEl.style.setProperty('--rotsc','1');
  fillEl.querySelector('.fn').textContent=label;
  var sd=el('side'+cap(kind)); sd._rot=0; sd.classList.add('chosen'); sd.classList.remove('idle','active'); selectedSide=sd; if(typeof renderCbar==='function')renderCbar();
  fillEl.setAttribute('data-tag','');fillEl.setAttribute('data-brand',brand);fillEl.setAttribute('data-name',it.n);
  updateBar();
}
/* ---- Options: walls switch + zones + floor bottom rail ---- */
function syncSub(){var fp=el('floorpick');if(fp)fp.classList.toggle('show',zones.floor);}
function bindZone(id,key){el(id).onchange=function(){zones[key]=el(id).checked;
  if(key==='floor'){el('floorbar').classList.toggle('on',zones.floor);document.body.classList.toggle('hasfloor',zones.floor);
    if(zones.floor&&!floor&&FLOORS[floorType][0])floor=FLOORS[floorType][0];renderFloorRail();}
  if(key==='ceiling'||key==='skirting'){ if(el(id).checked){setTarget(key);} else if(paintTarget===key){paintTarget='wall';} }
  syncSub();if(el('sidePaint').classList.contains('chosen'))renderRoom();};}
/* Walls: Paint | Wallpaper — the tick switches, never blank */
[].forEach.call(el('wallseg').querySelectorAll('button'),function(b){b.onclick=function(){[].forEach.call(el('wallseg').querySelectorAll('button'),function(x){x.classList.remove('on');});b.classList.add('on');wallMode=b.getAttribute('data-w');updateWallRail();if(wallMode==='wallpaper'&&!wallPaper)el('sidePaint').classList.remove('chosen');if(el('sidePaint').classList.contains('chosen'))renderRoom();};});
updateWallRail();
/* Floor: Hard | Carpet — tick moves */
[].forEach.call(el('floorseg').querySelectorAll('button'),function(b){b.onclick=function(){[].forEach.call(el('floorseg').querySelectorAll('button'),function(x){x.classList.remove('on');});b.classList.add('on');floorType=b.getAttribute('data-t');floor=FLOORS[floorType][0]||null;el('floorbar').classList.remove('filled');renderFloorRail();if(el('sidePaint').classList.contains('chosen'))renderRoom();};});
/* floor coverings tiled along the bottom — windowed render, endless loop */
function renderFloorRail(){ if(window._frender)window._frender(true); }
if(el('fchg'))el('fchg').onclick=function(e){e.stopPropagation();el('floorbar').classList.remove('filled');};
el('fexp').addEventListener('click',function(){el('floorbar').classList.remove('filled');});
(function(){var rail=el('frail'),track=rail.querySelector('.ftrack'),x=0,down=false,lx=0,vx=0,raf=null,fmoved=0,pool=[],glide=null;
  function TW(){var bh=(el('floorbar')&&el('floorbar').clientHeight)||0;return bh>40?bh:(window.innerWidth<560?76:88);}
  function mkTile(){var d=document.createElement('div');d.className='ftile';d.setAttribute('data-tag','');d.style.position='absolute';d.style.top='0';d.style.bottom='0';d.innerHTML='<span class="fl"></span>';track.appendChild(d);return d;}
  function render(reset){
    var items=FLOORS[floorType]||[];
    if(reset)x=0;
    if(!items.length){pool.forEach(function(d){d.remove();});pool=[];return;}
    if(!isFinite(x))x=0;
    var tw=TW(), W=items.length*tw, vw=rail.clientWidth||window.innerWidth;
    var w=((x%W)+W)%W, first=Math.floor(w/tw), off=w%tw, n=Math.ceil(vw/tw)+2;
    while(pool.length<n)pool.push(mkTile());
    while(pool.length>n)pool.pop().remove();
    for(var k=0;k<n;k++){var idx=(first+k)%items.length,d=pool[k],fl=items[idx];
      d.style.width=tw+'px';d.style.left=(k*tw-off)+'px';
      if(d._idx!==idx||d._t!==floorType){d._idx=idx;d._t=floorType;
        d.setAttribute('data-i',idx);d.setAttribute('data-brand',floorType==='hard'?'Egger':'Crucial Trading');d.setAttribute('data-name',fl.name);
        d.style.backgroundImage="url('"+fl.url+"')";d.querySelector('.fl').textContent=fl.name;}
    }
    try{(window._floorNotes||[]).forEach(function(nt){
      if(nt.type!==floorType){nt.el.style.display='none';return;}
      var hit=null; for(var q=0;q<pool.length;q++)if(pool[q]._idx===nt.idx){hit=pool[q];break;}
      if(hit){nt.el.style.display='';nt.el.style.left=((parseFloat(hit.style.left)||0)+nt.dx)+'px';nt.el.style.top=nt.dy+'px';}
      else nt.el.style.display='none';
    });}catch(e){}
  }
  window._frender=render;
  var wx=null;
  rail.addEventListener('wheel',function(e){e.preventDefault();
    if(wx===null||!glide)wx=x; wx+=(e.deltaY+e.deltaX);
    if(glide)glide.stop();
    glide=glideValue(x,wx,0,function(v2){x=v2;render();});
    if(!glide){x+=(e.deltaY+e.deltaX);render();}},{passive:false});
  rail.addEventListener('pointerdown',function(e){down=true;lx=e.clientX;fmoved=0;vx=0;if(raf)cancelAnimationFrame(raf);if(glide){glide.stop();glide=null;}rail.setPointerCapture(e.pointerId);rail.classList.add('grabbing');});
  rail.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-lx;lx=e.clientX;vx=dx;fmoved+=Math.abs(dx);x-=dx;render();});
  function mom(){
    glide=glideValue(x, x-vx*17, -vx*60, function(v2){x=v2;render();});
    if(glide)return;
    vx*=0.92;if(Math.abs(vx)<0.4)return;x-=vx;render();raf=requestAnimationFrame(mom);}
  rail.addEventListener('pointerup',function(e){if(!down)return;down=false;rail.classList.remove('grabbing');
    if(fmoved<14){var t=document.elementFromPoint(e.clientX,e.clientY);t=t&&t.closest?t.closest('.ftile'):null;
      if(t){var fl=(FLOORS[floorType]||[])[parseInt(t.getAttribute('data-i'))];
        if(fl){floor=fl;el('floorbar').classList.add('filled');var ex=el('fexp');ex.style.backgroundImage="url('"+fl.url+"')";ex.querySelector('.fn').textContent=(floorType==='hard'?'Egger':'Crucial Trading')+' · '+fl.name;if(el('sidePaint').classList.contains('chosen'))renderRoom();return;}}}
    if(!REDUCED)mom();});
  rail.addEventListener('pointercancel',function(){down=false;rail.classList.remove('grabbing');});
  
  window.addEventListener('resize',function(){render();});
})();
/* Post-it tags on/off */
syncSub();
/* sun button = subtle blur slider: slide right→left to white-blur the panel (focus 1-2 others);
   the button grows LESS transparent as blur increases so it stands out; tap it to reset to normal */
(function(){
  function ensureBlur(side){var pb=side.querySelector('.pblur');if(!pb){pb=document.createElement('div');pb.className='pblur';side.insertBefore(pb,side.firstChild);}return pb;}
  function ensureTrack(side){var t=side.querySelector('.btrack');if(!t){t=document.createElement('div');t.className='btrack';side.appendChild(t);}return t;}
  var BTRAVEL=66;   // knob travel inside the 96px track (96 track − 30 knob)
  function paint(side,b,amt){
    side._blur=amt; var pb=ensureBlur(side), w=side.clientWidth||200, maxB=Math.max(6,w*0.06);
    if(amt<=0.01){pb.style.opacity='0';pb.style.backdropFilter='none';pb.style.webkitBackdropFilter='none';pb.style.background='none';}
    else{var bl=(amt*maxB).toFixed(1)+'px';pb.style.opacity='1';pb.style.background='rgba(255,255,255,'+(amt*0.6).toFixed(2)+')';pb.style.backdropFilter='blur('+bl+')';pb.style.webkitBackdropFilter='blur('+bl+')';}
    var pos=(52+amt*BTRAVEL)+'px';   /* knob home is inside the ✕; follows the finger inside the indented track */
    if(side.classList.contains('btn-left')){b.style.left=pos;b.style.right='auto';}else{b.style.right=pos;b.style.left='auto';}
  }
  [].forEach.call(document.querySelectorAll('.change'),function(b){
    var side=b.closest('.side'); if(side){ensureBlur(side);ensureTrack(side);}
    var sx=0,sa=0,moved=false,dragging=false;
    function resetPos(){if(side&&side.classList.contains('btn-left')){b.style.left='52px';b.style.right='auto';}else{b.style.right='52px';b.style.left='auto';}}
    b.addEventListener('pointerdown',function(e){e.stopPropagation();dragging=true;moved=false;sx=e.clientX;sa=(side&&side._blur)||0;if(side)side.classList.add('sliding');b.classList.add('sliding');try{b.setPointerCapture(e.pointerId);}catch(_){}});
    b.addEventListener('pointermove',function(e){if(!dragging||!side)return;var dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;var dir=side.classList.contains('btn-left')?1:-1;var amt=Math.max(0,Math.min(1,sa+dir*dx/BTRAVEL));paint(side,b,amt);});
    b.addEventListener('pointerup',function(e){if(!dragging)return;dragging=false;if(side)side.classList.remove('sliding');b.classList.remove('sliding');if(!moved&&side){paint(side,b,0);resetPos();}});
    b.addEventListener('pointercancel',function(){dragging=false;if(side)side.classList.remove('sliding');b.classList.remove('sliding');});
  });
})();
function neutralPaint(){for(var i=0;i<FB.length;i++)if(FB[i][0]==='All White')return FB[i];return FB[0];}
function bothChosen(){return sel.paint&&sel.board;}
function updateBar(){ var on=!!bothChosen(); var c=el('cam'); if(c)c.classList.toggle('show',on); if(on) setTimeout(showSuggest,700); else {el('suggest').classList.remove('show','on');} }

var WORKTOPS=[];
_ready.push(fetch('showcase/worktops/worktops.json').then(function(r){return r.json();}).then(function(m){WORKTOPS=m.map(function(w){return {s:w.file,n:w.name,img:'showcase/worktops/'+w.file};});rail(el('sideWorktop'),el('railWorktop'),'worktop',WORKTOPS,false);}).catch(function(){}));
var WALLPAPERS=[], wallPaper=null;
_ready.push(fetch('showcase/wallpaper/wallpaper.json').then(function(r){return r.json();}).then(function(m){WALLPAPERS=m.map(function(w){return {s:w.file,n:w.name,img:'showcase/wallpaper/'+w.file};});rail(el('sidePaint'),el('railWallpaper'),'wallpaper',WALLPAPERS,false);}).catch(function(){}));
/* ===== One method for every panel: idle block → tap to select → splits into swatches ===== */
(function(){
  var sides=[el('sideCeiling'),el('sidePaint'),el('sideSkirting'),el('sideWorktop'),el('sideCarcass'),el('sideBoard')].filter(Boolean);
  function idle(s){s.classList.remove('active');if(!s.classList.contains('chosen'))s.classList.add('idle');}
  function open(s){if(s.classList.contains('chosen'))return;s.classList.remove('idle');s.classList.add('active');}
  window._openSide=open;
  sides.forEach(function(s){
    if(!s.classList.contains('chosen'))s.classList.add('idle');
    s.addEventListener('click',function(e){
      if(Date.now()-(window._noteDrop||0)<400)return;
      if(e.target.closest('.pgrip')||e.target.closest('.pfdraw')||e.target.closest('.note')||e.target.closest('.pclose'))return;
      selectSide(s);
      if(s.classList.contains('idle')){open(s);return;}
      if(s.classList.contains('chosen')){ if(s._justFilled&&Date.now()-s._justFilled<500)return; clearPanel(s);return; }   /* tap the sample to return to the carousel */
      if(s.classList.contains('active')&&e.target.closest('.colhint')){s.classList.remove('active');s.classList.add('idle');}
    });
  });
})();
/* ===== Canvas Control bar — the header's contextual second row; reflects the selected panel ===== */
var selectedSide=null;
var CBAR_ROLE={sideCeiling:'Ceiling',sidePaint:'Walls',sideSkirting:'Skirting',sideWorktop:'Worktop',sideCarcass:'Carcass',sideBoard:'Boards'};
function renderCbar(){
  if(typeof renderHeaderCtl==='function')renderHeaderCtl();
  var bar=el('cbar'); if(!bar)return;
  if(!selectedSide){ bar.innerHTML='<span class="cbhint">Tap a material to select it</span>'; return; }
  var chosen=selectedSide.classList.contains('chosen');
  if(chosen){ bar.innerHTML=''; return; }   /* name + controls live in the header dock; panel tabs carry the labels */
  bar.innerHTML='<span class="cbhint">choose a material</span>';
}
function selectSide(s){ selectedSide=s; renderCbar(); }
/* ---- Header sample controls: blur slider + rotate, contextual to the selected sample ---- */
function applyBlur(side,amt){
  if(!side)return; side._blur=amt;
  var pb=side.querySelector('.pblur');
  if(!pb){pb=document.createElement('div');pb.className='pblur';side.insertBefore(pb,side.firstChild);}
  var w=side.clientWidth||200, maxB=Math.max(6,w*0.06);
  if(amt<=0.01){pb.style.opacity='0';pb.style.backdropFilter='none';pb.style.webkitBackdropFilter='none';pb.style.background='none';}
  else{var bl=(amt*maxB).toFixed(1)+'px';pb.style.opacity='1';pb.style.background='rgba(255,255,255,'+(amt*0.6).toFixed(2)+')';pb.style.backdropFilter='blur('+bl+')';pb.style.webkitBackdropFilter='blur('+bl+')';}
}
function rotateSide(side){
  if(!side)return; var fe=side.querySelector('.filled'); if(!fe||!fe.classList.contains('rotable'))return;
  var rot=(((side._rot||0)+90)%360); side._rot=rot;
  var r=fe.getBoundingClientRect(), sc=(rot===90||rot===270)?Math.max(r.width/r.height,r.height/r.width):1;
  fe.style.setProperty('--rot',rot+'deg'); fe.style.setProperty('--rotsc',sc.toFixed(3));
}
function sideRotatable(s){ return !!(s&&/sideWorktop|sideCarcass|sideBoard/.test(s.id)&&s.classList.contains('chosen')); }
function renderHeaderCtl(){
  var h=el('hctl'); if(!h)return;
  var s=selectedSide, chosen=s&&s.classList.contains('chosen');
  document.body.classList.toggle('hassel', !!chosen);
  if(!chosen){ h.className='hctl'; h.innerHTML=''; return; }
  h.className='hctl on';
  var role=CBAR_ROLE[s.id]||'Panel';
  var rot=sideRotatable(s)?'<button class="hbtn" id="hrotate" title="Rotate the grain 90°"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v6h-6"/></svg><span>Rotate</span></button>':'';
  h.innerHTML='<span class="hdock-name">'+role+'</span><span class="hdock-sep"></span>'
    +'<span class="hdock-row"><span class="hblur" title="Fade this sample to focus the others">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>'
    +'<input type="range" class="hrange" id="hblurR" min="0" max="1" step="0.02" value="'+(s._blur||0)+'"></span>'+rot+'</span>';
  var r=el('hblurR'); if(r)r.addEventListener('input',function(){ applyBlur(selectedSide,parseFloat(this.value)); });
  var rb=el('hrotate'); if(rb)rb.addEventListener('click',function(){ rotateSide(selectedSide); });
}
renderCbar();
/* ---- Per-panel close: clear this panel back to the carousel (independent of the others) ---- */
function clearPanel(side){
  if(!side)return; var id=side.id;
  if(id==='sideCeiling'||id==='sideSkirting'){
    if(id==='sideCeiling'){ceilCol=neutralPaint&&FB.length?neutralPaint():null;ceilOn=false;}else{skirtCol=neutralPaint&&FB.length?neutralPaint():null;skirtOn=false;}
    var fe3=el(id==='sideCeiling'?'fillCeiling':'fillSkirting');
    if(fe3){fe3.style.background='';fe3.removeAttribute('data-tag');fe3.removeAttribute('data-name');}
    side.classList.remove('chosen','idle');side.classList.add('active');
    selectedSide=side;if(typeof renderCbar==='function')renderCbar();
    return;
  }
  if(id==='sidePaint'){
    paints=[]; sel.paint=null; paintTarget='wall'; wallMode='paint'; wallPaper=null; ceilCol=neutralPaint(); skirtCol=neutralPaint(); ceilOn=false; skirtOn=false;
    var fp=el('fillPaint'); if(fp){fp.innerHTML=''; fp.removeAttribute('data-tag'); fp.removeAttribute('data-name');}
    var seg=el('wallseg'); if(seg){[].forEach.call(seg.querySelectorAll('button'),function(x){x.classList.toggle('on',x.getAttribute('data-w')==='paint');});}
    updateWallRail();
  } else {
    var kind=id==='sideWorktop'?'worktop':(id==='sideCarcass'?'carcass':'board');
    if(sel)sel[kind]=null;
    var fe=el('fill'+kind.charAt(0).toUpperCase()+kind.slice(1));
    if(fe){fe.style.backgroundImage=''; fe.style.removeProperty('--tex'); fe.classList.remove('rotable'); fe.style.setProperty('--rot','0deg'); side._rot=0; fe.removeAttribute('data-tag'); fe.removeAttribute('data-name'); var fn=fe.querySelector('.fn'); if(fn)fn.textContent='';}
  }
  side.classList.remove('chosen','idle'); side.classList.add('active');
  selectedSide=side; if(typeof renderCbar==='function')renderCbar();
  if(typeof updateBar==='function')updateBar();
}
[].forEach.call(document.querySelectorAll('.side .pclose'),function(b){
  var side=b.closest('.side');
  b.addEventListener('pointerdown',function(e){e.stopPropagation();});
  b.addEventListener('click',function(e){e.stopPropagation();clearPanel(side);});
});
function updateWallRail(){if(el('railPaint'))el('railPaint').style.display=wallMode==='paint'?'':'none';if(el('railWallpaper'))el('railWallpaper').style.display=wallMode==='wallpaper'?'':'none';if(el('colhint'))el('colhint').textContent=wallMode==='wallpaper'?'Wallpaper':'Walls';}

var HANDLES=[
 {n:'Bar handle',svg:'<svg width="360" height="60"><rect x="6" y="24" width="348" height="12" rx="6" fill="#2b2b2b"/><rect x="30" y="6" width="12" height="24" rx="4" fill="#2b2b2b"/><rect x="318" y="6" width="12" height="24" rx="4" fill="#2b2b2b"/></svg>'},
 {n:'Knurled T-bar',svg:'<svg width="120" height="200"><rect x="52" y="10" width="16" height="180" rx="8" fill="#b98a2e"/><rect x="20" y="10" width="80" height="16" rx="8" fill="#b98a2e"/></svg>'},
 {n:'Bow handle',svg:'<svg width="120" height="200"><path d="M40 20 Q80 100 40 180" stroke="#c9cdd2" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="40" cy="20" r="9" fill="#c9cdd2"/><circle cx="40" cy="180" r="9" fill="#c9cdd2"/></svg>'},
 {n:'Edge pull',svg:'<svg width="80" height="200"><rect x="30" y="16" width="10" height="168" rx="5" fill="#3a3a3a"/></svg>'}
];
var hi=0, handleOn=false;
function drawHandle(){el('hview').innerHTML=HANDLES[hi].svg;el('hname').textContent='Handle · '+HANDLES[hi].n;}
el('hprev').onclick=function(){hi=(hi-1+HANDLES.length)%HANDLES.length;drawHandle();};
el('hnext').onclick=function(){hi=(hi+1)%HANDLES.length;drawHandle();};

var items=[];
function renderTray(){
  var box=el('items'); box.innerHTML='';
  items.forEach(function(it,idx){
    var d=document.createElement('div');d.className='item'+((it.sub==='photo'||it.sub==='snip')?' photo':'');
    if(it.sub==='photo'||it.sub==='snip'){d.innerHTML='<img class="swbig" src="'+it.png+'" alt="'+it.name+'"><button class="rm" title="remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    d.querySelector('.rm').onclick=function(){items.splice(idx,1);renderTray();};}
    else{d.innerHTML='<span class="sw" style="'+it.swatchCss+'"></span><span class="meta"><b>'+it.name+'</b><span>'+it.file+(it.sub?' · '+it.sub:'')+'</span></span><button class="rm" title="remove" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    d.querySelector('.rm').onclick=function(){items.splice(idx,1);renderTray();};}
    box.appendChild(d);
  });
  el('tray').classList.toggle('on',items.length>0);
  
}
function addSwatch(kind,it){
  if(kind==='paint'){
    var name=it[0], file=slug(name)+'.png';
    var cv=document.createElement('canvas');cv.width=1000;cv.height=700;var x=cv.getContext('2d');
    x.fillStyle=it[1];x.fillRect(0,0,1000,560);x.fillStyle='#FAF8F3';x.fillRect(0,560,1000,140);
    x.fillStyle='#1D1D1D';x.font='500 40px "IBM Plex Mono",monospace';x.fillText(name,40,632);
    x.font='500 26px "IBM Plex Mono",monospace';x.fillStyle='#62584F';x.fillText(it[1].toUpperCase()+'  ·  Farrow & Ball',40,676);
    items.push({name:name,file:file,sub:it[1].toUpperCase(),swatchCss:'background:'+it[1],png:cv.toDataURL('image/png'),gen:{t:'paint',it:it}});renderTray();toast('Added '+name);
  } else {
    var nm=it.n, file2=slug(nm)+'.png', texUrl2=it.img||('showcase/finishes/'+it.s+'.webp');
    var cv2=document.createElement('canvas');cv2.width=1000;cv2.height=700;var x2=cv2.getContext('2d');
    var im=new Image();im.onload=function(){var sc=Math.max(1000/im.width,560/im.height);x2.drawImage(im,(1000-im.width*sc)/2,(560-im.height*sc)/2,im.width*sc,im.height*sc);
      x2.fillStyle='#FAF8F3';x2.fillRect(0,560,1000,140);x2.fillStyle='#1D1D1D';x2.font='500 40px "IBM Plex Mono",monospace';x2.fillText(nm,40,632);
      x2.font='500 26px "IBM Plex Mono",monospace';x2.fillStyle='#62584F';x2.fillText(it.s+'.webp  ·  Egger decor',40,676);
      items.push({name:nm,file:file2,sub:(kind==='worktop'?'Omega Stone':'Egger'),swatchCss:"background-image:url('"+texUrl2+"')",png:cv2.toDataURL('image/png'),gen:{t:'tex',k:kind,it:{s:it.s,n:it.n,img:it.img}}});renderTray();toast('Added '+nm);};
    im.src=texUrl2;
  }
}
function pairPNG(cb){
  var W=1600,H=1000,cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');
  var ps=paints.length?paints:[sel.paint], cw=(W/2)/ps.length;
  var ceilH=zones.ceiling?Math.round(H*0.20):0, flH=(zones.floor&&floor)?Math.round(H*0.16):0, skH=zones.skirting?Math.round(H*0.13):0;
  ps.forEach(function(p,i){var cx=i*cw;
    x.fillStyle='#ece6da';x.fillRect(cx,0,cw,H);
    if(zones.walls){x.fillStyle=p[1];x.fillRect(cx,ceilH,cw,H-ceilH-skH-flH);}
    x.fillStyle=zones.ceiling?p[1]:'#f5f2ea';x.fillRect(cx,0,cw,ceilH);
    x.fillStyle=zones.skirting?p[1]:'#FAF8F3';x.fillRect(cx,H-skH-flH,cw,skH);
    if(i>0){x.fillStyle='rgba(0,0,0,.10)';x.fillRect(cx,0,2,H);}
  });
  if(zones.floor&&floor){x.fillStyle=floor.avg||'#c9bda6';x.fillRect(0,H-flH,W/2,flH);}
  var img=new Image();img.onload=function(){var sc=Math.max((W/2)/img.width,H/img.height);x.drawImage(img,W/2+((W/2)-img.width*sc)/2,(H-img.height*sc)/2,img.width*sc,img.height*sc);
    x.font='500 26px "IBM Plex Mono",monospace';
    x.fillStyle='rgba(253,252,248,.92)';x.fillRect(40,H-92,W/2-80,52);x.fillStyle='#1D1D1D';x.fillText('PAINT · '+sel.paint[0],60,H-58);
    x.fillStyle='rgba(26,23,20,.6)';x.fillRect(W/2+40,H-92,W/2-80,52);x.fillStyle='#fff';x.fillText('BOARD · '+sel.board.n,W/2+60,H-58);
    if(handleOn){var hs=new Image();hs.onload=function(){var hw=Math.min(520,W*0.4),hh=hw*(hs.height/hs.width);x.drawImage(hs,(W-hw)/2,(H-hh)/2,hw,hh);cb(cv);};hs.src='data:image/svg+xml;base64,'+btoa(HANDLES[hi].svg);}
    else cb(cv);
  };img.onerror=function(){cb(cv);};img.src='showcase/finishes/'+sel.board.s+'.webp';
}
function pairName(){return slug(sel.paint[0]+'__'+sel.board.n);}
el('cam').onclick=function(){composeScene(function(cv){items.push({name:'Scheme photo',file:'scheme-'+Date.now()+'.png',sub:'photo',swatchCss:'background:'+(sel.paint?sel.paint[1]:'#EFE9DD'),png:cv.toDataURL('image/png')});renderTray();toast('Photo added to shortlist');});};
if(el('snip'))el('snip').onclick=function(){startSnip();};
if(el('talk'))el('talk').onclick=function(){talkOnce();};

/* ===== Favourites: heart a placed swatch → it collects in the bottom-left Favourites drawer ===== */
var FAVES=[];
function favKey(f){return f.key||f.s;}
window._refreshRails=function(){['railPaint','railWallpaper','railWorktop','railCarcass','railBoard'].forEach(function(id){var r=el(id);if(r&&r._refresh)r._refresh();});};
function renderFaves(){ var row=el('favrow'), dr=el('favdraw'); if(!row||!dr)return;
  dr.classList.toggle('on',FAVES.length>0);document.body.classList.toggle('hasfaves',FAVES.length>0&&!dr.classList.contains('min'));
  var hd=dr.querySelector('.favhd');
  if(hd&&!hd._bound){hd._bound=true;hd.setAttribute('role','button');hd.setAttribute('tabindex','0');
    var toggle=function(){var min=dr.classList.toggle('min');document.body.classList.toggle('hasfaves',FAVES.length>0&&!min);try{localStorage.setItem('sturij.studio.favmin',min?'1':'');}catch(e){}};
    hd.addEventListener('click',toggle);
    hd.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
    try{if(localStorage.getItem('sturij.studio.favmin')==='1'){dr.classList.add('min');document.body.classList.remove('hasfaves');}}catch(e){}}
  if(hd)hd.textContent='Favourites';
  row.innerHTML='';
  FAVES.forEach(function(f){
    var d=document.createElement('div'); d.className='favchip';
    var visual=f.k==='paint'?'<span class="favsw" style="background:'+f.hex+'"></span>':'<img src="'+(f.img||('showcase/finishes/'+favKey(f)+'.webp'))+'" draggable="false">';
    var brand=f.k==='paint'?'Farrow & Ball':(f.k==='worktop'?'Omega Stone':(f.k==='wallpaper'?'Farrow & Ball wallpaper':'Egger'));
    d.setAttribute('data-tip', f.n+'\n'+brand+(f.hex?'\n'+f.hex.toUpperCase():''));
    d.innerHTML=visual+'<button class="fx" title="Remove from favourites — returns to the carousel" aria-label="Remove from favourites"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true"><path d="M12 20.3l-7.1-7A4.6 4.6 0 0 1 11.4 6l.6.6.6-.6a4.6 4.6 0 0 1 6.5 7.2z"/></svg></button>';
    d.querySelector('.fx').onclick=function(e){e.stopPropagation();FAVES=FAVES.filter(function(q){return q!==f;});renderFaves();_refreshRails();toast(f.n+' returned to the carousel');};
    var dragged=false;
    if(f.k==='board'||f.k==='carcass'){
      d.addEventListener('pointerdown',function(e){ if(e.target.closest('.fx'))return;
        var sx=e.clientX,sy=e.clientY,ghost=null; dragged=false;
        function mv(ev){var dx=ev.clientX-sx,dy=ev.clientY-sy;if(!dragged&&Math.abs(dx)<6&&Math.abs(dy)<6)return;dragged=true;
          if(!ghost){ghost=document.createElement('img');ghost.src='showcase/finishes/'+favKey(f)+'.webp';ghost.className='hghost';ghost.style.width='120px';ghost.style.borderRadius='8px';document.body.appendChild(ghost);}
          ghost.style.left=(ev.clientX-60)+'px';ghost.style.top=(ev.clientY-40)+'px';}
        function up(ev){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
          if(ghost){ghost.remove();var layer=el('hlayer'),lr=layer.getBoundingClientRect();
            if(ev.clientY>lr.top&&ev.clientX<lr.right){placeWood({s:favKey(f),n:f.n},ev.clientX-lr.left,ev.clientY-lr.top);}}}
        document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
      });
    }
    d.addEventListener('click',function(e){ if(e.target.closest('.fx')||dragged)return; applyFav(f); });
    row.appendChild(d);
  });
}
function applyFav(f){
  if(f.k==='paint'){addPaint([f.n,f.hex]);}
  else fillSide(f.k==='carcass'?'carcass':f.k,{s:favKey(f),n:f.n,img:f.img});
  toast('Applied · '+f.n);
}
function favFromRail(kind,it){
  var f=kind==='paint'?{k:'paint',key:it[0],n:it[0],hex:it[1]}:{k:(kind==='carcass'?'board':kind),key:it.s,n:it.n,img:it.img};
  if(FAVES.some(function(q){return favKey(q)===f.key;})){toast(f.n+' is already in favourites');return;}
  FAVES.push(f);renderFaves();_refreshRails();toast(f.n+' saved to favourites');
}
function addFave(b){ favFromRail('board',{s:b.s,n:b.n}); }
function placeWood(b,x,y){
  var layer=el('hlayer'); if(!layer)return;
  var d=document.createElement('div'); d.className='woodcard'; d.style.left=(x-61)+'px'; d.style.top=(y-47)+'px';
  d.setAttribute('data-tag','');d.setAttribute('data-brand','Egger');d.setAttribute('data-name',b.n);
  d.innerHTML='<img src="showcase/finishes/'+b.s+'.webp" draggable="false"><div class="cn">'+b.n+'</div><button class="wh" title="Add to favourites" aria-label="Add to favourites"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M12 20.3l-7.1-7A4.6 4.6 0 0 1 11.4 6l.6.6.6-.6a4.6 4.6 0 0 1 6.5 7.2z"/></svg></button><button class="wx" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  layer.appendChild(d);
  var xb=d.querySelector('.wx'); xb.onclick=function(e){e.stopPropagation();d.remove();};
  var hb=d.querySelector('.wh'); hb.onclick=function(e){e.stopPropagation();addFave(b);hb.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11" aria-hidden="true"><path d="M12 20.3l-7.1-7A4.6 4.6 0 0 1 11.4 6l.6.6.6-.6a4.6 4.6 0 0 1 6.5 7.2z"/></svg>';hb.classList.add('on');};
  d.addEventListener('pointerdown',function(e){ if(xb.contains(e.target))return; e.stopPropagation();
    var mx=e.clientX,my=e.clientY,l=parseFloat(d.style.left),t=parseFloat(d.style.top);
    function mv(ev){d.style.left=(l+ev.clientX-mx)+'px';d.style.top=(t+ev.clientY-my)+'px';}
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);});
}
var RULES=null;
_ready.push(fetch('showcase/suggest/complements.json').then(function(r){return r.json();}).then(function(m){RULES=m;}).catch(function(){}));
/* Rules-driven pairings: Egger decor complements + F&B scheme companions; band-complement fallback. */
function suggestBoards(){
  if(!sel.board) return [];
  var out=[], seen={};
  function push(s){ if(seen[s]||s===sel.board.s)return; var b=null; for(var i=0;i<BOARDS.length;i++)if(BOARDS[i].s===s){b=BOARDS[i];break;} if(b){seen[s]=1;out.push(b);} }
  var r=RULES&&RULES.boards&&RULES.boards[sel.board.s];
  if(r){ (r.unis||[]).forEach(push); (r.woods||[]).forEach(push); }
  if(out.length<6){
    var band=boardBand(sel.board), mates=(RULES&&RULES.bands&&RULES.bands[band])||[];
    BOARDS.forEach(function(b){ if(out.length>=6)return; if(mates.indexOf(boardBand(b))>=0) push(b.s); });
  }
  return out.slice(0,6);
}
function suggestPaints(){
  if(!sel.board) return [];
  var out=[], seen={};
  function push(n){ if(seen[n])return; for(var i=0;i<FB.length;i++)if(FB[i][0]===n){seen[n]=1;out.push(FB[i]);return;} }
  var r=RULES&&RULES.boards&&RULES.boards[sel.board.s];
  if(r)(r.paints||[]).forEach(push);
  if(sel.paint){ var p=RULES&&RULES.paints&&RULES.paints[sel.paint[0]];
    if(p){ if(p.white)push(p.white); if(p.trim)push(p.trim); (p.accents||[]).forEach(push); } }
  return out.slice(0,4);
}
function showSuggest(){if(!bothChosen())return;var row=el('srow');
  var picks=suggestBoards().slice(0,5), paints2=suggestPaints().slice(0,4);
  
  var ph='', bh='';
  paints2.forEach(function(p){ ph+='<div class="scard pcard" data-paint="'+p[0]+'" data-tip="'+p[0]+'\nFarrow & Ball · '+p[1].toUpperCase()+'"><div class="si" style="background:'+p[1]+'"></div></div>'; });
  picks.forEach(function(b){ bh+='<div class="scard" data-s="'+b.s+'" data-n="'+b.n+'" data-tip="'+b.n+'\nEgger"><img src="showcase/finishes/'+b.s+'.webp" draggable="false"></div>'; });
  row.innerHTML=(ph?'<div class="sgrp"><div class="sgl">Walls · Farrow &amp; Ball</div><div class="sgr">'+ph+'</div></div>':'')
    +(bh?'<div class="sgrp"><div class="sgl">Boards · Egger</div><div class="sgr">'+bh+'</div></div>':'');
  [].forEach.call(row.querySelectorAll('.pcard'),function(c){
    c.addEventListener('click',function(){ var nm=c.getAttribute('data-paint'); for(var i=0;i<FB.length;i++)if(FB[i][0]===nm){addPaint(FB[i]);toast('Wall · '+nm);break;} });
  });
  [].forEach.call(row.querySelectorAll('.scard[data-s]'),function(c){
    c.addEventListener('pointerdown',function(e){
      var sx=e.clientX,sy=e.clientY,ghost=null,moved=false,s=c.getAttribute('data-s'),n=c.getAttribute('data-n');
      function mv(ev){var dx=ev.clientX-sx,dy=ev.clientY-sy;if(!moved&&Math.abs(dx)<6&&Math.abs(dy)<6)return;moved=true;
        if(!ghost){ghost=document.createElement('img');ghost.src='showcase/finishes/'+s+'.webp';ghost.className='hghost';ghost.style.width='120px';ghost.style.borderRadius='8px';document.body.appendChild(ghost);}
        ghost.style.left=(ev.clientX-60)+'px';ghost.style.top=(ev.clientY-40)+'px';}
      function up(ev){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
        if(ghost){ghost.remove();var layer=el('hlayer'),lr=layer.getBoundingClientRect();
          if(ev.clientY>lr.top&&ev.clientX<lr.right){placeWood({s:s,n:n},ev.clientX-lr.left,ev.clientY-lr.top);}}
        else{ fillSide('board',{s:s,n:n}); showSuggest(); }}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
    });
  });
  var sg=el('suggest');if(!sg._shown){sg._shown=true;sg.classList.add('min');}sg.classList.add('on');requestAnimationFrame(function(){sg.classList.add('show');if(!sg.style.transform)spring(sg,{transform:['translate(-50%,14px)','translate(-50%,0px)']},{type:'spring',stiffness:260,damping:24});});}
el('sx').onclick=function(){var sg=el('suggest');sg.classList.remove('show');setTimeout(function(){sg.classList.remove('on');},600);};
if(el('smin'))el('smin').onclick=function(e){e.stopPropagation();var sg=el('suggest');sg.classList.add('min');};
/* Undock: drag the suggestions panel anywhere by its header. */
(function(){var sg=el('suggest'),h=el('shdl');if(!sg||!h)return;
  sg.addEventListener('pointerdown',function(e){ if(e.target.closest('#sx')||e.target.closest('.scard'))return; e.preventDefault();
    var r=sg.getBoundingClientRect(); sg.style.right='auto'; sg.style.bottom='auto'; sg.style.left=r.left+'px'; sg.style.top=r.top+'px'; sg.style.transform='none';
    var mx=e.clientX,my=e.clientY,l=r.left,t=r.top,movedS=false,tapOK=!!(e.target.closest('.sh')||sg.classList.contains('min')); sg.classList.add('dragging'); try{sg.setPointerCapture(e.pointerId);}catch(_){}
    function mv(ev){ if(Math.abs(ev.clientX-mx)>6||Math.abs(ev.clientY-my)>6)movedS=true;
      sg.style.left=Math.max(140-sg.offsetWidth,Math.min(window.innerWidth-140,l+ev.clientX-mx))+'px';
      sg.style.top=Math.max(4,Math.min(window.innerHeight-44,t+ev.clientY-my))+'px'; }
    function up(){ sg.classList.remove('dragging'); document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up);
      if(!movedS&&tapOK){sg.classList.toggle('min');
        requestAnimationFrame(function(){
          var w=sg.offsetWidth,hh=sg.offsetHeight,lft=parseFloat(sg.style.left),tp=parseFloat(sg.style.top);
          if(!isNaN(lft))sg.style.left=Math.max(10,Math.min(window.innerWidth-w-10,lft))+'px';
          if(!isNaN(tp))sg.style.top=Math.max(4,Math.min(window.innerHeight-hh-10,tp))+'px';
        });} }
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up); });
})();

var CRC=(function(){var t=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u8){var c=0xFFFFFFFF;for(var i=0;i<u8.length;i++)c=CRC[(c^u8[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function dataURLtoU8(d){var b=atob(d.split(',')[1]);var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function zip(files){var chunks=[],central=[],offset=0;
  function w16(v){return[v&255,(v>>8)&255];}function w32(v){return[v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255];}
  files.forEach(function(f){var name=[];for(var i=0;i<f.name.length;i++)name.push(f.name.charCodeAt(i));var data=f.data,c=crc32(data);
    var lh=[].concat(w32(0x04034b50),w16(20),w16(0),w16(0),w16(0),w16(0),w32(c),w32(data.length),w32(data.length),w16(name.length),w16(0),name);
    chunks.push(new Uint8Array(lh));chunks.push(data);
    central.push(new Uint8Array([].concat(w32(0x02014b50),w16(20),w16(20),w16(0),w16(0),w16(0),w16(0),w32(c),w32(data.length),w32(data.length),w16(name.length),w16(0),w16(0),w16(0),w16(0),w32(0),w32(offset),name)));
    offset+=lh.length+data.length;});
  var csize=central.reduce(function(a,b){return a+b.length;},0);
  var end=new Uint8Array([].concat(w32(0x06054b50),w16(0),w16(0),w16(files.length),w16(files.length),w32(csize),w32(offset),w16(0)));
  var all=chunks.concat(central,[end]),total=all.reduce(function(a,b){return a+b.length;},0),out=new Uint8Array(total),p=0;
  all.forEach(function(u){out.set(u,p);p+=u.length;});return out;}
function panelSwatchPNG(job,cb){
  var cv=document.createElement('canvas');cv.width=1400;cv.height=1000;var x=cv.getContext('2d');
  function caption(){x.fillStyle='#FAF8F3';x.fillRect(0,840,1400,160);x.fillStyle='#1D1D1D';x.font='500 44px "IBM Plex Mono",monospace';x.fillText(job.label,50,910);
    x.font='500 28px "IBM Plex Mono",monospace';x.fillStyle='#62584F';x.fillText(job.sub,50,960);cb(cv.toDataURL('image/png'));}
  if(job.hex){x.fillStyle=job.hex;x.fillRect(0,0,1400,840);caption();}
  else{var im=new Image();im.onload=function(){var sc=Math.max(1400/im.width,840/im.height);x.drawImage(im,(1400-im.width*sc)/2,(840-im.height*sc)/2,im.width*sc,im.height*sc);caption();};im.onerror=function(){x.fillStyle='#EFE9DD';x.fillRect(0,0,1400,840);caption();};im.src=job.url;}
}
function buildZipExtras(cb){
  var jobs=[];
  if(wallMode==='wallpaper'&&wallPaper)jobs.push({label:wallPaper.n,sub:'Walls · Farrow & Ball wallpaper',url:wallPaper.img,file:'panel-walls.png'});
  else if(paints[0])jobs.push({label:paints[0][0],sub:'Walls · Farrow & Ball · '+paints[0][1].toUpperCase(),hex:paints[0][1],file:'panel-walls.png'});
  if(ceilOn&&ceilCol)jobs.push({label:ceilCol[0],sub:'Ceiling · Farrow & Ball · '+ceilCol[1].toUpperCase(),hex:ceilCol[1],file:'panel-ceiling.png'});
  if(skirtOn&&skirtCol)jobs.push({label:skirtCol[0],sub:'Skirting · Farrow & Ball · '+skirtCol[1].toUpperCase(),hex:skirtCol[1],file:'panel-skirting.png'});
  if(sel.worktop)jobs.push({label:sel.worktop.n,sub:'Worktop · Omega Stone',url:sel.worktop.img||('showcase/worktops/'+sel.worktop.s),file:'panel-worktop.png'});
  if(sel.carcass)jobs.push({label:sel.carcass.n,sub:'Carcass · Egger',url:'showcase/finishes/'+sel.carcass.s+'.webp',file:'panel-carcass.png'});
  if(sel.board)jobs.push({label:sel.board.n,sub:'Boards · Egger',url:'showcase/finishes/'+sel.board.s+'.webp',file:'panel-boards.png'});
  if(floor&&el('floorbar').classList.contains('filled'))jobs.push({label:floor.name,sub:'Floor · '+(floor.type==='hard'?'Egger':'Crucial Trading'),url:floor.url,file:'panel-floor.png'});
  var out=[];
  function next(){
    if(!jobs.length){
      composeScene(function(cv){out.push({name:'scheme-photo.png',data:dataURLtoU8(cv.toDataURL('image/png'))});cb(out);});
      return;
    }
    var j=jobs.shift();
    panelSwatchPNG(j,function(png){out.push({name:j.file,data:dataURLtoU8(png)});next();});
  }
  next();
}
el('bzip').onclick=function(){
  buildZipExtras(function(extra){
  if(!items.length&&!extra.length){toast('Shortlist is empty');return;}
  var files=items.map(function(s){return {name:s.file,data:dataURLtoU8(s.png)};}).concat(extra);
  fetch('sturij-about.pdf').then(function(r){return r.ok?r.arrayBuffer():null;}).catch(function(){return null;}).then(function(buf){
    if(buf) files.push({name:'about-sturij.pdf',data:new Uint8Array(buf)});
    var blob=new Blob([zip(files)],{type:'application/zip'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sturij-pairings.zip';a.click();toast('Zip downloaded');
  });
  });
};

/* ===== peel-off post-it tag: drag from pad, drop on a finish ===== */
(function(){
  var pad=el('pad'); if(!pad) return;
  function noteHTML(brand,name,meta){return '<div class="wm"></div><span class="tape"></span><div class="brand">'+brand+'</div><div class="nm">'+name+'</div><div class="meta">'+(meta||'Sturij')+'</div><div class="curl"></div>';}
  function tagOf(node){ if(!node) return null; var t=node.closest&&node.closest('[data-tag]'); if(!t) return null; var nm=t.getAttribute('data-name'); if(!nm) return null; return {brand:t.getAttribute('data-brand')||'Sturij',name:nm}; }
  function makeNoteMovable(s){
    var xb=s.querySelector('.nx'); if(xb) xb.onclick=function(e){e.stopPropagation();window._railNotes=(window._railNotes||[]).filter(function(n){return n.el!==s;});window._floorNotes=(window._floorNotes||[]).filter(function(n){return n.el!==s;});s.remove();};
    s.addEventListener('pointerdown',function(e){ if((xb&&xb.contains(e.target))||e.target.isContentEditable)return; e.stopPropagation();
      s.classList.add('dragging'); var mx=e.clientX,my=e.clientY,l=parseFloat(s.style.left),t=parseFloat(s.style.top); try{s.setPointerCapture(e.pointerId);}catch(_){}
      function mv(ev){s.style.left=(l+ev.clientX-mx)+'px';s.style.top=(t+ev.clientY-my)+'px';}
      function up(){s.classList.remove('dragging');document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
        var reg=(window._railNotes||[]).filter(function(n){return n.el===s;})[0];
        if(reg&&reg.rail._pool){var hit=null;reg.rail._pool.forEach(function(p){if(p._idx===reg.idx)hit=p;});
          if(hit){reg.dx=parseFloat(s.style.left)||0;reg.dy=(parseFloat(s.style.top)||0)-(parseFloat(hit.style.top)||0);}}}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up); });
  }
  pad.addEventListener('pointerdown',function(e){
    e.preventDefault(); try{pad.setPointerCapture(e.pointerId);}catch(_){}
    var note=document.createElement('div'); note.className='note drag';
    note.innerHTML=noteHTML('Sturij','Drop on a finish…','peel &amp; place');
    document.body.appendChild(note);
    function place(cx,cy){note.style.left=(cx-76)+'px';note.style.top=(cy-50)+'px';}
    place(e.clientX,e.clientY);
    function mv(ev){place(ev.clientX,ev.clientY);}
    function up(ev){
      document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
      note.style.display='none';
      var under=null;
      var stack=(document.elementsFromPoint?document.elementsFromPoint(ev.clientX,ev.clientY):[document.elementFromPoint(ev.clientX,ev.clientY)])||[];
      for(var si2=0;si2<stack.length;si2++){var cand=stack[si2];if(cand&&(!cand.closest||!cand.closest('.note'))){under=cand;break;}}
      note.remove();
      var info=tagOf(under);
      var s=document.createElement('div');
      if(info){
        s.className='note stuck';
        s.innerHTML=noteHTML(info.brand,info.name,'Sturij')+'<div class="body" contenteditable="true" data-ph="Add a note…"></div><button class="nx" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      } else {
        s.className='note stuck free';
        s.innerHTML='<div class="wm"></div><span class="tape"></span><div class="brand">Note</div><div class="body" contenteditable="true" data-ph="Type a note…"></div><div class="curl"></div><button class="nx" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      }
      var host=under&&under.closest?under.closest('.side'):null;
      if(host){var hr=host.getBoundingClientRect();s.style.position='absolute';s.style.zIndex='9';s.style.left=Math.max(4,Math.min(hr.width-158,ev.clientX-hr.left-76))+'px';s.style.top=Math.max(4,Math.min(hr.height-110,ev.clientY-hr.top-50))+'px';}
      var stripEl=under&&under.closest?under.closest('.strip'):null, railHost=stripEl?stripEl.closest('.rail'):null;
      if(host&&railHost&&stripEl){var shp=stripEl.offsetHeight||66, sdy=Math.max(3,Math.round((shp-98)/2));
        s.style.top=((parseFloat(stripEl.style.top)||0)+sdy)+'px';
        window._railNotes.push({el:s,rail:railHost,idx:+stripEl.getAttribute('data-i'),dx:parseFloat(s.style.left)||0,dy:sdy});
        if(railHost._render)requestAnimationFrame(function(){railHost._render();});}
      var tileEl=under&&under.closest?under.closest('.ftile'):null;
      if(tileEl){var fb2=el('floorbar'),fr2=fb2.getBoundingClientRect();
        s.style.position='absolute';s.style.zIndex='9';
        var twp=tileEl.offsetWidth||200;
        s.style.left=((parseFloat(tileEl.style.left)||0)+Math.round((twp-152)/2))+'px';
        s.style.top=Math.max(6,Math.round((fr2.height-98)/2))+'px';
        window._floorNotes.push({el:s,idx:+tileEl.getAttribute('data-i'),type:floorType,dx:Math.round((twp-152)/2),dy:parseFloat(s.style.top)||0});}
      else{s.style.left=(ev.clientX-76)+'px';s.style.top=(ev.clientY-50)+'px';}
      s.style.transform='rotate('+(((ev.clientX%9)-4)).toFixed(0)+'deg)';
      (tileEl?el('floorbar'):(host||document.body)).appendChild(s); makeNoteMovable(s);
      var bd=s.querySelector('.body'); if(bd){ bd.addEventListener('pointerdown',function(ev2){ev2.stopPropagation();}); setTimeout(function(){bd.focus();},0); }
      window._noteDrop=Date.now();
      toast(info?('Tagged · '+info.name):'Note added — type into it');
    }
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  });
  window._restoreNote=function(o){
    var s=document.createElement('div');
    if(o.name){ s.className='note stuck'; s.innerHTML=noteHTML(o.brand||'Sturij',o.name,'Sturij')+'<div class="body" contenteditable="true" data-ph="Add a note…"></div><button class="nx" title="Remove" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'; }
    else { s.className='note stuck free'; s.innerHTML='<div class="wm"></div><span class="tape"></span><div class="brand">Note</div><div class="body" contenteditable="true" data-ph="Type a note…"></div><div class="curl"></div><button class="nx" title="Remove" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'; }
    s.style.left=o.x+'px'; s.style.top=o.y+'px'; s.style.transform='rotate('+(o.r||-4)+'deg)';
    var host=o.host?document.getElementById(o.host):null;
    if(host){s.style.position='absolute';s.style.zIndex='9';}
    if(o.railId&&typeof o.ri==='number'){var rl=document.getElementById(o.railId);if(rl){window._railNotes.push({el:s,rail:rl,idx:o.ri,dx:o.x,dy:o.rdy||0});if(rl._pool&&window._syncRailNotes)_syncRailNotes(rl,rl._pool);}}
    if(typeof o.fi==='number'&&o.fi!==null&&o.ftp){var fb3=document.getElementById('floorbar');if(fb3){s.style.position='absolute';s.style.zIndex='9';fb3.appendChild(s);window._floorNotes.push({el:s,idx:o.fi,type:o.ftp,dx:o.fdx||0,dy:o.y});renderFloorRail();}}
    var bd=s.querySelector('.body'); if(bd){bd.textContent=o.text||''; bd.addEventListener('pointerdown',function(ev2){ev2.stopPropagation();});}
    (host||document.body).appendChild(s); makeNoteMovable(s);
    if(host&&window._clampNotes)setTimeout(_clampNotes,50);
  };
})();
/* ===== Handles drawer: endless carousel → drag onto canvas → move/resize/remove ===== */
(function(){
  function hsvg(k){
    var g="<defs><linearGradient id='m' x1='0' y1='0' x2='.4' y2='1'><stop offset='0' stop-color='#eef0f2'/><stop offset='.45' stop-color='#c3c9cf'/><stop offset='1' stop-color='#868d94'/></linearGradient></defs>";
    var shapes={
      bar:"<rect x='16' y='30' width='168' height='15' rx='7.5' fill='url(#m)'/><rect x='26' y='44' width='11' height='20' rx='5' fill='url(#m)'/><rect x='163' y='44' width='11' height='20' rx='5' fill='url(#m)'/>",
      bow:"<path d='M30 62 V44 a70 70 0 0 1 140 0 V62' fill='none' stroke='url(#m)' stroke-width='13' stroke-linecap='round'/>",
      tbar:"<rect x='30' y='30' width='140' height='13' rx='6.5' fill='url(#m)'/><rect x='93' y='42' width='14' height='24' rx='4' fill='url(#m)'/>",
      knob:"<circle cx='100' cy='42' r='26' fill='url(#m)'/><rect x='92' y='60' width='16' height='12' rx='3' fill='url(#m)'/>",
      cup:"<path d='M40 34 h120 a60 60 0 0 1 -120 0 z' fill='url(#m)'/><rect x='40' y='30' width='120' height='7' rx='3.5' fill='url(#m)'/>"
    };
    var b=shapes[k]||shapes.bar;
    return "data:image/svg+xml;utf8,"+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 84'>"+g+b+"</svg>");
  }
  var PLACE=[{name:'Bar 160',type:'bar',img:hsvg('bar')},{name:'Bow D',type:'bow',img:hsvg('bow')},{name:'T-bar',type:'tbar',img:hsvg('tbar')},{name:'Knob',type:'knob',img:hsvg('knob')},{name:'Cup pull',type:'cup',img:hsvg('cup')}];
  var HANDLES=PLACE.slice(), real=false;
  var car=el('hcar'), ct=car&&car.querySelector('.hct'), layer=el('hlayer');
  if(!car||!ct||!layer) return;
  var curType='all';
  function types(){ var s={}; HANDLES.forEach(function(h){s[h.type||'other']=1;}); return Object.keys(s).sort(); }
  function chips(){ if(!el('hfilt'))return; var ts=['all'].concat(types()); el('hfilt').innerHTML=ts.map(function(t){return '<button class="hchip'+(t===curType?' on':'')+'" data-t="'+t+'">'+(t==='all'?'All':t)+'</button>';}).join(''); }
  function build(){
    HANDLES.forEach(function(h,i){h._i=i;});
    var list=(curType==='all')?HANDLES:HANDLES.filter(function(h){return (h.type||'other')===curType;});
    var one=list.map(function(h){return '<div class="hcard" data-i="'+h._i+'"><div class="im"><img loading="lazy" src="'+h.img+'" alt="'+h.name+'" draggable="false"></div><div class="nm">'+h.name+'</div></div>';}).join('');
    ct.innerHTML=one+one;
    if(el('hcnt'))el('hcnt').textContent=(curType==='all'?HANDLES.length:list.length)+(real?'':' · demo');
    chips(); y=0; setTimeout(measure,60);
  }
  if(el('hfilt'))el('hfilt').addEventListener('click',function(e){var b=e.target.closest('.hchip');if(!b)return;curType=b.getAttribute('data-t');build();});
  _ready.push(fetch('showcase/handles/handles.json').then(function(r){return r.json();}).then(function(m){
    if(m&&m.length){ HANDLES=m.map(function(h){return {name:h.name,type:h.type,img:'showcase/handles/'+h.file};}); real=true; build(); }
  }).catch(function(){}));
  var y=0, setH=0;
  function measure(){ setH=ct.scrollHeight/2; ap(); }
  function ap(){ if(setH){var mm=((y%setH)+setH)%setH; ct.style.transform='translateY('+(-mm)+'px)';} }
  car.addEventListener('wheel',function(e){ e.preventDefault(); y+=e.deltaY; ap(); },{passive:false});
  el('htab').onclick=function(){ var d=el('hdraw'),on=!d.classList.contains('on'); d.classList.toggle('on',on); if(on)spring(d,{transform:['translateX(100%)','translateX(0%)']}); setTimeout(measure,20); };
  el('hdx').onclick=function(){ el('hdraw').classList.remove('on'); };
  // pointerdown on a card: vertical = scroll carousel, drag-left = pull a handle out onto the scene
  ct.addEventListener('pointerdown',function(e){
    var card=e.target.closest('.hcard'); if(!card)return;
    var sx=e.clientX, sy=e.clientY, ys=y, idx=(+card.getAttribute('data-i'))%HANDLES.length, mode=0, ghost=null;
    function mv(ev){
      var dx=ev.clientX-sx, dy=ev.clientY-sy;
      if(!mode){ if(Math.abs(dx)<7&&Math.abs(dy)<7) return; mode=(Math.abs(dx)>Math.abs(dy)+2)?'out':'scroll'; }
      if(mode==='scroll'){ y=ys-(ev.clientY-sy); ap(); return; }
      if(!ghost){ ghost=document.createElement('img'); ghost.src=HANDLES[idx].img; ghost.className='hghost'; ghost.style.width='120px'; document.body.appendChild(ghost); }
      ghost.style.left=(ev.clientX-60)+'px'; ghost.style.top=(ev.clientY-40)+'px';
    }
    function up(ev){
      document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up);
      if(ghost){ ghost.remove(); var lr=layer.getBoundingClientRect();
        if(ev.clientX<lr.right-10 && ev.clientY>lr.top){ place(idx, ev.clientX-lr.left, ev.clientY-lr.top); if(window.innerWidth<560)el('hdraw').classList.remove('on'); } }
    }
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up);
  });
  var selEl=null;
  function selectPlaced(d){ if(selEl&&selEl!==d)selEl.classList.remove('sel'); selEl=d; d.classList.add('sel'); }
  function place(idx,px,py){
    var S=118, h=HANDLES[idx];
    var d=document.createElement('div'); d.className='hplaced'; d.style.left=(px-S/2)+'px'; d.style.top=(py-S/2)+'px'; d.style.width=S+'px'; d.style.height=(S*0.52)+'px';
    d.setAttribute('data-tag',''); d.setAttribute('data-brand', real?'Häfele / Hendel':'Handle'); d.setAttribute('data-name', h.name);
    d.innerHTML='<img src="'+h.img+'" draggable="false"><button class="hx" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="hgrip"></span>';
    layer.appendChild(d); selectPlaced(d);
    var grip=d.querySelector('.hgrip'), xb=d.querySelector('.hx');
    xb.onclick=function(e){ e.stopPropagation(); d.remove(); if(selEl===d)selEl=null; };
    d.addEventListener('dblclick',function(){ d.remove(); if(selEl===d)selEl=null; });
    d.addEventListener('pointerdown',function(e){
      if(grip.contains(e.target)||xb.contains(e.target))return; e.stopPropagation(); selectPlaced(d);
      var mx=e.clientX,my=e.clientY,l=parseFloat(d.style.left),t=parseFloat(d.style.top);
      function mv(ev){ d.style.left=(l+ev.clientX-mx)+'px'; d.style.top=(t+ev.clientY-my)+'px'; }
      function up(){ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); }
      document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up);
    });
    grip.addEventListener('pointerdown',function(e){
      e.stopPropagation(); selectPlaced(d);
      var mx=e.clientX, w=d.offsetWidth, ar=d.offsetHeight/d.offsetWidth;
      function mv(ev){ var nw=Math.max(34,w+(ev.clientX-mx)); d.style.width=nw+'px'; d.style.height=(nw*ar)+'px'; }
      function up(){ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); }
      document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up);
    });
  }
  document.addEventListener('pointerdown',function(e){ if(selEl && !e.target.closest('.hplaced') && !e.target.closest('.hdraw') && !e.target.closest('.htab')){ selEl.classList.remove('sel'); selEl=null; } });
  window._placeHandle=function(o){var idx=-1;for(var i=0;i<HANDLES.length;i++)if(HANDLES[i].name===o.n){idx=i;break;}if(idx<0)return;place(idx,o.x+o.w/2,o.y+(o.w*0.52)/2);var d=layer.lastElementChild;d.style.left=o.x+'px';d.style.top=o.y+'px';d.style.width=o.w+'px';d.style.height=(o.w*0.52)+'px';d.classList.remove('sel');selEl=null;};
  build();
})();

/* ===== Sockets & switches drawer — clones the Handles pattern; SVG assets, drag onto the wall ===== */
(function(){
  var layer=el('hlayer'), car=el('skcar'), ct=car&&car.querySelector('.hct'), finBox=el('skfin');
  if(!car||!ct||!layer||!finBox) return;
  var FIN=[['Steel','#c9ccd0'],['Matt Black','#2b2b2d'],['Brass','#b9974f'],['Chrome','#dfe3e7'],['White','#f4f2ec']];
  var TYPES=[{k:'double',n:'Double socket'},{k:'single',n:'Single socket'},{k:'switch',n:'Light switch'},{k:'usb',n:'USB socket'}];
  var curFin=0;
  function outlet(cx,cy,pc){return '<g fill="'+pc+'"><rect x="'+(cx-3)+'" y="'+(cy-15)+'" width="6" height="10" rx="1.5"/><rect x="'+(cx-14)+'" y="'+(cy+1)+'" width="11" height="5" rx="1.5"/><rect x="'+(cx+3)+'" y="'+(cy+1)+'" width="11" height="5" rx="1.5"/></g>';}
  function svg(type,color){
    var dark=(color==='#2b2b2d'), pc=dark?'#9a9a9a':'#3a3a3a', inner='';
    if(type==='double') inner=outlet(32,50,pc)+outlet(68,50,pc);
    else if(type==='single') inner=outlet(50,50,pc);
    else if(type==='switch') inner='<rect x="35" y="26" width="30" height="48" rx="5" fill="'+pc+'" opacity=".9"/><rect x="41" y="33" width="18" height="17" rx="3" fill="'+(dark?'#3a3a3a':'#ededed')+'"/>';
    else inner='<g fill="'+pc+'"><rect x="30" y="41" width="17" height="8" rx="2.5"/><rect x="53" y="41" width="17" height="8" rx="2.5"/><rect x="33" y="43.5" width="11" height="3" rx="1" fill="'+(dark?'#2b2b2d':'#d2d2d2')+'"/><rect x="56" y="43.5" width="11" height="3" rx="1" fill="'+(dark?'#2b2b2d':'#d2d2d2')+'"/></g>';
    return '<svg viewBox="0 0 100 100"><rect x="7" y="7" width="86" height="86" rx="11" fill="'+color+'" stroke="rgba(0,0,0,.22)" stroke-width="1.5"/>'+inner+'</svg>';
  }
  function chips(){ finBox.innerHTML=FIN.map(function(f,i){return '<button class="skchip'+(i===curFin?' on':'')+'" data-i="'+i+'"><span style="background:'+f[1]+'"></span>'+f[0]+'</button>';}).join(''); }
  function build(){ var c=FIN[curFin][1]; ct.innerHTML=TYPES.map(function(t,i){return '<div class="skcard" data-i="'+i+'"><div class="im">'+svg(t.k,c)+'</div><div class="nm">'+t.n+'</div></div>';}).join(''); }
  finBox.addEventListener('click',function(e){var b=e.target.closest('.skchip');if(!b)return;curFin=+b.getAttribute('data-i');chips();build();});
  el('sktab').onclick=function(){var d=el('skdraw'),on=!d.classList.contains('on');d.classList.toggle('on',on);if(on)spring(d,{transform:['translateX(100%)','translateX(0%)']});};
  el('skx').onclick=function(){el('skdraw').classList.remove('on');};
  ct.addEventListener('pointerdown',function(e){
    var card=e.target.closest('.skcard'); if(!card)return;
    var sx=e.clientX,sy=e.clientY,idx=+card.getAttribute('data-i'),moved=false,ghost=null;
    function mv(ev){ var dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved){if(Math.abs(dx)<7&&Math.abs(dy)<7)return;moved=true;}
      if(!ghost){ghost=document.createElement('div');ghost.className='hghost skghost';ghost.innerHTML=svg(TYPES[idx].k,FIN[curFin][1]);document.body.appendChild(ghost);}
      ghost.style.left=(ev.clientX-48)+'px';ghost.style.top=(ev.clientY-48)+'px'; }
    function up(ev){ document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
      if(ghost){ghost.remove();var lr=layer.getBoundingClientRect();
        if(ev.clientX<lr.right-10&&ev.clientY>lr.top){place(idx,ev.clientX-lr.left,ev.clientY-lr.top);if(window.innerWidth<560)el('skdraw').classList.remove('on');}} }
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  });
  var selEl=null;
  function sel(d){if(selEl&&selEl!==d)selEl.classList.remove('sel');selEl=d;d.classList.add('sel');}
  function place(idx,px,py){
    var S=68,t=TYPES[idx],c=FIN[curFin][1];
    var d=document.createElement('div');d.className='skplaced';d.style.left=(px-S/2)+'px';d.style.top=(py-S/2)+'px';d.style.width=S+'px';d.style.height=S+'px';
    d.setAttribute('data-tag','');d.setAttribute('data-brand','Socket');d.setAttribute('data-name',t.n+' · '+FIN[curFin][0]);d.setAttribute('data-ti',idx);d.setAttribute('data-fi',curFin);
    d.innerHTML=svg(t.k,c)+'<button class="hx" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="hgrip"></span>';
    layer.appendChild(d);sel(d);
    var grip=d.querySelector('.hgrip'),xb=d.querySelector('.hx');
    xb.onclick=function(e){e.stopPropagation();d.remove();if(selEl===d)selEl=null;};
    d.addEventListener('dblclick',function(){d.remove();if(selEl===d)selEl=null;});
    d.addEventListener('pointerdown',function(e){ if(grip.contains(e.target)||xb.contains(e.target))return;e.stopPropagation();sel(d);
      var mx=e.clientX,my=e.clientY,l=parseFloat(d.style.left),tp=parseFloat(d.style.top);
      function mv(ev){d.style.left=(l+ev.clientX-mx)+'px';d.style.top=(tp+ev.clientY-my)+'px';}
      function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up); });
    grip.addEventListener('pointerdown',function(e){ e.stopPropagation();sel(d);
      var mx=e.clientX,w=d.offsetWidth;
      function mv(ev){var nw=Math.max(30,w+(ev.clientX-mx));d.style.width=nw+'px';d.style.height=nw+'px';}
      function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up); });
  }
  document.addEventListener('pointerdown',function(e){ if(selEl&&!e.target.closest('.skplaced')&&!e.target.closest('.skdraw')&&!e.target.closest('.sktab')){selEl.classList.remove('sel');selEl=null;} });
  window._placeSocket=function(o){var keep=curFin;curFin=o.f||0;place(o.t||0,o.x+o.w/2,o.y+o.w/2);var d=layer.lastElementChild;d.style.left=o.x+'px';d.style.top=o.y+'px';d.style.width=o.w+'px';d.style.height=o.w+'px';d.classList.remove('sel');selEl=null;curFin=keep;};
  chips();build();
})();

/* ===== Taps drawer — clones the Sockets/Handles pattern; SVG taps, drag onto the scene. Guided: keep to one or two finishes. ===== */
(function(){
  var layer=el('hlayer'), car=el('tpcar'), ct=car&&car.querySelector('.hct'), finBox=el('tpfin');
  if(!car||!ct||!layer||!finBox) return;
  var FIN=[['Chrome','#dfe3e7'],['Brushed Steel','#b7bcc2'],['Matt Black','#2b2b2d'],['Brass','#b9974f'],['Gunmetal','#4a4e54']];
  var TYPES=[{k:'mixer',n:'Mixer tap'},{k:'pullout',n:'Pull-out spray'},{k:'boiling',n:'Boiling-water tap'},{k:'bridge',n:'Bridge tap'}];
  var curFin=0;
  function svg(type,color){
    var dark=(color==='#2b2b2d'), edge=dark?'#141414':'rgba(0,0,0,.30)', hl=dark?'rgba(255,255,255,.14)':'rgba(255,255,255,.55)';
    var base='<rect x="33" y="84" width="34" height="8" rx="3.5" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>', g='';
    if(type==='mixer'){
      g='<path d="M50 84 L50 34 Q50 22 62 22 L70 22 Q82 22 82 34 L82 48" fill="none" stroke="'+color+'" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
       +'<path d="M50 84 L50 34 Q50 22 62 22 L70 22 Q82 22 82 34" fill="none" stroke="'+hl+'" stroke-width="2.2" stroke-linecap="round"/>'
       +'<circle cx="82" cy="50" r="4.2" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<rect x="32" y="47" width="16" height="7.5" rx="3.75" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>';
    } else if(type==='pullout'){
      g='<path d="M50 84 L50 34 Q50 22 62 22 L70 22 Q82 22 82 33" fill="none" stroke="'+color+'" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
       +'<rect x="76" y="31" width="12" height="18" rx="5.5" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<circle cx="82" cy="44" r="1.1" fill="'+edge+'"/><circle cx="82" cy="40" r="1.1" fill="'+edge+'"/>'
       +'<rect x="32" y="47" width="16" height="7.5" rx="3.75" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>';
    } else if(type==='boiling'){
      g='<rect x="44" y="30" width="12" height="54" rx="5" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<rect x="40" y="22" width="20" height="12" rx="6" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<path d="M56 44 Q72 44 72 58" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round"/>'
       +'<circle cx="36" cy="40" r="5" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<circle cx="36" cy="53" r="5" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<circle cx="36" cy="40" r="2" fill="#6e2a2e"/>';
    } else {
      g='<rect x="33" y="50" width="8" height="34" rx="4" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<rect x="59" y="50" width="8" height="34" rx="4" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<path d="M37 52 Q37 36 50 36 Q63 36 63 52" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round"/>'
       +'<path d="M50 38 Q50 50 62 50" fill="none" stroke="'+color+'" stroke-width="7" stroke-linecap="round"/>'
       +'<circle cx="37" cy="48" r="4" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>'
       +'<circle cx="63" cy="48" r="4" fill="'+color+'" stroke="'+edge+'" stroke-width="1"/>';
    }
    return '<svg viewBox="0 0 100 100">'+base+g+'</svg>';
  }
  function chips(){ finBox.innerHTML=FIN.map(function(f,i){return '<button class="skchip'+(i===curFin?' on':'')+'" data-i="'+i+'"><span style="background:'+f[1]+'"></span>'+f[0]+'</button>';}).join(''); }
  function build(){ var c=FIN[curFin][1]; ct.innerHTML=TYPES.map(function(t,i){return '<div class="skcard" data-i="'+i+'"><div class="im">'+svg(t.k,c)+'</div><div class="nm">'+t.n+'</div></div>';}).join(''); }
  finBox.addEventListener('click',function(e){var b=e.target.closest('.skchip');if(!b)return;curFin=+b.getAttribute('data-i');chips();build();});
  el('tptab').onclick=function(){var d=el('tpdraw'),on=!d.classList.contains('on');d.classList.toggle('on',on);if(on)spring(d,{transform:['translateX(100%)','translateX(0%)']});};
  el('tpx').onclick=function(){el('tpdraw').classList.remove('on');};
  ct.addEventListener('pointerdown',function(e){
    var card=e.target.closest('.skcard'); if(!card)return;
    var sx=e.clientX,sy=e.clientY,idx=+card.getAttribute('data-i'),moved=false,ghost=null;
    function mv(ev){ var dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved){if(Math.abs(dx)<7&&Math.abs(dy)<7)return;moved=true;}
      if(!ghost){ghost=document.createElement('div');ghost.className='hghost skghost';ghost.innerHTML=svg(TYPES[idx].k,FIN[curFin][1]);document.body.appendChild(ghost);}
      ghost.style.left=(ev.clientX-48)+'px';ghost.style.top=(ev.clientY-48)+'px'; }
    function up(ev){ document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
      if(ghost){ghost.remove();var lr=layer.getBoundingClientRect();
        if(ev.clientX<lr.right-10&&ev.clientY>lr.top){place(idx,ev.clientX-lr.left,ev.clientY-lr.top);if(window.innerWidth<560)el('tpdraw').classList.remove('on');}} }
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  });
  var selEl=null;
  function sel(d){if(selEl&&selEl!==d)selEl.classList.remove('sel');selEl=d;d.classList.add('sel');}
  function place(idx,px,py){
    var S=76,t=TYPES[idx],c=FIN[curFin][1];
    var d=document.createElement('div');d.className='tpplaced';d.style.left=(px-S/2)+'px';d.style.top=(py-S/2)+'px';d.style.width=S+'px';d.style.height=S+'px';
    d.setAttribute('data-tag','');d.setAttribute('data-brand','Tap');d.setAttribute('data-name',t.n+' · '+FIN[curFin][0]);d.setAttribute('data-ti',idx);d.setAttribute('data-fi',curFin);
    d.innerHTML=svg(t.k,c)+'<button class="hx" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="hgrip"></span>';
    layer.appendChild(d);sel(d);
    var grip=d.querySelector('.hgrip'),xb=d.querySelector('.hx');
    xb.onclick=function(e){e.stopPropagation();d.remove();if(selEl===d)selEl=null;};
    d.addEventListener('dblclick',function(){d.remove();if(selEl===d)selEl=null;});
    d.addEventListener('pointerdown',function(e){ if(grip.contains(e.target)||xb.contains(e.target))return;e.stopPropagation();sel(d);
      var mx=e.clientX,my=e.clientY,l=parseFloat(d.style.left),tp=parseFloat(d.style.top);
      function mv(ev){d.style.left=(l+ev.clientX-mx)+'px';d.style.top=(tp+ev.clientY-my)+'px';}
      function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up); });
    grip.addEventListener('pointerdown',function(e){ e.stopPropagation();sel(d);
      var mx=e.clientX,w=d.offsetWidth;
      function mv(ev){var nw=Math.max(34,w+(ev.clientX-mx));d.style.width=nw+'px';d.style.height=nw+'px';}
      function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
      document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up); });
  }
  document.addEventListener('pointerdown',function(e){ if(selEl&&!e.target.closest('.tpplaced')&&!e.target.closest('.tpdraw')&&!e.target.closest('.tptab')){selEl.classList.remove('sel');selEl=null;} });
  window._placeTap=function(o){var keep=curFin;curFin=o.f||0;place(o.t||0,o.x+o.w/2,o.y+o.w/2);var d=layer.lastElementChild;d.style.left=o.x+'px';d.style.top=o.y+'px';d.style.width=o.w+'px';d.style.height=o.w+'px';d.classList.remove('sel');selEl=null;curFin=keep;};
  chips();build();
})();

/* ===== Search drawer (top): keyword search over the catalogue ===== */
(function(){
  var draw=el('sdraw'); if(!draw) return;
  el('stab').onclick=function(){var on=!draw.classList.contains('on');draw.classList.toggle('on',on);if(on){spring(draw,{transform:['translateY(-24px)','translateY(0px)']},{type:'spring',stiffness:320,damping:30});setTimeout(function(){el('sq').focus();},60);}};
  el('sdx').onclick=function(){draw.classList.remove('on');};
  function idx(){
    var ix=[];
    (window.FB||[]).forEach(function(c){ix.push({label:c[0],kind:'Paint',hay:(c[0]+' paint farrow ball wall colour').toLowerCase(),css:'background:'+c[1],apply:function(){addPaint(c);}});});
    (window.BOARDS||[]).forEach(function(bd){ix.push({label:bd.n,kind:'Board',hay:(bd.n+' board boards egger wood grain').toLowerCase(),img:'showcase/finishes/'+bd.s+'.webp',apply:function(){fillSide('board',bd);}});});
    (window.WORKTOPS||[]).forEach(function(w){ix.push({label:w.n,kind:'Worktop',hay:(w.n+' worktop omega quartz stone').toLowerCase(),img:w.img,apply:function(){fillSide('worktop',w);}});});
    (window.WALLPAPERS||[]).forEach(function(w){ix.push({label:w.n,kind:'Wallpaper',hay:(w.n+' wallpaper farrow ball wall pattern').toLowerCase(),img:w.img,apply:function(){fillSide('wallpaper',w);}});});
    (['hard','soft']).forEach(function(t){ (window.FLOORS&&FLOORS[t]||[]).forEach(function(f){ix.push({label:f.name,kind:'Floor',hay:(f.name+' floor flooring '+t+' carpet wool sisal crucial').toLowerCase(),img:f.url,apply:function(){floorType=t;floor=f;el('floorbar').classList.add('filled');var ex=el('fexp');if(ex){ex.style.backgroundImage="url('"+f.url+"')";ex.querySelector('.fn').textContent=f.name;}}});}); });
    return ix;
  }
  function search(q){var toks=q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);if(!toks.length)return[];
    return idx().map(function(it){var s=0;toks.forEach(function(t){if(it.hay.indexOf(t)>=0)s++;});return{it:it,s:s};})
      .filter(function(r){return r.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,12).map(function(r){return r.it;});}
  function render(items,q){var res=el('sres');res.innerHTML='';
    if(!items.length){el('sask').textContent=q?'No matches — try a colour, wood, brand or room.':'';return;}
    items.forEach(function(it){var c=document.createElement('div');c.className='rescard';
      c.innerHTML='<div class="rs" style="'+(it.img?"background-image:url('"+it.img+"')":it.css)+'"></div><div class="rk">'+it.kind+'</div><div class="rl">'+it.label+'</div><button class="rx" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      c.querySelector('.rx').onclick=function(e){e.stopPropagation();c.remove();};
      c.onclick=function(){it.apply();toast(it.kind+' · '+it.label);};
      res.appendChild(c);});
    el('sask').textContent='Not quite? Tell me warmer, darker, or a brand — and I’ll refine.';
  }
  function go(){var q=el('sq').value.trim();render(search(q),q);}
  el('sgo').onclick=go; el('sq').addEventListener('keydown',function(e){if(e.key==='Enter')go();});
  window._searchApply=function(q){var res=search(q);if(res.length){res[0].apply();toast(res[0].kind+' · '+res[0].label);return true;}return false;};
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition, rec=null;
  el('smic').onclick=function(){ if(!SR){toast('Voice not supported here — type instead');return;}
    if(rec){rec.stop();return;} rec=new SR();rec.lang='en-GB';rec.interimResults=false;el('smic').classList.add('rec');
    rec.onresult=function(ev){el('sq').value=ev.results[0][0].transcript;go();};
    rec.onerror=function(){el('smic').classList.remove('rec');rec=null;};
    rec.onend=function(){el('smic').classList.remove('rec');rec=null;}; try{rec.start();}catch(_){} };
})();

/* ===== properties modal (the hidden cog) ===== */
(function(){
  var PANELS=[{k:'ceiling',label:'Ceiling'},{k:'wall',label:'Walls'},{k:'skirting',label:'Skirting'},{k:'worktop',label:'Worktop'},{k:'carcass',label:'Carcass'},{k:'boards',label:'Boards'}];
  var MATS=[{k:'walls',label:'Walls',brands:['Farrow & Ball']},{k:'ceiling',label:'Ceiling',brands:['Farrow & Ball']},{k:'skirting',label:'Skirting',brands:['Farrow & Ball']},{k:'wood',label:'Boards',brands:['Egger']},{k:'carcass',label:'Carcass',brands:['Egger']},{k:'floor',label:'Floor',brands:['Egger','Crucial Trading']},{k:'worktop',label:'Worktop',brands:['Omega Stone']},{k:'tags',label:'Post-it tags',brands:[]}];
  var PVER=5;   /* v5: ceiling and skirting become vertical panels */
  var props={ver:PVER,panelW:{ceiling:10,wall:32,skirting:10,worktop:14,carcass:9,boards:25},mats:{},brands:{},swatchH:66,floorH:120,order:['ceiling','wall','skirting','worktop','carcass','boards']};
  /* Default: a clean canvas — only Walls + Boards on, 50/50. Doors & Carcass are further
     instances of the same Egger board material; Ceiling/Skirting/Floor/Worktop are opt-in.
     Post-it tags stay on. Suppliers all available by default. */
  MATS.forEach(function(m){props.mats[m.k]=false;m.brands.forEach(function(b){props.brands[b]=true;});});
  props.mats.walls=true;props.mats.wood=true;props.mats.tags=true;props.mats.ceiling=true;props.mats.skirting=true;
  /* Persist Properties across refreshes. Load saved state only when it matches the current
     layout version (PVER); a stale/mismatched blob self-heals to defaults so no panel is hidden. */
  var PKEY='sturij.studio.props';
  try{var _sv=JSON.parse(localStorage.getItem(PKEY)||'null');
    if(_sv&&_sv.ver===PVER){
      if(_sv.panelW)for(var _k in _sv.panelW){if(props.panelW.hasOwnProperty(_k))props.panelW[_k]=_sv.panelW[_k];}
      if(_sv.mats)for(var _m in _sv.mats){if(props.mats.hasOwnProperty(_m))props.mats[_m]=_sv.mats[_m];}
      if(_sv.brands)for(var _b in _sv.brands){if(props.brands.hasOwnProperty(_b))props.brands[_b]=_sv.brands[_b];}
      if(typeof _sv.swatchH==='number')props.swatchH=_sv.swatchH;
      if(typeof _sv.floorH==='number')props.floorH=_sv.floorH;
      if(Array.isArray(_sv.order)){var _def=['ceiling','wall','skirting','worktop','carcass','boards'];if(_sv.order.length===_def.length&&_def.every(function(k){return _sv.order.indexOf(k)>=0;}))props.order=_sv.order.slice();}
    }
  }catch(e){}
  function saveProps(){try{localStorage.setItem(PKEY,JSON.stringify(props));}catch(e){}}
  /* Push the loaded materials into the live studio state on boot (zones, floor dock, tags),
     so a persisted layout reappears instead of the toggles snapping back to defaults. */
  window._setZoneMats=function(z){props.mats.ceiling=!!z.c;props.mats.skirting=!!z.s;props.mats.floor=!!z.f;props.mats.walls=z.w!==false;saveProps();};
  function syncStudioFromProps(){
    zones.walls=props.mats.walls!==false; zones.ceiling=!!props.mats.ceiling; zones.skirting=!!props.mats.skirting; zones.floor=!!props.mats.floor;
    document.body.classList.toggle('hasfloor',zones.floor);
    if(el('floorbar'))el('floorbar').classList.toggle('on',zones.floor);
    if(zones.floor&&!floor&&FLOORS[floorType]&&FLOORS[floorType][0])floor=FLOORS[floorType][0];
    if(el('pad'))el('pad').style.display=(props.mats.tags!==false)?'':'none';
    if(typeof syncSub==='function')syncSub();
    if(typeof renderFloorRail==='function')renderFloorRail();
  }
  function showLabel(id,on){var e=el(id);if(e&&e.closest('label'))e.closest('label').style.display=on?'':'none';}
  var MINW=6;
  function panelMat(k){return k==='wall'?'walls':(k==='boards'?'wood':k);}   /* ceiling/skirting map to their own mats */
  /* The wall panel (sidePaint) is always shown; the rest follow their material toggle.
     activeKeys = the panels that are actually visible, in DOM order. */
  var SIDEID={ceiling:'sideCeiling',wall:'sidePaint',skirting:'sideSkirting',worktop:'sideWorktop',carcass:'sideCarcass',boards:'sideBoard'};
  function activeKeys(){var ks=PANELS.map(function(p){return p.k;}).filter(function(k){return k==='wall'||props.mats[panelMat(k)]!==false;});
    return ks.sort(function(a,b){var ia=props.order.indexOf(a),ib=props.order.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib);});}
  function normWidths(keys){
    if(!keys.length)return;
    var sum=0;keys.forEach(function(k){sum+=(props.panelW[k]||MINW);});if(sum<=0)sum=1;
    keys.forEach(function(k){props.panelW[k]=Math.max(MINW,Math.round((props.panelW[k]||MINW)*100/sum));});
    var diff=100-keys.reduce(function(s,k){return s+props.panelW[k];},0);
    if(diff!==0){var big=keys.slice().sort(function(a,b){return props.panelW[b]-props.panelW[a];})[0];props.panelW[big]=Math.max(MINW,props.panelW[big]+diff);}
  }
  /* Only emit columns for the SHOWN panels (hidden ones are display:none and leave the grid),
     normalised to 100% so the visible panels always tile the canvas cleanly. */
  function panelCols(){var keys=activeKeys();var sum=0;keys.forEach(function(k){sum+=(props.panelW[k]||MINW);});if(sum<=0)sum=1;return keys.map(function(k){return Math.round((props.panelW[k]||MINW)*100/sum)+'%';}).join(' ');}
  function showPanel(id,on){var e=el(id);if(e)e.style.display=on?'':'none';}
  function applyProps(){
    document.documentElement.style.setProperty('--swh',(props.swatchH||66)+'px');[].forEach.call(document.querySelectorAll('.rail'),function(r){if(r._render)r._render();});
    document.documentElement.style.setProperty('--floorh',(props.floorH||120)+'px');
    var w=document.querySelector('.wrap');if(w)w.style.gridTemplateColumns=panelCols();
    activeKeys().forEach(function(k,i){var e=el(SIDEID[k]);if(e)e.style.order=i;});
    if(el('pad'))el('pad').style.display=(props.mats.tags!==false)?'':'none';
    showPanel('sideWorktop',props.mats.worktop!==false);showPanel('sideCarcass',props.mats.carcass!==false);showPanel('sideBoard',props.mats.wood!==false);showPanel('sideCeiling',props.mats.ceiling!==false);showPanel('sideSkirting',props.mats.skirting!==false);
    saveProps();
    if(window._clampNotes)_clampNotes();
    if(window.requestAnimationFrame)requestAnimationFrame(positionPanelButtons);else positionPanelButtons();
  }
  /* Flip a panel's ✕/☀ buttons to its LEFT edge when its right-edge buttons would sit under the centre Search tab. */
  function positionPanelButtons(){
    var stab=el('stab'); if(!stab)return; var sr=stab.getBoundingClientRect();
    Object.keys(SIDEID).forEach(function(k){
      var side=el(SIDEID[k]); if(!side)return;
      if(side.style.display==='none'){side.classList.remove('btn-left');return;}
      var r=side.getBoundingClientRect(), zoneL=r.right-94, zoneR=r.right+2;
      side.classList.toggle('btn-left',(zoneR>sr.left-6)&&(zoneL<sr.right+6));
    });
  }
  window.addEventListener('resize',positionPanelButtons);
  function slide(changed,val,keys){
    var maxV=100-(keys.length-1)*MINW;
    val=Math.max(MINW,Math.min(maxV,Math.round(val)));
    var others=keys.filter(function(k){return k!==changed;});
    var oldOther=0;others.forEach(function(k){oldOther+=props.panelW[k];});
    var rem=100-val;
    others.forEach(function(k){props.panelW[k]= oldOther>0 ? Math.max(MINW,rem*props.panelW[k]/oldOther) : rem/others.length;});
    props.panelW[changed]=val;
    normWidths(keys);
    applyProps();refreshWidthUI();
  }
  function refreshWidthUI(){[].forEach.call(el('pgrid').querySelectorAll('input[type=range]'),function(inp){var k=inp.getAttribute('data-pk');inp.value=props.panelW[k];var pv=inp.parentNode.querySelector('.pv');if(pv)pv.textContent=props.panelW[k]+'%';});}
  function buildGrid(){
    var box=el('pgrid');box.className='pw';box.innerHTML='';
    var keys=activeKeys();normWidths(keys);
    keys.forEach(function(k){
      var p=PANELS.filter(function(x){return x.k===k;})[0];
      var row=document.createElement('div');row.className='pwrow';
      row.innerHTML='<span class="pl">'+p.label+'</span><input type="range" min="'+MINW+'" max="94" step="1" value="'+props.panelW[k]+'" data-pk="'+k+'"><span class="pv">'+props.panelW[k]+'%</span>';
      box.appendChild(row);
    });
    [].forEach.call(box.querySelectorAll('input[type=range]'),function(inp){inp.oninput=function(){slide(inp.getAttribute('data-pk'),parseInt(inp.value)||MINW,keys);};});
    /* exactly one hint — clear any that piled up from earlier rebuilds, then add a single copy */
    [].forEach.call(box.parentNode.querySelectorAll('.pwhint'),function(n){n.remove();});
    var h=document.createElement('div');h.className='pwhint';h.textContent='Move one and the others adjust to fit — always totals 100%.';box.parentNode.appendChild(h);
  }
  function buildMat(){var box=el('matlist');box.innerHTML='';MATS.forEach(function(m){var row=document.createElement('div');row.className='mrow';
    var bh=m.brands.length?'<select class="mbrand" aria-label="Manufacturer">'+m.brands.map(function(b){return '<option>'+b+'</option>';}).join('')+'</select>':'';
    row.innerHTML='<span class="ml"><input type="checkbox" data-mat="'+m.k+'" '+(props.mats[m.k]?'checked':'')+'> '+m.label+'</span><div class="brands">'+bh+'</div>';box.appendChild(row);});
    /* Toggling a material LIVE: bring its panel on/off, re-share the widths, and rebuild the sliders. */
    [].forEach.call(box.querySelectorAll('[data-mat]'),function(c){c.onchange=function(){
      var k=c.getAttribute('data-mat'), on=c.checked; props.mats[k]=on;
      /* zone materials drive what renders inside the wall; panel materials show/hide their panel via applyProps */
      if(k==='ceiling'||k==='skirting'){}
      else if(k==='walls') zones.walls=on;
      else if(k==='floor'){ zones.floor=on; document.body.classList.toggle('hasfloor',on); if(el('floorbar'))el('floorbar').classList.toggle('on',on); if(on&&!floor&&FLOORS[floorType]&&FLOORS[floorType][0])floor=FLOORS[floorType][0]; if(typeof renderFloorRail==='function')renderFloorRail(); if(typeof syncSub==='function')syncSub(); }
      else if(k==='tags'){ if(el('pad'))el('pad').style.display=on?'':'none'; if(!on)[].forEach.call(document.querySelectorAll('.note.stuck'),function(n){n.remove();}); }
      normWidths(activeKeys()); applyProps(); buildGrid();
      if(el('sidePaint').classList.contains('chosen')) renderRoom();
    };});}
  function buildSwatchH(){var sh=el('swh');if(!sh)return;sh.value=props.swatchH||66;if(el('swhv'))el('swhv').textContent=(props.swatchH||66)+'px';
    sh.oninput=function(){props.swatchH=parseInt(sh.value)||66;if(el('swhv'))el('swhv').textContent=props.swatchH+'px';applyProps();};}
  function buildFloorH(){var fh=el('flh');if(!fh)return;fh.value=props.floorH||120;if(el('flhv'))el('flhv').textContent=(props.floorH||120)+'px';
    fh.oninput=function(){props.floorH=parseInt(fh.value)||120;if(el('flhv'))el('flhv').textContent=props.floorH+'px';applyProps();if(el('sidePaint').classList.contains('chosen'))renderRoom();};}
  el('cog').onclick=function(){buildGrid();buildMat();buildSwatchH();buildFloorH();el('modal').classList.add('on');};
  if(el('nameheart'))el('nameheart').onclick=function(){var on=document.body.classList.toggle('shownames');this.innerHTML=on?'<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11" aria-hidden="true"><path d="M12 20.3l-7.1-7A4.6 4.6 0 0 1 11.4 6l.6.6.6-.6a4.6 4.6 0 0 1 6.5 7.2z"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11" aria-hidden="true"><path d="M12 20.3l-7.1-7A4.6 4.6 0 0 1 11.4 6l.6.6.6-.6a4.6 4.6 0 0 1 6.5 7.2z"/></svg>';};
  el('mx').onclick=function(){el('modal').classList.remove('on');};
  if(el('mreset'))el('mreset').onclick=function(){if(!confirm('Clear the whole scheme and layout, and start fresh?'))return;window._noSave=true;try{localStorage.removeItem('sturij.studio.scheme');localStorage.removeItem('sturij.studio.props');}catch(e){}if(location.hash)history.replaceState(null,'',location.pathname);location.reload();};
  el('modal').addEventListener('click',function(e){if(e.target===el('modal'))el('modal').classList.remove('on');});
  el('msave').onclick=function(){
    /* panel widths are already live from the sliders (props.panelW); just read material + brand toggles */
    [].forEach.call(el('matlist').querySelectorAll('[data-mat]'),function(c){props.mats[c.getAttribute('data-mat')]=c.checked;});
    [].forEach.call(el('matlist').querySelectorAll('[data-brand]'),function(c){props.brands[c.getAttribute('data-brand')]=c.checked;});
    normWidths(activeKeys());
    applyProps();el('modal').classList.remove('on');toast('Properties saved');};
  /* ---- Drag-to-reorder panels: grip on each panel + a drop-target bar; order persists ---- */
  (function(){
    var wrap=document.querySelector('.wrap'); if(!wrap)return;
    var bar=document.createElement('div'); bar.className='dropbar'; document.body.appendChild(bar);
    function visSides(){ return activeKeys().map(function(k){var e=el(SIDEID[k]);return (e&&e.style.display!=='none')?{k:k,el:e}:null;}).filter(Boolean); }
    Object.keys(SIDEID).forEach(function(k){
      var side=el(SIDEID[k]); if(!side)return;
      var ROLE={ceiling:'Ceiling',wall:'Walls',skirting:'Skirting',worktop:'Worktop',carcass:'Carcass',boards:'Boards'};
      var grip=document.createElement('button'); grip.className='pgrip'; grip.type='button'; grip.title='Drag to reorder the '+(ROLE[k]||'panel').toLowerCase()+' panel'; grip.setAttribute('aria-label','Drag to reorder '+(ROLE[k]||'panel')); grip.innerHTML='<span>'+(ROLE[k]||'Panel')+'</span>'; side.appendChild(grip);
      var dragging=false, curIdx=-1, gsx=0, gsy=0, gmoved=false;
      function locate(x){
        var ss=visSides(); curIdx=ss.length;
        for(var i=0;i<ss.length;i++){var r=ss[i].el.getBoundingClientRect();if(x<r.left+r.width/2){curIdx=i;break;}}
        var bx; if(curIdx>=ss.length){var last=ss[ss.length-1].el.getBoundingClientRect();bx=last.right;} else {bx=ss[curIdx].el.getBoundingClientRect().left;}
        bar.style.left=bx+'px'; bar.classList.add('on');
      }
      grip.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();dragging=true;gsx=e.clientX;gsy=e.clientY;gmoved=false;side.classList.add('dragging');try{grip.setPointerCapture(e.pointerId);}catch(_){}locate(e.clientX);});
      grip.addEventListener('pointermove',function(e){if(!dragging)return;if(Math.abs(e.clientX-gsx)>6||Math.abs(e.clientY-gsy)>6)gmoved=true;locate(e.clientX);});
      grip.addEventListener('pointerup',function(e){if(!dragging)return;dragging=false;side.classList.remove('dragging');bar.classList.remove('on');var tf=window._tabDrawers&&window._tabDrawers[SIDEID[k]];if(!gmoved&&tf){tf();return;}drop();});
      grip.addEventListener('pointercancel',function(){dragging=false;side.classList.remove('dragging');bar.classList.remove('on');});
      function drop(){
        if(curIdx<0)return;
        var ss=visSides().map(function(s){return s.k;});
        var from=ss.indexOf(k); if(from<0)return;
        var to=curIdx>from?curIdx-1:curIdx;
        var vis=ss.slice(); vis.splice(from,1); to=Math.max(0,Math.min(vis.length,to)); vis.splice(to,0,k);
        var vi=0, newOrder=props.order.map(function(x){return ss.indexOf(x)>=0?vis[vi++]:x;});
        ['ceiling','wall','skirting','worktop','carcass','boards'].forEach(function(x){if(newOrder.indexOf(x)<0)newOrder.push(x);});
        props.order=newOrder; applyProps(); saveProps();
        if(el('sidePaint').classList.contains('chosen'))renderRoom();
      }
    });
  })();
  syncStudioFromProps();applyProps();
})();
/* ===== welcome / landing modal ===== */
(function(){var w=el('welcome');if(!w)return;
  try{if(localStorage.getItem('sturij.studio.welcomed')){w.style.display='none';w.classList.add('gone');}}catch(e){}
  function close(){try{localStorage.setItem('sturij.studio.welcomed','1');}catch(e){}w.classList.add('gone');setTimeout(function(){w.style.display='none';},450);}
  var go=el('welcomeGo'),x=el('welcomeX');
  if(go)go.onclick=close; if(x)x.onclick=close;
  w.addEventListener('click',function(e){if(e.target===w)close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!w.classList.contains('gone'))close();});
})();

/* ===================== scheme persistence + share URL ===================== */
var SKEY='sturij.studio.scheme';
function b64e(s){return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64d(s){try{return decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))));}catch(e){return null;}}
function collectPlaced(){
  var out={h:[],k:[],t:[],w:[],n:[]};
  [].forEach.call(document.querySelectorAll('.hplaced'),function(d){out.h.push({n:d.getAttribute('data-name'),x:parseFloat(d.style.left)||0,y:parseFloat(d.style.top)||0,w:d.offsetWidth});});
  [].forEach.call(document.querySelectorAll('.skplaced'),function(d){out.k.push({t:+d.getAttribute('data-ti')||0,f:+d.getAttribute('data-fi')||0,x:parseFloat(d.style.left)||0,y:parseFloat(d.style.top)||0,w:d.offsetWidth});});
  [].forEach.call(document.querySelectorAll('.tpplaced'),function(d){out.t.push({t:+d.getAttribute('data-ti')||0,f:+d.getAttribute('data-fi')||0,x:parseFloat(d.style.left)||0,y:parseFloat(d.style.top)||0,w:d.offsetWidth});});
  [].forEach.call(document.querySelectorAll('.woodcard'),function(d){out.w.push({n:d.getAttribute('data-name'),s:(d.querySelector('img')||{}).src?d.querySelector('img').src.split('/finishes/')[1].replace('.webp',''):'',x:parseFloat(d.style.left)||0,y:parseFloat(d.style.top)||0});});
  [].forEach.call(document.querySelectorAll('.note.stuck'),function(d){var nm=d.querySelector('.nm'),br=d.querySelector('.brand'),bd=d.querySelector('.body');
    var rm=(d.style.transform||'').match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
    var hostSide=d.parentElement&&d.parentElement.classList&&d.parentElement.classList.contains('side')?d.parentElement.id:null;
    var reg=(window._railNotes||[]).filter(function(n){return n.el===d;})[0];
    var freg=(window._floorNotes||[]).filter(function(n){return n.el===d;})[0];
    out.n.push({name:nm?nm.textContent:null,brand:br?br.textContent:null,text:bd?bd.textContent:'',x:parseFloat(d.style.left)||0,y:parseFloat(d.style.top)||0,r:rm?parseFloat(rm[1]):-4,host:hostSide,railId:reg?reg.rail.id:null,ri:reg?reg.idx:null,rdy:reg?reg.dy:null,fi:freg?freg.idx:null,ftp:freg?freg.type:null,fdx:freg?freg.dx:null});});
  return out;
}
window._clampNotes=function(){
  [].forEach.call(document.querySelectorAll('.side > .note.stuck'),function(n){
    var host=n.parentElement, w=host.clientWidth, h=host.clientHeight;
    var l=parseFloat(n.style.left)||0, t=parseFloat(n.style.top)||0;
    n.style.left=Math.max(4,Math.min(Math.max(4,w-158),l))+'px';
    n.style.top=Math.max(4,Math.min(Math.max(4,h-110),t))+'px';
  });
};
window.addEventListener('resize',function(){if(window._clampNotes)_clampNotes();});
function blurRot(){var b={},r={};['sidePaint','sideWorktop','sideCarcass','sideBoard'].forEach(function(id){var s=el(id);if(!s)return;if(s._blur)b[id]=s._blur;if(s._rot)r[id]=s._rot;});return {b:b,r:r};}
function snapshot(){
  var br=blurRot();
  return {v:1,co:ceilOn,so:skirtOn,zn:{c:zones.ceiling,s:zones.skirting,f:zones.floor,w:zones.walls},paints:paints,ceil:ceilCol,skirt:skirtCol,target:paintTarget,wallMode:wallMode,
    wp:wallPaper?{s:wallPaper.s,n:wallPaper.n,img:wallPaper.img}:null,
    selB:sel.board?{s:sel.board.s,n:sel.board.n}:null,
    selC:sel.carcass?{s:sel.carcass.s,n:sel.carcass.n}:null,
    selW:sel.worktop?{s:sel.worktop.s,n:sel.worktop.n,img:sel.worktop.img}:null,
    ft:floorType,fl:floor?{name:floor.name,url:floor.url,type:floor.type,avg:floor.avg}:null,
    faves:FAVES,list:items.map(function(i){return i.gen;}).filter(Boolean),
    placed:collectPlaced(),blur:br.b,rot:br.r};
}
var _saveT=null;
function saveScheme(){if(window._noSave)return;try{localStorage.setItem(SKEY,JSON.stringify(snapshot()));}catch(e){}}
function queueSave(){clearTimeout(_saveT);_saveT=setTimeout(saveScheme,700);}
function shareURL(){return location.origin+location.pathname+'#s='+b64e(JSON.stringify(snapshot()));}
function restoreScheme(){
  var S=null, fromHash=false;
  var hm=location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  if(hm){var d=b64d(hm[1]); if(d){try{S=JSON.parse(d);fromHash=true;}catch(e){}}}
  if(!S){try{S=JSON.parse(localStorage.getItem(SKEY)||'null');}catch(e){}}
  if(!S||S.v!==1)return;
  window._quiet=true;
  try{
    var zn=S.zn||{c:false,s:false,f:zones.floor,w:true};
    zones.ceiling=!!zn.c; zones.skirting=!!zn.s; zones.walls=zn.w!==false;
    if(zones.floor!==!!zn.f){zones.floor=!!zn.f;document.body.classList.toggle('hasfloor',zones.floor);if(el('floorbar'))el('floorbar').classList.toggle('on',zones.floor);}
    if(window._setZoneMats)_setZoneMats(zn);
    if(S.ceil&&S.ceil[0]==='Acid Drop')S.ceil=null; if(S.skirt&&S.skirt[0]==='Acid Drop')S.skirt=null;
    if(S.ceil)ceilCol=S.ceil; if(S.skirt)skirtCol=S.skirt;
    if(S.co&&S.ceil)fillSide('ceiling',S.ceil);
    if(S.so&&S.skirt)fillSide('skirting',S.skirt);
    if(S.wallMode==='wallpaper'&&S.wp){fillSide('wallpaper',S.wp);}
    else if(S.paints&&S.paints.length){paintTarget='wall';addPaint(S.paints[0]);}
    paintTarget=S.target||'wall';
    if(S.selW)fillSide('worktop',S.selW);
    if(S.selC)fillSide('carcass',S.selC);
    if(S.selB)fillSide('board',S.selB);
    if(S.ft)floorType=S.ft;
    if(S.fl){floor=S.fl;el('floorbar').classList.add('filled');var ex=el('fexp');if(ex){ex.style.backgroundImage="url('"+S.fl.url+"')";ex.querySelector('.fn').textContent=(S.fl.type==='hard'?'Egger':'Crucial Trading')+' · '+S.fl.name;}}
    renderFloorRail();
    if(S.faves&&S.faves.length){FAVES=S.faves.map(function(f){return f.k?f:{k:'board',key:f.s,n:f.n};});renderFaves();if(window._refreshRails)_refreshRails();}
    (S.list||[]).forEach(function(g){ if(!g)return; if(g.t==='paint')addSwatch('paint',g.it); else if(g.t==='tex')addSwatch(g.k,g.it); });
    var P=S.placed||{};
    (P.h||[]).forEach(function(o){if(window._placeHandle)_placeHandle(o);});
    (P.k||[]).forEach(function(o){if(window._placeSocket)_placeSocket(o);});
    (P.t||[]).forEach(function(o){if(window._placeTap)_placeTap(o);});
    (P.w||[]).forEach(function(o){if(o.s)placeWood({s:o.s,n:o.n},o.x+61,o.y+47);});
    (P.n||[]).forEach(function(o){if(window._restoreNote)_restoreNote(o);});
    Object.keys(S.blur||{}).forEach(function(id){var s=el(id);if(s)applyBlur(s,S.blur[id]);});
    Object.keys(S.rot||{}).forEach(function(id){var s=el(id);if(!s)return;var fe=s.querySelector('.filled');if(!fe)return;s._rot=S.rot[id];
      var r=fe.getBoundingClientRect(),sc=(S.rot[id]===90||S.rot[id]===270)?Math.max(r.width/r.height||1,r.height/r.width||1):1;
      fe.style.setProperty('--rot',S.rot[id]+'deg');fe.style.setProperty('--rotsc',sc.toFixed(3));});
    selectedSide=null;renderCbar();
    if(el('sidePaint').classList.contains('chosen'))renderRoom();
    setTimeout(function(){[].forEach.call(document.querySelectorAll('.rail'),function(r2){if(r2._render)r2._render();});},80);
  }catch(e){}
  window._quiet=false;
  var hb=document.createElement('span'); hb.className='rbar';
  hb.innerHTML='<span class="rlabel">'+(fromHash?'Shared scheme loaded':'Scheme restored')+'</span><button class="hbtn" id="tfresh" type="button">Start fresh</button>';
  var hctl=el('hctl'); if(hctl&&hctl.parentNode)hctl.parentNode.insertBefore(hb,hctl); else document.body.appendChild(hb);
  el('tfresh').onclick=function(){window._noSave=true;clearTimeout(_saveT);try{localStorage.removeItem(SKEY);}catch(e){}if(location.hash)history.replaceState(null,'',location.pathname);location.reload();};
  setTimeout(function(){hb.remove();},12000);
}
document.addEventListener('pointerup',queueSave);
document.addEventListener('change',queueSave);
document.addEventListener('keyup',queueSave);
window.addEventListener('beforeunload',saveScheme);
if(el('share'))el('share').onclick=function(){
  var u=shareURL();
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(u):Promise.reject()).then(
    function(){toast('Scheme link copied');},
    function(){prompt('Copy your scheme link',u);});
};
if(el('best'))el('best').onclick=function(){
  var u=location.origin+'/estimator#s='+b64e(JSON.stringify(snapshot()));
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(u):Promise.reject()).then(
    function(){toast('Estimator link copied — estimator launches soon');},
    function(){prompt('Estimator link (estimator launches soon)',u);});
};

/* ===================== snip: drag a region, save it to the shortlist ===================== */
function composeScene(cb){
  var area=el('hlayer').getBoundingClientRect();
  var cv=document.createElement('canvas');cv.width=Math.round(area.width);cv.height=Math.round(area.height);
  var x=cv.getContext('2d');x.fillStyle='#EFE9DD';x.fillRect(0,0,cv.width,cv.height);
  var jobs=[];
  function rectOf(e){var r=e.getBoundingClientRect();return {l:r.left-area.left,t:r.top-area.top,w:r.width,h:r.height};}
  function addBg(e){
    var cs=getComputedStyle(e), r=rectOf(e);
    if(r.w<2||r.h<2)return;
    var bi=cs.backgroundImage;
    if(bi&&bi!=='none'){var um=bi.match(/url\("?([^")]+)"?\)/);if(um){jobs.push({img:um[1],r:r});return;}}
    var bc=cs.backgroundColor;
    if(bc&&bc!=='rgba(0, 0, 0, 0)')jobs.push({fill:bc,r:r});
  }
  [].forEach.call(document.querySelectorAll('.side'),function(s){
    if(s.style.display==='none')return;
    var r=rectOf(s);jobs.push({fill:'#EFE9DD',r:r});
    if(s.classList.contains('chosen')){
      [].forEach.call(s.querySelectorAll('.filled, .rceil, .rwall, .rskirt, .rfloor'),addBg);
    } else {
      [].forEach.call(s.querySelectorAll('.strip'),addBg);
    }
  });
  var fb=el('floorbar');
  if(fb&&fb.classList.contains('on')){
    if(fb.classList.contains('filled'))addBg(el('fexp'));
    else [].forEach.call(fb.querySelectorAll('.ftile'),addBg);
  }
  [].forEach.call(document.querySelectorAll('.woodcard'),function(d){var r=rectOf(d);jobs.push({fill:'#ffffff',r:r});var im=d.querySelector('img');if(im)jobs.push({img:im.src,r:rectOf(im)});});
  [].forEach.call(document.querySelectorAll('.hplaced img'),function(im){jobs.push({img:im.src,r:rectOf(im),contain:true});});
  [].forEach.call(document.querySelectorAll('.skplaced svg, .tpplaced svg'),function(sv){
    var d='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(sv));
    jobs.push({img:d,r:rectOf(sv),contain:true});});
  [].forEach.call(document.querySelectorAll('.note.stuck'),function(n){var r=rectOf(n);jobs.push({fill:'#f5ecd6',r:r,note:n});});
  var loads=jobs.filter(function(j){return j.img;}).map(function(j){
    return new Promise(function(res){var im=new Image();j._im=im;im.onload=function(){res();};im.onerror=function(){j._im=null;res();};
      setTimeout(res,3000);im.src=j.img;});
  });
  Promise.all(loads).then(function(){
    jobs.forEach(function(j){
      var r=j.r;
      if(j.fill){x.fillStyle=j.fill;x.fillRect(r.l,r.t,r.w,r.h);}
      if(j.img&&j._im&&j._im.width){
        var im=j._im;
        if(j.contain){var sc=Math.min(r.w/im.width,r.h/im.height);x.drawImage(im,r.l+(r.w-im.width*sc)/2,r.t+(r.h-im.height*sc)/2,im.width*sc,im.height*sc);}
        else{var sc2=Math.max(r.w/im.width,r.h/im.height);x.save();x.beginPath();x.rect(r.l,r.t,r.w,r.h);x.clip();x.drawImage(im,r.l+(r.w-im.width*sc2)/2,r.t+(r.h-im.height*sc2)/2,im.width*sc2,im.height*sc2);x.restore();}
      }
      if(j.note){x.fillStyle='#4a453c';x.font='500 11px "IBM Plex Mono",monospace';
        var nm=j.note.querySelector('.nm'),bd=j.note.querySelector('.body');
        var ty=r.t+24;
        if(nm){x.fillText(nm.textContent.slice(0,22),r.l+12,ty);ty+=16;}
        if(bd&&bd.textContent)x.fillText(bd.textContent.slice(0,24),r.l+12,ty);}
    });
    cb(cv);
  });
}
function startSnip(){
  if(el('snipov'))return;
  var ov=document.createElement('div');ov.id='snipov';
  ov.innerHTML='<div class="sniphint">Drag to snip a region · Esc to cancel</div><div class="snipbox" hidden></div>';
  document.body.appendChild(ov);
  var box=ov.querySelector('.snipbox'),sx=0,sy=0,r=null;
  function stop(){ov.remove();document.removeEventListener('keydown',esc);}
  function esc(e){if(e.key==='Escape')stop();}
  document.addEventListener('keydown',esc);
  ov.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;box.hidden=false;ov.setPointerCapture(e.pointerId);});
  ov.addEventListener('pointermove',function(e){if(box.hidden)return;
    r={l:Math.min(sx,e.clientX),t:Math.min(sy,e.clientY),w:Math.abs(e.clientX-sx),h:Math.abs(e.clientY-sy)};
    box.style.left=r.l+'px';box.style.top=r.t+'px';box.style.width=r.w+'px';box.style.height=r.h+'px';});
  ov.addEventListener('pointerup',function(){
    if(!r||r.w<12||r.h<12){stop();return;}
    var area=el('hlayer').getBoundingClientRect(),rr=r;stop();
    composeScene(function(cv){
      var c2=document.createElement('canvas');
      var cl=Math.max(0,rr.l-area.left),ct=Math.max(0,rr.t-area.top);
      var cw=Math.min(rr.w,cv.width-cl),ch=Math.min(rr.h,cv.height-ct);
      if(cw<4||ch<4)return;
      c2.width=cw;c2.height=ch;
      c2.getContext('2d').drawImage(cv,cl,ct,cw,ch,0,0,cw,ch);
      items.push({name:'Your swatch',file:'your-swatch-'+Date.now()+'.png',sub:'snip',swatchCss:'background:#EFE9DD',png:c2.toDataURL('image/png')});
      renderTray();toast('Your swatch added to the shortlist');
    });
  });
}

/* ===================== talk: one-shot voice commands ===================== */
function talkOnce(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Voice is not supported in this browser');return;}
  var b=el('talk'); if(b&&b.classList.contains('rec'))return;
  var rec=new SR();rec.lang='en-GB';rec.interimResults=false;
  if(b)b.classList.add('rec');
  rec.onresult=function(ev){runCommand(ev.results[0][0].transcript);};
  rec.onerror=function(){if(b)b.classList.remove('rec');};
  rec.onend=function(){if(b)b.classList.remove('rec');};
  try{rec.start();toast('Listening…');}catch(e){if(b)b.classList.remove('rec');}
}
function runCommand(t){
  var q=(t||'').toLowerCase().trim(); if(!q)return;
  function open(id,on){var d=el(id);if(d)d.classList.toggle('on',on);}
  if(/\b(open|show)\b.*\bhandle/.test(q)){open('hdraw',true);toast('Handles');return;}
  if(/\b(open|show)\b.*\b(electric|socket|switch)/.test(q)){open('skdraw',true);toast('Electrical');return;}
  if(/\b(open|show)\b.*\btap/.test(q)){open('tpdraw',true);toast('Taps');return;}
  if(/\b(open|show)\b.*\b(search|find)/.test(q)){open('sdraw',true);var i=el('sq');if(i)i.focus();return;}
  if(/\b(open|show)\b.*\btool/.test(q)){el('cog').click();return;}
  if(/\b(close|hide)\b/.test(q)){['hdraw','skdraw','tpdraw','sdraw'].forEach(function(id){open(id,false);});el('modal').classList.remove('on');toast('Closed');return;}
  if(/\bsnip\b/.test(q)){startSnip();return;}
  if(/\brotate\b/.test(q)){if(sideRotatable(selectedSide)){rotateSide(selectedSide);toast('Rotated');}else toast('Select a board, carcass or worktop first');return;}
  var cm=q.match(/\b(clear|remove)\b.*\b(wall|worktop|carcass|board)/);
  if(cm){var map={wall:'sidePaint',worktop:'sideWorktop',carcass:'sideCarcass',board:'sideBoard'};clearPanel(el(map[cm[2]]));toast('Cleared · '+cm[2]);return;}
  if(/\b(shortlist|download|zip)\b/.test(q)&&/\b(open|download)\b/.test(q)){el('bzip').click();return;}
  /* fallback: treat it as a material search and apply the best match */
  if(window._searchApply&&_searchApply(q))return;
  open('sdraw',true);var si=el('sq');if(si){si.value=t;var go=el('sgo');if(go)go.click();}
}

/* ===================== boot ===================== */
Promise.all(_ready).then(function(){
  if(FB.length){ ceilCol=ceilCol||neutralPaint(); skirtCol=skirtCol||neutralPaint();
    rail(el('sidePaint'), el('railPaint'), 'paint', FB, true);
    rail(el('sideCeiling'), el('railCeiling'), 'ceiling', FB, true);
    rail(el('sideSkirting'), el('railSkirting'), 'skirting', FB, true); }
  if(BOARDS.length){
    rail(el('sideCarcass'), el('railCarcass'), 'carcass', BOARDS, false);
    rail(el('sideBoard'), el('railBoard'), 'board', BOARDS, false); }
  restoreScheme();
});

/* ===== Tab drawers: consistent multi-select colour-bar filters on every panel tab ===== */
(function(){
  function hsl(hex){var n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
    var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn,h=0,s=0;
    if(d){s=d/(1-Math.abs(2*l-1));
      if(mx===r)h=60*(((g-b)/d)%6); else if(mx===g)h=60*((b-r)/d+2); else h=60*((r-g)/d+4);
      if(h<0)h+=360;}
    return {h:h,s:s,l:l};
  }
  function paintGrp(p){var c=hsl(p[1]),h=c.h,s=c.s,l=c.l;
    if(l>=.85&&s<=.30)return 'Whites';
    if(s<=.10)return l<.28?'Blacks':'Greys';
    if(l<.20)return 'Blacks';
    if(h<15||h>=330)return 'Reds & Pinks';
    if(h<50)return l<.45?'Browns':(s<.35?'Neutrals':'Yellows');
    if(h<70)return s<.28?'Neutrals':'Yellows';
    if(h<170)return 'Greens';
    if(h<260)return 'Blues';
    return 'Purples';
  }
  var PAINT_FAMS=[['Whites','#f6f6f2'],['Neutrals','#d1c19f'],['Yellows','#e8c266'],['Greens','#75866c'],['Blues','#6a8fb2'],['Reds & Pinks','#b0504b'],['Purples','#8d838c'],['Browns','#6f4a2b'],['Greys','#9a9a9a'],['Blacks','#2b2b2b']];
  function eggerGroup(b){var s=(b.s+' '+b.n).toLowerCase();
    if(/metal/.test(s))return 'Metallics';
    if(/granite|marble|calcit|travertine|stone/.test(s))return 'Stone & Mineral';
    if(/walnut|oak|chestnut|acacia|wood|bookmatch|rovato|casella|dimaro|bolivar/.test(s))return 'Woodgrains';
    return 'Uni colours';
  }
  var FIN_GROUPS=[['Woodgrains','#6f4a2b'],['Stone & Mineral','#8d9094'],['Metallics','#b9974f'],['Uni colours','#5f7356']];
  function worktopTone(w){var s=(w.n+' '+w.s).toLowerCase();
    if(/gold|oro|ora|tigris|dorado|roma|miami|traviso|arabasco/.test(s))return 'Golds';
    if(/black|porto/.test(s))return 'Darks';
    if(/bianco|carrara|calacatta|ice|quartz|staturio|staurio|avelanche|fugen|westminister|arabescato/.test(s))return 'Whites';
    if(/taj|taupe|afyonne|travertine|messina|nevada|patagonia|petagonia|palmero/.test(s))return 'Warm neutrals';
    return 'Stone greys';
  }
  var TONES=[['Whites','#f2f1ee'],['Warm neutrals','#d9c9b2'],['Golds','#c9a35c'],['Stone greys','#9a9a99'],['Darks','#2e2b28']];
  var BANDS=BAND_ORDER.map(function(b){return [b,BAND_COLOURS[b]];});
  /* one drawer per tab; rows of colour bars; empty selection = show all */
  function makeDrawer(sideId, cfg){
    var side=el(sideId); if(!side)return;
    var wrap=document.createElement('div'); wrap.className='pfdraw'; document.body.appendChild(wrap);
    var sel={};
    function selected(rowId){return sel[rowId]||(sel[rowId]={});}
    function syncH(){side.style.setProperty('--pfh',(side.classList.contains('pfopen')?(wrap.offsetHeight||48):0)+'px');}
    function render(){
      wrap.innerHTML='';
      cfg.rows.forEach(function(row){
        if(row.visible&&!row.visible(sel))return;
        var opts=row.options();
        if(row.mode){
          var rd=document.createElement('div'); rd.className='pfrow';
          opts.forEach(function(o){
            var b=document.createElement('button'); b.type='button'; b.className='pfseg'+(selected(row.id)[o[0]]?' on':'');
            b.textContent=o[0];
            b.onclick=function(e){e.stopPropagation();sel[row.id]={};sel[row.id][o[0]]=true;render();cfg.apply(sel);syncH();};
            rd.appendChild(b);
          });
          wrap.appendChild(rd); return;
        }
        var n=Object.keys(selected(row.id)).length;
        var dd=document.createElement('div'); dd.className='pfdd'+(row._open?' open':'');
        var hd=document.createElement('button'); hd.type='button'; hd.className='pfddh';
        hd.innerHTML='<span>'+(row.label||'Filter')+(n?' · '+n:'')+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
        hd.onclick=function(e){e.stopPropagation();row._open=!row._open;render();syncH();};
        var body=document.createElement('div'); body.className='pfddb';
        opts.forEach(function(o){
          var b=document.createElement('button'); b.type='button'; b.className='pfbar'+(selected(row.id)[o[0]]?' on':'');
          b.title=o[0]; b.setAttribute('aria-label',o[0]); b.style.background=o[1];
          b.onclick=function(e){e.stopPropagation();var s2=selected(row.id);if(s2[o[0]])delete s2[o[0]];else s2[o[0]]=true;render();cfg.apply(sel);syncH();};
          body.appendChild(b);
        });
        dd.appendChild(hd); dd.appendChild(body); wrap.appendChild(dd);
      });
      syncH();
    }
    function place(){
      var r=side.getBoundingClientRect(), w=wrap.offsetWidth||280;
      var x=Math.max(10+w/2, Math.min(window.innerWidth-10-w/2, r.left+r.width/2));
      wrap.style.left=x+'px';
      wrap.style.top=(document.querySelector('.wrap').getBoundingClientRect().top)+'px';
    }
    window._tabDrawers=window._tabDrawers||{};
    window._tabDrawers[sideId]=function(){
      var on=!side.classList.contains('pfopen');
      if(on){render();place();}
      side.classList.toggle('pfopen',on);
      wrap.classList.toggle('open',on);
      requestAnimationFrame(syncH);
    };
    window.addEventListener('resize',function(){if(side.classList.contains('pfopen'))place();});
    document.addEventListener('pointerdown',function(e){
      if(side.classList.contains('pfopen')&&!e.target.closest('.pfdraw')&&!e.target.closest('.pgrip')){side.classList.remove('pfopen');wrap.classList.remove('open');side.style.setProperty('--pfh','0px');}
    });
  }
  function keys(o){return Object.keys(o||{});}
  function paintApply(railId){return function(sel){
    var ks=keys(sel.fam); var rl=el(railId); if(!rl||!rl._build)return;
    rl._build(!ks.length?FB:FB.filter(function(p){return ks.indexOf(paintGrp(p))>=0;}));
  };}
  var famRow={id:'fam',label:'Colour',options:function(){return PAINT_FAMS.filter(function(g){return FB.some(function(p){return paintGrp(p)===g[0];});});}};
  makeDrawer('sideCeiling',{rows:[famRow],apply:paintApply('railCeiling')});
  makeDrawer('sideSkirting',{rows:[famRow],apply:paintApply('railSkirting')});
  makeDrawer('sidePaint',{rows:[
    {id:'mode',mode:true,options:function(){return [['Paint'],['Wallpaper']];}},
    {id:'fam',label:'Colour',visible:function(){return wallMode==='paint';},options:famRow.options}
  ],apply:function(sel){
    var m=keys(sel.mode)[0];
    if(m&&((m==='Wallpaper')!==(wallMode==='wallpaper'))){
      var seg=el('wallseg'); if(seg){var btn=seg.querySelector('button[data-w="'+(m==='Wallpaper'?'wallpaper':'paint')+'"]'); if(btn)btn.click();}
    }
    paintApply('railPaint')(sel);
  }});
  function boardApply(railId){return function(sel){
    var fin=keys(sel.fin), band=keys(sel.band), rl=el(railId); if(!rl||!rl._build)return;
    rl._build(BOARDS.filter(function(b){
      var g=eggerGroup(b);
      if(fin.length&&fin.indexOf(g)<0)return false;
      if(band.length&&g==='Uni colours'&&band.indexOf(boardBand(b))<0)return false;
      return true;
    }));
  };}
  var boardRows=[
    {id:'fin',label:'Style',options:function(){return FIN_GROUPS.filter(function(g){return BOARDS.some(function(b){return eggerGroup(b)===g[0];});});}},
    {id:'band',label:'Colour',visible:function(sel){return !!(sel.fin&&sel.fin['Uni colours']);},options:function(){
      var seen={}; BOARDS.forEach(function(b){if(eggerGroup(b)==='Uni colours')seen[boardBand(b)]=1;});
      return BANDS.filter(function(x){return seen[x[0]];});}}
  ];
  makeDrawer('sideBoard',{rows:boardRows,apply:boardApply('railBoard')});
  makeDrawer('sideCarcass',{rows:boardRows,apply:boardApply('railCarcass')});
  makeDrawer('sideWorktop',{rows:[
    {id:'tone',label:'Tone',options:function(){return TONES.filter(function(t){return (window.WORKTOPS||[]).some(function(w){return worktopTone(w)===t[0];});});}}
  ],apply:function(sel){
    var ks=keys(sel.tone), rl=el('railWorktop'); if(!rl||!rl._build)return;
    rl._build(!ks.length?WORKTOPS:WORKTOPS.filter(function(w){return ks.indexOf(worktopTone(w))>=0;}));
  }});
  window._togglePaintFilter=window._tabDrawers&&window._tabDrawers.sidePaint;
})();


/* ===== favourite the enlarged sample: frosted heart tab on chosen panels ===== */
(function(){
  var HEART='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="14" height="14" aria-hidden="true"><path d="M12 20.3l-7.1-7A4.6 4.6 0 0 1 11.4 6l.6.6.6-.6a4.6 4.6 0 0 1 6.5 7.2z"/></svg>';
  function current(id){
    if(id==='sidePaint')return (wallMode==='wallpaper'&&wallPaper)?['wallpaper',wallPaper]:(paints[0]?['paint',paints[0]]:null);
    if(id==='sideCeiling')return ceilOn&&ceilCol?['paint',ceilCol]:null;
    if(id==='sideSkirting')return skirtOn&&skirtCol?['paint',skirtCol]:null;
    if(id==='sideWorktop')return sel.worktop?['worktop',sel.worktop]:null;
    if(id==='sideCarcass')return sel.carcass?['carcass',sel.carcass]:null;
    if(id==='sideBoard')return sel.board?['board',sel.board]:null;
    return null;
  }
  ['sideCeiling','sidePaint','sideSkirting','sideWorktop','sideCarcass','sideBoard'].forEach(function(id){
    var side=el(id); if(!side)return;
    var b=document.createElement('button'); b.type='button'; b.className='pfav'; b.title='Save to favourites'; b.setAttribute('aria-label','Save to favourites');
    b.innerHTML=HEART;
    b.addEventListener('pointerdown',function(e){e.stopPropagation();});
    b.addEventListener('click',function(e){e.stopPropagation();
      var c=current(id); if(!c){toast('Nothing to favourite yet');return;}
      favFromRail(c[0],c[1]);
    });
    side.appendChild(b);
  });
})();

/* ===== Tools modal: accordions, frosted layers, wallpaper toggle removed (lives on the Walls tab) ===== */
(function(){
  var mc=document.querySelector('.mcard'); if(!mc)return;
  var seg=el('wallseg'); if(seg){var row=seg.closest('.orow'); if(row)row.style.display='none';}
  [].forEach.call(mc.querySelectorAll('.msec'),function(sec){
    var h=sec.querySelector('h4'); if(!h)return;
    sec.classList.add('acc');
    h.innerHTML+='<svg class="acv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    h.setAttribute('role','button'); h.setAttribute('tabindex','0');
    function tg(){sec.classList.toggle('open');}
    h.addEventListener('click',tg);
    h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();tg();}});
  });
})();

/* ===================== Visualise: hand the scheme to the visualiser's Nano Banana endpoint =====================
   Contract: sturij-visualiser/api/render.js — POST {base, prompt, requestId, swatches[<=14], scenario}.
   The studio's origin must be whitelisted in RENDER_ALLOWED_ORIGINS on the sturij Vercel project. */
var RENDER_ENDPOINT='https://sturij.vercel.app/api/render';
function swatchRef(label,hexOrUrl,isHex,cb){
  var cv=document.createElement('canvas');cv.width=640;cv.height=640;var x=cv.getContext('2d');
  if(isHex){x.fillStyle=hexOrUrl;x.fillRect(0,0,640,640);cb({label:label,image:cv.toDataURL('image/jpeg',0.9)});}
  else{var im=new Image();im.onload=function(){var sc=Math.max(640/im.width,640/im.height);x.drawImage(im,(640-im.width*sc)/2,(640-im.height*sc)/2,im.width*sc,im.height*sc);cb({label:label,image:cv.toDataURL('image/jpeg',0.9)});};
    im.onerror=function(){cb(null);};im.src=hexOrUrl;}
}
function buildRenderRefs(cb){
  var defs=[];
  if(wallMode==='wallpaper'&&wallPaper)defs.push(['Walls — Farrow & Ball wallpaper "'+wallPaper.n+'"',wallPaper.img,false]);
  else if(paints[0])defs.push(['Walls — Farrow & Ball paint "'+paints[0][0]+'" '+paints[0][1],paints[0][1],true]);
  if(ceilOn&&ceilCol)defs.push(['Ceiling — Farrow & Ball paint "'+ceilCol[0]+'" '+ceilCol[1],ceilCol[1],true]);
  if(skirtOn&&skirtCol)defs.push(['Skirting — Farrow & Ball paint "'+skirtCol[0]+'" '+skirtCol[1],skirtCol[1],true]);
  if(sel.board)defs.push(['Every furniture door front, drawer front and end panel — Egger decor "'+sel.board.n+'" — reproduce this swatch\'s visible texture, pattern and grain on the fronts, not a plain colour','showcase/finishes/'+sel.board.s+'.webp',false]);
  if(sel.carcass)defs.push(['Furniture carcass interior — Egger decor "'+sel.carcass.n+'"','showcase/finishes/'+sel.carcass.s+'.webp',false]);
  if(sel.worktop)defs.push(['Worktop — Omega Stone "'+sel.worktop.n+'"',sel.worktop.img,false]);
  if(floor&&el('floorbar').classList.contains('filled'))defs.push(['Floor — '+(floor.type==='hard'?'Egger flooring':'Crucial Trading carpet')+' "'+floor.name+'"',floor.url,false]);
  var out=[];
  function next(){ if(!defs.length){cb(out.slice(0,14));return;}
    var d=defs.shift(); swatchRef(d[0],d[1],d[2],function(r){if(r)out.push(r);next();}); }
  next();
}
var ROOM_TYPES=['Kitchen','Bedroom','Living room','Home office','Boot room','Utility room','Dressing room','Media room'];
var visRoom=localStorage.getItem('sturij-vis-room')||'Kitchen';
(function(){
  var m=el('vismenu'); if(!m)return;
  m.innerHTML=ROOM_TYPES.map(function(r){return '<button type="button" role="menuitem" data-room="'+r+'">'+r+'</button>';}).join('');
  m.addEventListener('click',function(e){
    var b=e.target.closest('button[data-room]'); if(!b)return;
    visRoom=b.getAttribute('data-room'); localStorage.setItem('sturij-vis-room',visRoom);
    m.classList.remove('on'); runVisualise();
  });
  document.addEventListener('pointerdown',function(e){ if(!m.contains(e.target)&&!el('vis').contains(e.target)) m.classList.remove('on'); });
})();
el('vis').onclick=function(){ var m=el('vismenu'); m?m.classList.toggle('on'):runVisualise(); };
function runVisualise(){
  var b=el('vis'); if(b.classList.contains('rec'))return;
  if(!paints[0]&&!sel.board){toast('Choose at least a wall colour or a board first');return;}
  b.classList.add('rec');toast('Rendering a '+visRoom.toLowerCase()+'…');
  buildRenderRefs(function(refs){
    composeScene(function(cv){
      var base=cv.toDataURL('image/jpeg',0.85);
      /* Sectioned, fact-led prompt (Sturij Prompt Studio): facts the model can honour, no prose */
      var prompt='CONTEXT\n'
        +'Create one photorealistic photograph of a single furnished '+visRoom.toLowerCase()+'. The attached image is a flat material pairing board — the palette record only, not a room.\n\n'
        +'MATERIAL FACTS (STRICT)\n'
        +refs.map(function(r){return '- '+r.label;}).join('\n')+'\n'
        +'- Fitted joinery: made by Sturij.\n\n'
        +'INSTRUCTIONAL LOGIC\n'
        +'Apply each labelled reference swatch to its named surface, matched exactly. The furniture fronts are the most important surface: they must visibly carry the listed decor\'s texture, not read as plain painted doors.\n\n'
        +'STYLE & FINISH (VISUAL FIDELITY)\n'
        +'Natural daylight. True material sheen: matt emulsion paint, oiled timber, honed stone.\n\n'
        +'NEGATIVE CONSTRAINTS\n'
        +'No swatch board or grid in the scene. No text or labels. Only the listed materials. Do not simplify a textured decor into a flat colour.';
      fetch(RENDER_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({base:base,prompt:prompt,requestId:'studio-'+Date.now(),swatches:refs,scenario:'pairing-studio'})})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(res){
        b.classList.remove('rec');
        var img=res.j&&res.j.outputs&&res.j.outputs[0]&&res.j.outputs[0].image;
        if(!res.ok||!img){toast('Render failed'+(res.j&&res.j.error?' — '+res.j.error:res.j&&res.j.failures&&res.j.failures[0]?' — '+res.j.failures[0].error:''));return;}
        items.push({name:visRoom+' render',file:visRoom.toLowerCase().replace(/\s+/g,'-')+'-render-'+Date.now()+'.jpg',sub:'photo',swatchCss:'background:#EFE9DD',png:img});
        renderTray();toast(visRoom+' render added to your scheme');
      })
      .catch(function(e){b.classList.remove('rec');toast('Render failed — is this origin whitelisted on the visualiser?');});
    });
  });
};

