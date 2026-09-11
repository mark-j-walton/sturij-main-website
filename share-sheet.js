/* share-sheet.js — draggable bottom sheet (Motion+ SheetModal port, paper theme).
   window.openShareSheet() on any page; auto-wires elements with [data-share] and adds a ⌘K command.
   Drag down past 92px (or flick >840px/s) to dismiss; backdrop fades with the drag. */
(function(){
var SPRING={type:'spring',stiffness:400,damping:40};
function anim(el,kf,o){if(window.Motion&&!document.body.classList.contains('rmotion')){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
var st=document.createElement('style');
st.textContent=
'.shroot{position:fixed;inset:0;z-index:520;display:flex;align-items:flex-end;justify-content:center;padding:10px}'+
'.shbk{position:absolute;inset:0;background:rgba(29,26,23,.5);border:0;cursor:default}'+
'.shsheet{position:relative;width:100%;max-width:26rem;border-radius:22px 22px 16px 16px;background:rgba(253,252,248,.92);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);padding:0 20px 22px;touch-action:none;will-change:transform;box-shadow:0 -6px 40px rgba(35,31,27,.3),inset 0 0 0 1px rgba(255,255,255,.5);cursor:grab}'+
'.shsheet.drag{cursor:grabbing}'+
'.shhandle{height:4px;width:40px;border-radius:999px;background:rgba(98,88,79,.3);margin:12px auto 4px}'+
'.shx{all:unset;position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:50%;background:#FDFCF8;color:rgba(98,88,79,.8);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16)}'+
'.shx:hover{color:#1D1D1D}'+
'.shtitle{font:600 22px "Cormorant Garamond",Georgia,serif;color:#1D1D1D;margin:8px 0 14px}'+
'.shrow{display:flex;gap:16px;overflow-x:auto;padding-bottom:4px}'+
'.shc{all:unset;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}'+
'.shc:active{transform:scale(.94)}'+
'.shav{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:500 13px "IBM Plex Mono",monospace;color:#FDFCF8}'+
'.shcl{font:500 8.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#62584F}'+
'.shdiv{height:1px;background:linear-gradient(90deg,transparent,rgba(35,31,27,.15),transparent);margin:14px 0}'+
'.sha{all:unset;display:flex;align-items:center;gap:12px;padding:11px 8px;border-radius:10px;cursor:pointer;color:#1D1D1D;font:400 12px "IBM Plex Mono",monospace;width:calc(100% - 16px)}'+
'.sha:hover{background:rgba(29,29,29,.05)}'+
'.sha svg{color:#62584F}';
document.head.appendChild(st);
var CONTACTS=[['Client','CL','#7A8B7F'],['Trade','TR','#B98A4A'],['Team','TE','#62584F'],['Studio','ST','#D4A01B']];
var ACTIONS=[
 ['Copy link','<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>'],
 ['Client review link','<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'],
 ['Download PDF','<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'],
 ['Send message','<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.9 20A9 9 0 104 16.1L2 22Z"/></svg>']
];
var root=null;
function toast(m){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;left:50%;bottom:40px;transform:translateX(-50%);padding:9px 18px;border-radius:999px;background:#FDFCF8;font:400 11px "IBM Plex Mono",monospace;color:#1D1D1D;z-index:600;box-shadow:0 2px 4px rgba(35,31,27,.1),0 14px 30px rgba(35,31,27,.24)';
  t.textContent=m;document.body.appendChild(t);
  anim(t,{y:[10,0],opacity:[0,1]},{type:'spring',stiffness:400,damping:30});
  setTimeout(function(){var a=anim(t,{opacity:[1,0]},{duration:.3});if(a)a.then(function(){t.remove();},function(){t.remove();});else t.remove();},2000);
}
function close(){
  if(!root)return;var r=root;root=null;
  var sheet=r.querySelector('.shsheet'),h=sheet.offsetHeight+30;
  anim(r.querySelector('.shbk'),{opacity:[null,0]},{duration:.25});
  var a=anim(sheet,{y:[null,h],opacity:[1,0]},SPRING);
  if(a)a.then(function(){r.remove();},function(){r.remove();});else r.remove();
}
window.openShareSheet=function(){
  if(root){close();return;}
  root=document.createElement('div');root.className='shroot';
  root.innerHTML='<button class="shbk" aria-label="Close"></button>'
   +'<section class="shsheet" role="dialog" aria-modal="true"><div class="shhandle"></div>'
   +'<button class="shx"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M10.5 1.4L1.4 10.5M10.5 10.5L1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>'
   +'<h3 class="shtitle">Share</h3>'
   +'<div class="shrow">'+CONTACTS.map(function(c){return '<button class="shc"><span class="shav" style="background:'+c[2]+'">'+c[1]+'</span><span class="shcl">'+c[0]+'</span></button>';}).join('')+'</div>'
   +'<div class="shdiv"></div>'
   +ACTIONS.map(function(a){return '<button class="sha">'+a[1]+'<span>'+a[0]+'</span></button>';}).join('')
   +'</section>';
  document.body.appendChild(root);
  var sheet=root.querySelector('.shsheet'),bk=root.querySelector('.shbk');
  var hiddenY=Math.max(sheet.offsetHeight+24,420);
  anim(bk,{opacity:[0,1]},{type:'spring',stiffness:400,damping:50});
  anim(sheet,{y:[hiddenY,0],opacity:[.97,1]},SPRING);
  bk.onclick=close;
  root.querySelector('.shx').onclick=close;
  [].forEach.call(root.querySelectorAll('.shc,.sha'),function(b){
    b.addEventListener('click',function(){var l=(b.querySelector('span:last-child')||b).textContent;close();toast(l+' \u2014 coming soon');});
  });
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}});
  /* drag to dismiss */
  var y=0,vy=0,lastY=0,lastT=0;
  sheet.addEventListener('pointerdown',function(e){
    if(e.target.closest('.shx,.shc,.sha'))return;
    e.preventDefault();sheet.setPointerCapture(e.pointerId);
    sheet.classList.add('drag');
    var sy=e.clientY;lastY=e.clientY;lastT=performance.now();vy=0;
    function mv(ev){
      var now=performance.now(),dt=now-lastT;
      if(dt>0){vy=(ev.clientY-lastY)/dt*1000;lastY=ev.clientY;lastT=now;}
      var dy=ev.clientY-sy;
      y=dy>0?dy:dy*.15; /* elastic above, free below */
      sheet.style.transform='translateY('+y+'px)';
      bk.style.opacity=Math.max(0,.5*(1-Math.max(0,y)/hiddenY))*2;
    }
    function up(){
      window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
      sheet.classList.remove('drag');
      if(y>92||vy>840){close();return;}
      var cur=y;y=0;sheet.style.transform='';
      anim(sheet,{y:[cur,0]},{type:'spring',stiffness:300,damping:30});
      bk.style.opacity=1;
    }
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  });
};
addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('[data-share]').forEach(function(b){b.addEventListener('click',window.openShareSheet);});
  if(window.SturijCommands)window.SturijCommands.push({group:'Deliver',label:'Share\u2026',keywords:['send','link','sheet'],run:function(){window.openShareSheet();}});
});
})();
