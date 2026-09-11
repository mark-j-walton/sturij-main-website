/* creative-gallery.js — gallery modules for the Creative room.
   Cards: closed = cover (project name + small summary + count). "Add new gallery" card →
   title + description form → "Add photos" flips the surface into a drag-and-drop upload target.
   Photos persist locally (resized to keep storage light). */
addEventListener('DOMContentLoaded',function(){
var host=document.getElementById('galleries');if(!host)return;
var KEY='sturij.galleries';
var gals;try{gals=JSON.parse(localStorage.getItem(KEY))||[];}catch(e){gals=[];}
function save(){try{localStorage.setItem(KEY,JSON.stringify(gals));}catch(e){toast('Storage full \u2014 photo not saved');}}
function anim(el,kf,o){if(window.Motion&&!document.body.classList.contains('rmotion')){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
function toast(m){var t=document.createElement('div');
  t.style.cssText='position:fixed;left:50%;bottom:40px;transform:translateX(-50%);padding:9px 18px;border-radius:999px;background:#FDFCF8;font:400 11px "IBM Plex Mono",monospace;color:#1D1D1D;z-index:600;box-shadow:0 14px 30px rgba(35,31,27,.24)';
  t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove();},2200);}
var st=document.createElement('style');
st.textContent=
'.gal{max-width:880px;margin:60px auto 40px;padding:0 20px}'+
'.galh{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#62584F;padding-bottom:14px}'+
'.galgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}'+
'.gcard{position:relative;background:#FDFCF8;border-radius:16px;min-height:190px;box-shadow:0 2px 4px rgba(35,31,27,.08),0 16px 40px rgba(35,31,27,.14);overflow:hidden;display:flex;flex-direction:column}'+
'.gcov{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;cursor:pointer;background-size:cover;background-position:center;position:relative}'+
'.gcov.hasimg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(29,26,23,.62))}'+
'.gcov b{position:relative;z-index:1;font:600 20px "Cormorant Garamond",Georgia,serif;color:#1D1D1D}'+
'.gcov.hasimg b{color:#FDFCF8}'+
'.gcov p{position:relative;z-index:1;margin:3px 0 0;font:400 10.5px/1.5 "IBM Plex Mono",monospace;color:#62584F}'+
'.gcov.hasimg p{color:rgba(250,248,243,.8)}'+
'.gct{position:absolute;top:10px;right:10px;z-index:2;font:500 8.5px "IBM Plex Mono",monospace;letter-spacing:.1em;padding:3px 9px;border-radius:999px;background:rgba(253,252,248,.85);color:#62584F;box-shadow:inset 0 0 0 1px rgba(35,31,27,.08)}'+
'.gnew{border:1.5px dashed rgba(98,88,79,.4);background:rgba(253,252,248,.6);box-shadow:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#62584F;flex-direction:column;gap:8px;transition:border-color .15s,color .15s}'+
'.gnew:hover{border-color:#D4A01B;color:#1D1D1D}'+
'.gnew span{font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase}'+
'.gform{padding:16px;display:flex;flex-direction:column;gap:10px;flex:1}'+
'.gform input,.gform textarea{border:0;outline:none;background:rgba(29,29,29,.04);border-radius:10px;padding:9px 12px;font:400 12px "IBM Plex Mono",monospace;color:#1D1D1D;resize:none}'+
'.gform input:focus,.gform textarea:focus{background:#FDFCF8;box-shadow:0 0 0 1px #D4A01B}'+
'.gbtn{all:unset;text-align:center;padding:9px 0;border-radius:999px;background:#1D1D1D;color:#FDFCF8;font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}'+
'.gbtn[disabled]{opacity:.35;pointer-events:none}'+
'.gdrop{flex:1;margin:14px;border:1.5px dashed rgba(98,88,79,.4);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#62584F;font:400 10.5px "IBM Plex Mono",monospace;cursor:pointer;transition:border-color .15s,background .15s;min-height:120px}'+
'.gdrop.over{border-color:#D4A01B;background:rgba(212,160,27,.08)}'+
'.gthumbs{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px}'+
'.gthumbs img{width:44px;height:44px;object-fit:cover;border-radius:8px;box-shadow:0 2px 6px rgba(35,31,27,.2)}'+
'.gdone{margin:0 14px 14px}'+
'.gnav{display:flex;align-items:center;justify-content:center;gap:14px;padding:0 14px 10px}'+
'.gnav .arw{all:unset;width:26px;height:26px;border-radius:50%;background:#FDFCF8;color:rgba(98,88,79,.8);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16),0 1px 3px rgba(35,31,27,.12)}'+
'.gnav .arw[disabled]{opacity:.3;pointer-events:none}'+
'.gnav .dots{display:flex;gap:7px}'+
'.gnav .dot{all:unset;width:7px;height:7px;border-radius:4px;background:rgba(98,88,79,.35);cursor:pointer;transition:width .25s cubic-bezier(.22,1,.36,1),background .2s}'+
'.gnav .dot:hover{background:rgba(98,88,79,.6)}'+
'.gnav .dot.on{background:#D4A01B;width:16px}'+
'.gcard.gdrag{box-shadow:0 8px 18px rgba(35,31,27,.2),0 26px 60px rgba(35,31,27,.32)!important}'+
'.glb{position:fixed;inset:0;z-index:540;background:rgba(29,26,23,.92);display:flex;align-items:center;justify-content:center}'+
'.glb img.main{max-width:92vw;max-height:82vh;object-fit:contain;border-radius:6px;box-shadow:0 30px 80px rgba(0,0,0,.5);user-select:none;-webkit-user-drag:none;touch-action:none;cursor:grab}'+
'.glbx{all:unset;position:absolute;top:18px;right:18px;width:38px;height:38px;border-radius:50%;background:rgba(253,252,248,.16);backdrop-filter:blur(10px);color:#FDFCF8;display:flex;align-items:center;justify-content:center;cursor:pointer}'+
'.glbx:hover{background:rgba(253,252,248,.28)}'+
'.glbth{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:10px;border-radius:12px;background:rgba(29,26,23,.5);backdrop-filter:blur(10px)}'+
'.glbth button{all:unset;width:56px;height:38px;border-radius:6px;overflow:hidden;cursor:pointer;box-shadow:0 0 0 2px transparent;transition:box-shadow .2s,transform .15s}'+
'.glbth button:hover{transform:scale(1.08);box-shadow:0 0 0 2px rgba(253,252,248,.6)}'+
'.glbth button.on{box-shadow:0 0 0 2px #D4A01B}'+
'.glbth img{width:100%;height:100%;object-fit:cover;display:block}';
document.head.appendChild(st);
host.innerHTML='<div class="galh">Galleries</div><div class="galgrid" id="galgrid"></div>';
var grid=host.querySelector('#galgrid');
function shrink(file,cb){
  var img=new Image();
  img.onload=function(){
    var k=Math.min(1,420/img.width),c=document.createElement('canvas');
    c.width=img.width*k;c.height=img.height*k;
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    cb(c.toDataURL('image/jpeg',.75));
  };
  img.src=URL.createObjectURL(file);
}
function coverCard(g){
  var d=document.createElement('div');d.className='gcard';
  var bg=g.photos&&g.photos.length?' hasimg" style="background-image:url('+g.photos[0]+')"':'"';
  d.innerHTML='<div class="gcov'+bg+'><b></b><p></p></div>'
    +(g.photos&&g.photos.length?'<span class="gct">'+g.photos.length+' photos</span>':'');
  d.querySelector('b').textContent=g.title;
  d.querySelector('p').textContent=g.summary||'';
  d._g=g;
  /* drag to reorder the grid (Motion Reorder.Group treatment); a still click opens */
  d.addEventListener('pointerdown',function(e){
    e.preventDefault();try{d.setPointerCapture(e.pointerId);}catch(_){}
    var sx=e.clientX,sy=e.clientY,moved=false;
    function slot(){var tr=d.style.transform;d.style.transform='none';var r=d.getBoundingClientRect();d.style.transform=tr;return r;}
    function mv(ev){
      var dx=ev.clientX-sx,dy=ev.clientY-sy;
      if(!moved&&Math.hypot(dx,dy)>8){moved=true;d.classList.add('gdrag');d.style.zIndex=9;}
      if(!moved)return;
      d.style.transform='translate('+dx+'px,'+dy+'px) scale(1.08)';
      d.style.pointerEvents='none';
      var t=document.elementFromPoint(ev.clientX,ev.clientY);
      d.style.pointerEvents='';
      var over=t&&t.closest?t.closest('.gcard'):null;
      if(over&&over!==d&&over._g){
        var before={};[].forEach.call(grid.children,function(c){if(c._g&&c!==d)before[c._g.id]=c.getBoundingClientRect();});
        var i1=gals.indexOf(d._g),i2=gals.indexOf(over._g);
        gals.splice(i1,1);gals.splice(i2,0,d._g);
        var o=slot();
        if(i2>i1)grid.insertBefore(d,over.nextSibling);else grid.insertBefore(d,over);
        var n=slot();sx+=n.left-o.left;sy+=n.top-o.top;
        d.style.transform='translate('+(ev.clientX-sx)+'px,'+(ev.clientY-sy)+'px) scale(1.08)';
        [].forEach.call(grid.children,function(c){
          if(!c._g||c===d||!before[c._g.id])return;
          var b=before[c._g.id],now=c.getBoundingClientRect();
          var ddx=b.left-now.left,ddy=b.top-now.top;
          if(ddx||ddy)anim(c,{x:[ddx,0],y:[ddy,0]},{type:'spring',stiffness:350,damping:30});
        });
      }
    }
    function up(ev){
      window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
      if(!moved){render(g.id);return;}
      d.classList.remove('gdrag');
      var cx=ev.clientX-sx,cy=ev.clientY-sy;
      d.style.transform='';d.style.zIndex='';
      anim(d,{x:[cx,0],y:[cy,0],scale:[1.08,1]},{type:'spring',stiffness:350,damping:30});
      save();
    }
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  });
  return d;
}
function editCard(g,fresh){
  var d=document.createElement('div');d.className='gcard';
  d.innerHTML='<div class="gform"><input placeholder="Gallery title" value="'+(g.title||'').replace(/"/g,'&quot;')+'">'
    +'<textarea rows="2" placeholder="Small summary\u2026">'+(g.summary||'')+'</textarea>'
    +'<button class="gbtn" disabled>Add photos</button></div>';
  var inp=d.querySelector('input'),ta=d.querySelector('textarea'),btn=d.querySelector('.gbtn');
  function chk(){btn.disabled=!inp.value.trim();if(inp.value.trim())btn.removeAttribute('disabled');else btn.setAttribute('disabled','');}
  inp.addEventListener('input',chk);chk();
  btn.onclick=function(){
    g.title=inp.value.trim();g.summary=ta.value.trim();
    if(fresh&&gals.indexOf(g)<0)gals.push(g);
    save();g._upload=true;render(g.id);
  };
  return d;
}
function uploadCard(g){
  var d=document.createElement('div');d.className='gcard';
  d.innerHTML='<div class="gform" style="padding-bottom:0"><b style="font:600 17px \'Cormorant Garamond\',serif">'+g.title+'</b></div>'
    +'<div class="gdrop"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Drop photos here \u2014 or click to browse</span></div>'
    +'<div class="gthumbs"></div><div class="gnav" style="display:none"><button class="arw prv"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button><span class="dots"></span><button class="arw nxt"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button></div><button class="gbtn gdone">Done</button>'
    +'<input type="file" accept="image/*" multiple hidden>';
  var drop=d.querySelector('.gdrop'),file=d.querySelector('input'),th=d.querySelector('.gthumbs');
  g.photos=g.photos||[];
  var nav=d.querySelector('.gnav'),dots=nav.querySelector('.dots'),prv=nav.querySelector('.prv'),nxt=nav.querySelector('.nxt');
  function pages(){return Math.max(1,Math.ceil(th.scrollWidth/Math.max(1,th.clientWidth)));}
  function page(){return Math.round(th.scrollLeft/Math.max(1,th.clientWidth));}
  function paintNav(){
    var n=pages();
    nav.style.display=n>1?'flex':'none';
    if(n>1){
      var cur=Math.min(page(),n-1);
      dots.innerHTML='';
      for(var i=0;i<n;i++){(function(i){
        var b=document.createElement('button');b.className='dot'+(i===cur?' on':'');
        b.onclick=function(){th.scrollTo({left:i*th.clientWidth,behavior:'smooth'});};
        dots.appendChild(b);})(i);}
      if(cur===0)prv.setAttribute('disabled','');else prv.removeAttribute('disabled');
      if(cur===n-1)nxt.setAttribute('disabled','');else nxt.removeAttribute('disabled');
    }
  }
  prv.onclick=function(){th.scrollTo({left:(page()-1)*th.clientWidth,behavior:'smooth'});};
  nxt.onclick=function(){th.scrollTo({left:(page()+1)*th.clientWidth,behavior:'smooth'});};
  th.addEventListener('scroll',function(){clearTimeout(th._nt);th._nt=setTimeout(paintNav,80);},{passive:true});
  function paintThumbs(){th.innerHTML=g.photos.map(function(p){return '<img src="'+p+'" draggable="false">';}).join('');setTimeout(paintNav,50);}
  /* free-scroll carousel: drag with momentum (Motion+ Carousel treatment, snap:false) */
  (function(){
    var vel=0,raf=0,lastX=0,lastT=0;
    th.addEventListener('pointerdown',function(e){
      e.preventDefault();cancelAnimationFrame(raf);
      th.classList.add('dragging');
      var sx=e.clientX,sl=th.scrollLeft;lastX=e.clientX;lastT=performance.now();vel=0;th._dragged=false;
      function mv(ev){
        var now=performance.now(),dt=now-lastT;
        if(dt>0){vel=(lastX-ev.clientX)/dt*16;lastX=ev.clientX;lastT=now;}
        if(Math.abs(sx-ev.clientX)>5)th._dragged=true;
        th.scrollLeft=sl+(sx-ev.clientX);
      }
      function up(){
        window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
        th.classList.remove('dragging');
        (function glide(){
          if(Math.abs(vel)<.4)return;
          th.scrollLeft+=vel;vel*=.94;
          raf=requestAnimationFrame(glide);
        })();
      }
      window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
    });
  })();
  paintThumbs();
  function addFiles(fs){
    [].forEach.call(fs,function(f){
      if(!/^image\//.test(f.type))return;
      shrink(f,function(url){g.photos.push(url);save();paintThumbs();
        var im=th.lastChild;if(im)anim(im,{scale:[.6,1],opacity:[0,1]},{type:'spring',stiffness:400,damping:26});});
    });
  }
  th.addEventListener('click',function(e){
    var im=e.target.closest('img');if(!im||th._dragged)return;
    openLightbox(g,[].indexOf.call(th.querySelectorAll('img'),im));
  });
  drop.onclick=function(){file.click();};
  file.onchange=function(){addFiles(file.files);file.value='';};
  ['dragover','dragenter'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('over');});});
  ['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('over');});});
  drop.addEventListener('drop',function(e){addFiles(e.dataTransfer.files);});
  d.querySelector('.gdone').onclick=function(){delete g._upload;save();render();};
  return d;
}
function openLightbox(g,start){
  var idx=start||0;
  var lb=document.createElement('div');lb.className='glb';
  lb.innerHTML='<img class="main" draggable="false"><button class="glbx"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button><div class="glbth"></div>';
  document.body.appendChild(lb);
  var main=lb.querySelector('.main'),bar=lb.querySelector('.glbth');
  g.photos.forEach(function(p,i){
    var b=document.createElement('button');b.innerHTML='<img src="'+p+'">';
    b.onclick=function(e){e.stopPropagation();go(i);};
    bar.appendChild(b);
  });
  function go(i,dir){
    idx=(i+g.photos.length)%g.photos.length;
    main.src=g.photos[idx];
    [].forEach.call(bar.children,function(b,j){b.classList.toggle('on',j===idx);});
    anim(main,{opacity:[.4,1],x:[dir?dir*40:0,0],scale:[.98,1]},{type:'spring',stiffness:400,damping:32});
  }
  function close(){document.removeEventListener('keydown',keys);var a=anim(lb,{opacity:[1,0]},{duration:.18});if(a)a.then(function(){lb.remove();},function(){lb.remove();});else lb.remove();}
  function keys(e){
    if(e.key==='Escape')close();
    if(e.key==='ArrowRight')go(idx+1,1);
    if(e.key==='ArrowLeft')go(idx-1,-1);
  }
  document.addEventListener('keydown',keys);
  lb.querySelector('.glbx').onclick=close;
  lb.addEventListener('click',function(e){if(e.target===lb)close();});
  /* swipe between photos */
  main.addEventListener('pointerdown',function(e){
    e.preventDefault();try{main.setPointerCapture(e.pointerId);}catch(_){}
    var sx=e.clientX;
    function up(ev){main.removeEventListener('pointerup',up);
      var dx=ev.clientX-sx;
      if(dx<-50)go(idx+1,1);else if(dx>50)go(idx-1,-1);
    }
    main.addEventListener('pointerup',up);
  });
  anim(lb,{opacity:[0,1]},{duration:.2});
  anim(main,{scale:[.8,1],opacity:[0,1]},{type:'spring',stiffness:300,damping:26});
  go(idx);
}
function render(openId){
  grid.innerHTML='';
  gals.forEach(function(g){
    var card=(g.id===openId)?(g._upload?uploadCard(g):uploadCard(g)):coverCard(g);
    grid.appendChild(card);
    anim(card,{opacity:[0,1],y:[8,0]},{type:'spring',stiffness:400,damping:30});
  });
  var add=document.createElement('div');add.className='gcard gnew';
  add.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add new gallery</span>';
  add.onclick=function(){
    var g={id:'g'+Date.now(),title:'',summary:'',photos:[]};
    grid.replaceChild(editCard(g,true),add);
  };
  grid.appendChild(add);
}
render();
});
