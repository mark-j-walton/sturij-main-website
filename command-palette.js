/* command-palette.js — ⌘K / Ctrl+K palette on every page (Motion+ CommandPalette port, atelier glass).
   Future-proof: pages register commands via window.SturijCommands.push({group,label,keywords,kbd,run})
   (or window.registerCommands([...])) — the palette indexes them live; no rebuild needed. */
(function(){
window.SturijCommands=window.SturijCommands||[];
window.registerCommands=function(list){list.forEach(function(c){window.SturijCommands.push(c);});};

/* built-ins: work-area switching (reads the same admin config as the switcher) */
(function(){
  var cfg;try{cfg=JSON.parse(localStorage.getItem('sturij.workareas')||'{}');}catch(e){cfg={};}
  var items=(cfg.items&&cfg.items.length?cfg.items:[{label:'Materials',href:'studio.html'},{label:'Studio',href:'canvas.html'},{label:'Creative',href:'creative.html'}]);
  items.forEach(function(it){
    window.SturijCommands.push({group:'Go to',label:it.label,keywords:['work area','switch','page'],run:function(){location.href=it.href;}});
  });
})();

var st=document.createElement('style');
st.textContent=
'.cpov{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-start;justify-content:center;padding-top:14vh}'+
'.cpbk{position:absolute;inset:0;background:rgba(29,26,23,.4)}'+
'.cpdlg{position:relative;width:min(480px,calc(100% - 32px));max-height:380px;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;background:rgba(253,252,248,.88);backdrop-filter:blur(20px) saturate(1.25);-webkit-backdrop-filter:blur(20px) saturate(1.25);box-shadow:0 24px 70px rgba(35,31,27,.35),inset 0 0 0 1px rgba(255,255,255,.5);will-change:transform,opacity}'+
'.cpin{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid rgba(35,31,27,.08)}'+
'.cpin svg{color:#9a9284;flex:none}'+
'.cpin input{flex:1;border:0;outline:none;background:none;font:400 13px "IBM Plex Mono",monospace;color:#1D1D1D}'+
'.cpin input::placeholder{color:#9a9284}'+
'.cplist{flex:1;overflow-y:auto;padding:6px}'+
'.cpg{font:500 9px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#9a9284;padding:10px 10px 6px}'+
'.cpi{position:relative;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;font:400 12px "IBM Plex Mono",monospace;color:#1D1D1D}'+
'.cpi[data-sel="1"]{background:rgba(212,160,27,.16);box-shadow:inset 2px 0 0 #D4A01B}'+
'.cpi .cpic{display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;color:#9a9284}'+
'.cpclr{display:flex;align-items:center;justify-content:center;width:20px;height:20px;border:0;border-radius:5px;background:rgba(29,29,29,.06);color:#62584F;cursor:pointer;padding:0}'+
'.cpi kbd{font:500 10px "IBM Plex Mono",monospace;padding:1px 6px;border-radius:4px;background:rgba(29,29,29,.05);box-shadow:inset 0 0 0 1px rgba(29,29,29,.1);color:#62584F}'+
'.cpi .cpk{margin-left:auto;display:flex;gap:3px}'+
'.cpempty{display:flex;justify-content:center;padding:30px;font:400 12px "IBM Plex Mono",monospace;color:#9a9284}'+
'.cpft{display:flex;gap:14px;padding:8px 14px;border-top:1px solid rgba(35,31,27,.08);font:400 10px "IBM Plex Mono",monospace;color:#9a9284}'+
'.cpft kbd{font:500 9px "IBM Plex Mono",monospace;padding:1px 5px;border-radius:3px;background:rgba(29,29,29,.05);box-shadow:inset 0 0 0 1px rgba(29,29,29,.1)}';
document.head.appendChild(st);

var ov=null,sel=0,flat=[];
function anim(el,kf,o){if(window.Motion&&!document.body.classList.contains('rmotion')){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
function groups(q){
  var by={};
  window.SturijCommands.forEach(function(c){
    if(q){var s=(c.label+' '+(c.keywords||[]).join(' ')).toLowerCase();if(s.indexOf(q)<0)return;}
    (by[c.group||'Commands']=by[c.group||'Commands']||[]).push(c);
  });
  return by;
}
function close(){
  if(!ov)return;var o=ov;ov=null;
  var a=anim(o.querySelector('.cpdlg'),{opacity:[1,0],y:[0,-8],scale:[1,.98]},{duration:.12,ease:'easeOut'});
  anim(o.querySelector('.cpbk'),{opacity:[1,0]},{duration:.15});
  if(a){a.then(function(){o.remove();},function(){o.remove();});}else o.remove();
}
function renderList(list,q){
  list.innerHTML='';flat=[];
  var by=groups(q);
  var names=Object.keys(by);
  if(!names.length){list.innerHTML='<div class="cpempty">No results'+(q?' for \u201c'+q+'\u201d':'')+'</div>';return;}
  names.forEach(function(g){
    var gl=document.createElement('div');gl.className='cpg';gl.textContent=g;list.appendChild(gl);
    by[g].forEach(function(c){
      var i=flat.length;
      var d=document.createElement('div');d.className='cpi';d.dataset.sel=i===sel?'1':'0';
      d.innerHTML=(c.icon?'<span class="cpic">'+c.icon+'</span>':'')+'<span>'+c.label+'</span>'+(c.kbd?'<span class="cpk">'+c.kbd.map(function(k){return '<kbd>'+k+'</kbd>';}).join('')+'</span>':'');
      d.onmouseenter=function(){sel=i;paintSel(list);};
      d.onclick=function(){close();setTimeout(function(){c.run&&c.run();},40);};
      list.appendChild(d);flat.push({el:d,cmd:c});
    });
  });
  if(sel>=flat.length)sel=0;paintSel(list);
}
function paintSel(list){
  flat.forEach(function(f,i){f.el.dataset.sel=i===sel?'1':'0';});
  var s=flat[sel];if(s){var r=s.el,lr=list.getBoundingClientRect(),rr=r.getBoundingClientRect();
    if(rr.bottom>lr.bottom)list.scrollTop+=rr.bottom-lr.bottom;
    if(rr.top<lr.top)list.scrollTop-=lr.top-rr.top;}
}
function openPal(){
  if(ov){close();return;}
  sel=0;
  ov=document.createElement('div');ov.className='cpov';
  ov.innerHTML='<div class="cpbk"></div><div class="cpdlg">'
    +'<div class="cpin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Type a command\u2026"><button class="cpclr" style="display:none" aria-label="Clear"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'<div class="cplist"></div>'
    +'<div class="cpft"><span><kbd>\u2191\u2193</kbd> navigate</span><span><kbd>\u21b5</kbd> select</span><span><kbd>esc</kbd> close</span></div>';
  document.body.appendChild(ov);
  var dlg=ov.querySelector('.cpdlg'),inp=ov.querySelector('input'),list=ov.querySelector('.cplist');
  ov.querySelector('.cpbk').onclick=close;
  anim(ov.querySelector('.cpbk'),{opacity:[0,1]},{duration:.2});
  anim(dlg,{opacity:[0,1],y:[-16,0],scale:[.96,1]},{type:'spring',stiffness:500,damping:35});
  renderList(list,'');
  var clr=ov.querySelector('.cpclr');
  clr.onclick=function(){inp.value='';clr.style.display='none';sel=0;renderList(list,'');inp.focus();};
  requestAnimationFrame(function(){inp.focus();});
  inp.addEventListener('input',function(){clr.style.display=inp.value?'flex':'none';sel=0;renderList(list,inp.value.trim().toLowerCase());});
  ov.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();sel=sel<flat.length-1?sel+1:0;paintSel(list);}
    else if(e.key==='ArrowUp'){e.preventDefault();sel=sel>0?sel-1:flat.length-1;paintSel(list);}
    else if(e.key==='Enter'){e.preventDefault();var f=flat[sel];if(f){close();setTimeout(function(){f.cmd.run&&f.cmd.run();},40);}}
    else if(e.key==='Escape'){e.preventDefault();close();}
  });
}
document.addEventListener('keydown',function(e){
  if(e.key==='k'&&(e.metaKey||e.ctrlKey)){e.preventDefault();openPal();}
});
window.openCommandPalette=openPal;
})();
