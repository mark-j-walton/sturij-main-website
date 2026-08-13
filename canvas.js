/* Sturij Canvas — endless composable whiteboard. State: sturij.canvas.board */
(function(){
'use strict';
var el=function(id){return document.getElementById(id);};
var world=el('world'),plane=el('plane');
var KEY='sturij.canvas.board';
var view={x:60,y:40,z:1};
var items=[]; // {id,type:'img'|'swatch'|'note',x,y,w,h,src?,hex?,name?,text?,z}
var zTop=1;

function toast(m){var t=el('toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('on');},2200);}
function save(){try{localStorage.setItem(KEY,JSON.stringify({v:1,view:view,items:items}));}catch(e){toast('Board too big to save — remove a photo');}}
var _sv=null;function qsave(){clearTimeout(_sv);_sv=setTimeout(save,500);}
function applyView(){plane.style.transform='translate('+view.x+'px,'+view.y+'px) scale('+view.z+')';}

/* ---------- items ---------- */
function render(it){
  var d=document.createElement('div');d.className='citem '+(it.type==='note'?'bnote':it.type);d.dataset.id=it.id;
  d.style.cssText='left:'+it.x+'px;top:'+it.y+'px;width:'+it.w+'px;height:'+it.h+'px;z-index:'+(it.z||1);
  if(it.type==='plan')d.innerHTML='<div class="inner planface">'+planSVG(it)+'</div><div class="pbar"><button class="pbtn" data-kind="door">Door</button><button class="pbtn" data-kind="window">Window</button></div>';
  else if(it.type==='wall')d.innerHTML='<div class="inner wallface" style="background:'+(it.hex||'#F0EDE8')+'"><span class="wn">'+(it.name||'Wall')+'</span></div>';
  else if(it.type==='img')d.innerHTML='<div class="inner"><img src="'+it.src+'" alt=""></div>';
  else if(it.type==='swatch')d.innerHTML='<div class="inner"><div class="fill" style="'+(it.hex?'background:'+it.hex:"background-image:url('"+it.src+"')")+'"></div><div class="cn">'+(it.name||'')+'</div></div>';
  else d.innerHTML='<div class="inner"><div class="body" contenteditable="true"></div></div>';
  d.innerHTML+='<button class="cx" title="Remove" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="11" height="11"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="rs" title="Resize"></span>';
  if(it.type==='note'){var b=d.querySelector('.body');b.textContent=it.text||'';
    b.addEventListener('pointerdown',function(e){e.stopPropagation();});
    b.addEventListener('input',function(){it.text=b.textContent;qsave();});}
  d.querySelector('.cx').addEventListener('click',function(e){e.stopPropagation();items=items.filter(function(q){return q!==it;});d.remove();qsave();});
  /* drag */
  d.addEventListener('pointerdown',function(e){
    if(e.target.closest('.cx'))return;
    e.stopPropagation();
    document.querySelectorAll('.citem.sel').forEach(function(n){n.classList.remove('sel');});
    d.classList.add('sel');
    if(it.type==='plan'){
      x.fillStyle='#FFFFFF';x.fillRect(ix,iy,it.w,it.h);
      pend++;
      (function(){var im=new Image();
        im.onload=function(){x.drawImage(im,ix,iy,it.w,it.h);pend--;done();};
        im.onerror=function(){pend--;done();};
        im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(planSVG(it).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.round(it.w)+'" height="'+Math.round(it.h)+'" '));})();
    }
    else if(it.type==='wall'){it.z=(window._wTop=(window._wTop||-9000)+1);d.style.zIndex=it.z;}
    else{it.z=++zTop;d.style.zIndex=zTop;}
    var rs=e.target.closest('.rs');
    var sx=e.clientX,sy=e.clientY,ox=it.x,oy=it.y,ow=it.w,oh=it.h,moved=false;
    try{d.setPointerCapture(e.pointerId);}catch(_){}
    function mv(ev){
      var dx=(ev.clientX-sx)/view.z,dy=(ev.clientY-sy)/view.z;
      if(Math.abs(dx)>2||Math.abs(dy)>2)moved=true;
      if(rs){it.w=Math.max(70,ow+dx);it.h=Math.max(54,oh+dy);d.style.width=it.w+'px';d.style.height=it.h+'px';if(it.type==='plan')d.querySelector('.planface').innerHTML=planSVG(it);}
      else{it.x=ox+dx;it.y=oy+dy;d.style.left=it.x+'px';d.style.top=it.y+'px';}
    }
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);if(moved)qsave();}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
    e.preventDefault();
  });
  if(it.type==='plan')wirePlan(d,it);
  plane.appendChild(d);
  return d;
}
function add(it){it.id=it.id||('c'+Date.now()+Math.random().toString(36).slice(2,6));it.z=(it.type==='wall')?(window._wTop=(window._wTop||-9000)+1):++zTop;items.push(it);render(it);qsave();return it;}
function centre(){var r=world.getBoundingClientRect();return {x:(r.width/2-view.x)/view.z,y:(r.height/2-view.y)/view.z};}

/* ---------- pan & zoom ---------- */
world.addEventListener('pointerdown',function(e){
  if(drawMode){
    e.stopPropagation();e.preventDefault();
    var p=drawPt(e);
    if(drawVerts.length>=3){var f=drawVerts[0];if(Math.hypot(p[0]-f[0],p[1]-f[1])<220){endDraw(true);return;}}
    drawVerts.push(p);renderDraw(p);return;
  }
  if(e.target.closest('.citem'))return;
  document.querySelectorAll('.citem.sel').forEach(function(n){n.classList.remove('sel');});
  world.classList.add('panning');
  var sx=e.clientX,sy=e.clientY,ox=view.x,oy=view.y;
  function mv(ev){view.x=ox+ev.clientX-sx;view.y=oy+ev.clientY-sy;applyView();}
  function up(){world.classList.remove('panning');document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);qsave();}
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
});
world.addEventListener('wheel',function(e){
  e.preventDefault();
  var r=world.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  var nz=Math.max(.2,Math.min(3,view.z*(e.deltaY<0?1.08:0.925)));
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
  function S(p){return [base.ox+p[0]*base.s,base.oy+p[1]*base.s];}
  function path(q){return 'M '+q.map(function(p){var sp=S(p);return sp[0].toFixed(1)+' '+sp[1].toFixed(1);}).join(' L ')+' Z';}
  var svg='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:100%;display:block">';
  if(it.floorSrc)svg+='<defs><pattern id="flp'+it.id+'" patternUnits="userSpaceOnUse" width="140" height="140"><image href="'+it.floorSrc+'" width="140" height="140" preserveAspectRatio="xMidYMid slice"/></pattern></defs>';
  svg+='<path d="'+path(verts)+'" fill="'+(it.floorSrc?('url(#flp'+it.id+')'):(it.floorHex||'#efece5'))+'" stroke="rgba(35,31,27,.08)"/>';
  var i;
  for(i=0;i<verts.length;i++){
    var a=wallA(verts,i),b=wallB(verts,i),nOut=wallNormals(verts,i).nOut;
    svg+='<path data-wall="'+i+'" d="'+path([a,b,[b[0]+nOut[0]*WALL_T,b[1]+nOut[1]*WALL_T],[a[0]+nOut[0]*WALL_T,a[1]+nOut[1]*WALL_T]])+'" fill="'+(it.wallHex||'#9a9284')+'" style="cursor:pointer"/>';
    var len=Math.round(wallLen(verts,i));
    var mid=[(a[0]+b[0])/2+nOut[0]*(WALL_T+430),(a[1]+b[1])/2+nOut[1]*(WALL_T+430)],sm=S(mid);
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
      var m=wallPoint(verts,i,(mk[0]+mk[1])/2),p=S([m[0]+nO[0]*(WALL_T+200),m[1]+nO[1]*(WALL_T+200)]);
      svg+='<text x="'+p[0]+'" y="'+(p[1]+3)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="'+(mk[2]?'#1D1D1D':'#9a9284')+'" stroke="#faf8f2" stroke-width="2.5" paint-order="stroke" pointer-events="none">'+Math.round(mk[1]-mk[0])+'</text>';});
  }
  /* openings: doors paper + swing arc, windows teal */
  ops.forEach(function(op){
    var a=wallPoint(verts,op.wall,op.pos),b=wallPoint(verts,op.wall,op.pos+op.width);
    var ns=wallNormals(verts,op.wall),nOut=ns.nOut,nIn=ns.nIn;
    var isDoor=op.type==='door';
    var g='<g data-op="'+op.id+'" style="cursor:grab">';
    g+='<path d="'+path([a,b,[b[0]+nOut[0]*WALL_T,b[1]+nOut[1]*WALL_T],[a[0]+nOut[0]*WALL_T,a[1]+nOut[1]*WALL_T]])+'" fill="'+(isDoor?'#faf8f2':'#5b8a9a')+'" stroke="'+(isDoor?'rgba(35,31,27,.4)':'#3f6472')+'" stroke-width="1.5"/>';
    if(isDoor){
      var sA=S(a),sB=S(b),wpx=op.width*base.s;
      var leaf=[sA[0]+nIn[0]*wpx,sA[1]+nIn[1]*wpx];
      var cross=nIn[0]*(sB[1]-sA[1])-nIn[1]*(sB[0]-sA[0]),sweep=cross>0?1:0;
      g+='<path d="M '+sA[0].toFixed(1)+' '+sA[1].toFixed(1)+' L '+leaf[0].toFixed(1)+' '+leaf[1].toFixed(1)+' A '+wpx.toFixed(1)+' '+wpx.toFixed(1)+' 0 0 '+sweep+' '+sB[0].toFixed(1)+' '+sB[1].toFixed(1)+'" fill="none" stroke="#6b6358" stroke-width="1.2" stroke-dasharray="5 4" pointer-events="none"/>';
    }
    g+='</g>';svg+=g;
  });
  var cen=[0,0];verts.forEach(function(q){cen[0]+=q[0];cen[1]+=q[1];});cen=[cen[0]/verts.length,cen[1]/verts.length];
  var sc2=S(cen);
  svg+='<text x="'+sc2[0]+'" y="'+(sc2[1]+4)+'" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" letter-spacing="1.5" fill="#D4A01B" pointer-events="none">'+(polygonArea(verts)/1e6).toFixed(1)+' M²</text>';
  svg+='</svg>';
  return svg;
}
/* opening interactions on a plan card: arm door/window, tap a wall to place (centred, clamped), drag along the wall */
function wirePlan(d,it){
  var face=d.querySelector('.planface');
  function refresh(){face.innerHTML=planSVG(it);}
  face.addEventListener('dblclick',function(e){
    var opEl=e.target.closest('[data-op]');if(!opEl)return;
    e.stopPropagation();e.preventDefault();
    var id=+opEl.getAttribute('data-op');
    var op=(it.openings||[]).filter(function(o){return o.id===id;})[0];
    it.openings=(it.openings||[]).filter(function(o){return o.id!==id;});
    refresh();qsave();toast((op&&op.type==='door'?'Door':'Window')+' removed');
  });
  face.addEventListener('pointerdown',function(e){
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
  d.querySelectorAll('.pbtn').forEach(function(b){
    b.addEventListener('pointerdown',function(e){e.stopPropagation();});
    b.addEventListener('click',function(e){
      e.stopPropagation();
      var kind=b.getAttribute('data-kind');
      it._placing=(it._placing===kind)?null:kind;
      d.querySelectorAll('.pbtn').forEach(function(q){q.classList.toggle('on',q===b&&!!it._placing);});
      toast(it._placing?('Tap a wall to place the '+kind):'Placement cancelled');
    });
  });
}
var drawMode=false,drawVerts=[],drawLayer=null;
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
  el('cvHint').textContent='Click to place corners · snaps to 45° and 50mm · click the first corner (or Plan again) to close · Esc cancels';
  toast('Draw your room — wall by wall');
};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&drawMode)endDraw(false);});
world.addEventListener('pointermove',function(e){if(drawMode)renderDraw(drawPt(e));});
/* ---------- walls ---------- */
el('cvWall').onclick=function(){
  var p=centre();
  add({type:'wall',x:p.x-320,y:p.y-200,w:640,h:400,hex:'#F0EDE8',name:'Wall'});
  toast('Wall added — select it, then tap a paint swatch to colour it');
};
/* ---------- notes ---------- */
el('cvNote').onclick=function(){
  var p=centre();
  var it=add({type:'note',x:p.x-80,y:p.y-70,w:160,h:140,text:''});
  var n=plane.querySelector('.citem[data-id="'+it.id+'"] .body');if(n)setTimeout(function(){n.focus();},50);
};

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
      var pl=document.querySelector('.citem.plan.sel');
      if(pl){var p2=null;items.forEach(function(q){if(q.id===pl.dataset.id)p2=q;});
        if(p2){
          if(s.hex){p2.wallHex=s.hex;toast('Walls painted — '+s.name);}
          else{p2.floorSrc=s.src;toast('Floor laid — '+s.name);}
          pl.querySelector('.planface').innerHTML=planSVG(p2);qsave();return;}}
      var selEl=document.querySelector('.citem.wall.sel');
      if(selEl&&s.hex){var w=null;items.forEach(function(q){if(q.id===selEl.dataset.id)w=q;});
        if(w){w.hex=s.hex;w.name=s.name;var f=selEl.querySelector('.wallface');f.style.background=s.hex;f.querySelector('.wn').textContent=s.name;qsave();toast('Wall painted — '+s.name);return;}}
      var p=centre();add({type:'swatch',x:p.x-70,y:p.y-55,w:140,h:110,hex:s.hex,src:s.src,name:s.name});toast(s.name+' placed');};
    row.appendChild(c);
  });
  t.classList.add('on');requestAnimationFrame(function(){t.classList.add('show');});
};

