/* creative-create.js — "Create new" morphing button (Motion+ CreateButton port, atelier trim).
   Trigger expands into a 3×2 grid of creation types. Items call window.SturijCreate[label] if
   registered; otherwise they toast "coming soon" — future-proof hook per tool. */
addEventListener('DOMContentLoaded',function(){
var host=document.getElementById('createbtn');if(!host)return;
var ITEMS=[
 ['Project','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>'],
 ['Moodboard','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="12" rx="1.5"/><rect x="13" y="3" width="8" height="7" rx="1.5"/><rect x="13" y="12" width="8" height="9" rx="1.5"/><rect x="3" y="17" width="8" height="4" rx="1.5"/></svg>'],
 ['Review link','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 5"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L13 19"/></svg>'],
 ['Presentation','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M12 17v4M8 21h8"/></svg>'],
 ['Quote','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>'],
 ['Research','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>']
];
var st=document.createElement('style');
st.textContent=
'.cnwrap{display:flex;justify-content:center;margin:34px auto 0}'+
'.cnbox{position:relative;background:#FDFCF8;overflow:hidden;box-shadow:0 2px 4px rgba(35,31,27,.08),0 16px 40px rgba(35,31,27,.16);background-image:repeating-linear-gradient(119deg,rgba(29,29,29,.05) 0,rgba(29,29,29,.05) 1px,transparent 1px,transparent 5px)}'+
'.cncap{position:absolute;width:10px;height:10px;border:1.5px solid #D4A01B;pointer-events:none;z-index:3}'+
'.cnhd{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 18px;cursor:pointer;user-select:none}'+
'.cnhd span{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#1D1D1D}'+
'.cnic{display:flex;color:#D4A01B;transition:transform .3s cubic-bezier(.22,1,.36,1)}'+
'.cnbox.open .cnic{transform:rotate(45deg);color:#62584F}'+
'.cngrid{display:grid;grid-template-columns:repeat(3,1fr);width:22rem;border-top:1px dotted rgba(98,88,79,.4)}'+
'.cncell{position:relative;display:flex;flex-direction:column;align-items:center;gap:9px;padding:18px 8px;cursor:pointer;color:#62584F;background:#FDFCF8}'+
'.cncell:hover{background:rgba(212,160,27,.1);color:#1D1D1D}'+
'.cncell:nth-child(3n+1),.cncell:nth-child(3n+2){border-right:1px dotted rgba(98,88,79,.4)}'+
'.cncell:nth-child(-n+3){border-bottom:1px dotted rgba(98,88,79,.4)}'+
'.cncell b{font:500 9px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#1D1D1D}';
document.head.appendChild(st);
host.className='cnwrap';
host.innerHTML='<div class="cnbox">'
 +'<span class="cncap" style="top:-1px;left:-1px;border-right:none;border-bottom:none"></span>'
 +'<span class="cncap" style="top:-1px;right:-1px;border-left:none;border-bottom:none"></span>'
 +'<span class="cncap" style="bottom:-1px;left:-1px;border-right:none;border-top:none"></span>'
 +'<span class="cncap" style="bottom:-1px;right:-1px;border-left:none;border-top:none"></span>'
 +'<div class="cnhd"><span>Create new</span><div class="cnic"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div></div>'
 +'<div class="cngrid" style="display:none">'+ITEMS.map(function(it){return '<div class="cncell" data-l="'+it[0]+'">'+it[1]+'<b>'+it[0]+'</b></div>';}).join('')+'</div>'
 +'</div>';
var box=host.firstChild,grid=box.querySelector('.cngrid'),open=false;
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
var SPR={type:'spring',stiffness:240,damping:23};
function toggle(){
  var w0=box.offsetWidth,h0=box.offsetHeight;
  open=!open;box.classList.toggle('open',open);
  grid.style.display=open?'grid':'none';
  var w1=box.offsetWidth,h1=box.offsetHeight;
  box.style.width=w1+'px';box.style.height=h1+'px';
  anim(box,{width:[w0+'px',w1+'px'],height:[h0+'px',h1+'px']},SPR);
  if(open){
    anim(grid,{opacity:[0,1],y:[40,0],scale:[.9,1]},SPR);
    [].forEach.call(grid.children,function(c,i){anim(c,{opacity:[0,1]},{delay:i*.05+.1,duration:.25});});
  }
}
box.querySelector('.cnhd').addEventListener('click',toggle);
document.addEventListener('pointerdown',function(e){if(open&&!box.contains(e.target))toggle();});
grid.addEventListener('click',function(e){
  var c=e.target.closest('.cncell');if(!c)return;
  var l=c.getAttribute('data-l');
  toggle();
  var reg=window.SturijCreate||{};
  if(typeof reg[l]==='function'){reg[l]();return;}
  var t=document.createElement('div');
  t.style.cssText='position:fixed;left:50%;bottom:40px;transform:translateX(-50%);padding:9px 18px;border-radius:999px;background:#FDFCF8;font:400 11px "IBM Plex Mono",monospace;color:#1D1D1D;z-index:600;box-shadow:0 2px 4px rgba(35,31,27,.1),0 14px 30px rgba(35,31,27,.24)';
  t.textContent=l+' \u2014 coming soon';
  document.body.appendChild(t);
  anim(t,{y:[10,0],opacity:[0,1]},{type:'spring',stiffness:400,damping:30});
  setTimeout(function(){var a=anim(t,{opacity:[1,0]},{duration:.3});if(a)a.then(function(){t.remove();},function(){t.remove();});else t.remove();},2200);
});
});