/* ---------- export ---------- */
el('cvExport').onclick=function(){
  if(!items.length){toast('The board is empty');return;}
  var pad=60,minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  items.forEach(function(it){minX=Math.min(minX,it.x);minY=Math.min(minY,it.y);maxX=Math.max(maxX,it.x+it.w);maxY=Math.max(maxY,it.y+it.h);});
  var W=Math.min(4200,maxX-minX+pad*2),H=Math.min(4200,maxY-minY+pad*2);
  var cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');
  x.fillStyle='#FAF8F3';x.fillRect(0,0,W,H);
  var sorted=items.slice().sort(function(a,b){return (a.z||0)-(b.z||0);});
  var pend=0;
  function done(){
    if(pend>0)return;
    var a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='sturij-board.png';a.click();toast('Board downloaded');
  }
  sorted.forEach(function(it){
    var ix=it.x-minX+pad,iy=it.y-minY+pad;
    if(it.type==='plan'){
      x.fillStyle='#FFFFFF';x.fillRect(ix,iy,it.w,it.h);
      (function(){var v=it.verts,minX2=1e9,minY2=1e9,maxX2=-1e9,maxY2=-1e9;
        v.forEach(function(q){minX2=Math.min(minX2,q[0]);minY2=Math.min(minY2,q[1]);maxX2=Math.max(maxX2,q[0]);maxY2=Math.max(maxY2,q[1]);});
        var pad2=300,s2=Math.min(it.w/(maxX2-minX2+2*pad2),it.h/(maxY2-minY2+2*pad2));
        var ox2=ix+(it.w-(maxX2-minX2+2*pad2)*s2)/2-(minX2-pad2)*s2,oy2=iy+(it.h-(maxY2-minY2+2*pad2)*s2)/2-(minY2-pad2)*s2;
        x.beginPath();v.forEach(function(q,i2){var px=ox2+q[0]*s2,py=oy2+q[1]*s2;i2?x.lineTo(px,py):x.moveTo(px,py);});x.closePath();
        x.fillStyle='rgba(29,29,29,.04)';x.fill();x.strokeStyle='#1D1D1D';x.lineWidth=3;x.stroke();})();
    }
    else if(it.type==='wall'){x.fillStyle=it.hex||'#F0EDE8';x.fillRect(ix,iy,it.w,it.h);x.fillStyle='rgba(29,29,29,.45)';x.font='500 12px "IBM Plex Mono",monospace';x.fillText((it.name||'WALL').toUpperCase(),ix+10,iy+it.h-10);}
    else if(it.type==='note'){x.fillStyle='#F6EEC9';x.fillRect(ix,iy,it.w,it.h);x.fillStyle='#4A4232';x.font='14px "Source Serif 4",serif';
      var words=(it.text||'').split(/\s+/),line='',ly=iy+26;
      words.forEach(function(w){if(x.measureText(line+' '+w).width>it.w-26){x.fillText(line,ix+13,ly);ly+=19;line=w;}else line=line?line+' '+w:w;});
      x.fillText(line,ix+13,ly);}
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
};

/* ---------- clear ---------- */
el('cvClear').onclick=function(){
  if(!items.length){toast('Already empty');return;}
  if(!confirm('Clear the whole board?'))return;
  items=[];plane.innerHTML='';save();toast('Board cleared');
};

/* ---------- boot ---------- */
(function(){
  var S=null;try{S=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  if(S&&S.v===1){view=S.view||view;items=S.items||[];
    items.forEach(function(q){delete q._placing;});items.forEach(function(it){zTop=Math.max(zTop,it.z||0);render(it);});}
  applyView();
})();
})();
