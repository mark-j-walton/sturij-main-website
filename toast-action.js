/* toast-action.js — toasts (Motion+ Radix toast + notifications-list ports). LIB.
   window.SturijToast(msg, {detail?, action?{label,onSelect}, duration?}) — bottom-right,
   slide-in from right, drag-right dismiss, action button.
   window.SturijNotify(title, {body?, duration?}) — bottom-centre stacked list: rises with
   scaleX 0.8→1 (200/18), × to dismiss, stack re-settles on removal (reduced-motion aware). */
(function(){
var st=document.createElement('style');
st.textContent=
'.stoast-vp{position:fixed;bottom:0;right:0;z-index:2147483000;display:flex;flex-direction:column;gap:10px;padding:25px;width:360px;max-width:100vw;pointer-events:none}'+
'.stoast{pointer-events:auto;touch-action:none;background:#FDFCF8;border-radius:12px;padding:14px 16px;display:grid;grid-template-areas:"t a" "d a";grid-template-columns:auto max-content;column-gap:14px;align-items:center;box-shadow:0 2px 4px rgba(35,31,27,.1),0 14px 34px rgba(35,31,27,.24);cursor:grab}'+
'.stoast .tt{grid-area:t;font:600 12px "IBM Plex Mono",monospace;color:#1D1D1D}'+
'.stoast .dd{grid-area:d;font:400 10.5px/1.4 "IBM Plex Mono",monospace;color:#62584F;margin-top:3px}'+
'.stoast .act{grid-area:a;all:unset;cursor:pointer;font:600 9.5px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;background:#E4B32E;color:#231F1B;padding:7px 12px;border-radius:100px;box-shadow:0 1px 2px rgba(35,31,27,.2)}'+
'.stoast .act:active{transform:scale(.94)}'+
'.snoti-vp{pointer-events:none;position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);z-index:2147483000;width:min(24rem,calc(100vw - 2rem));display:flex;flex-direction:column;gap:.6rem}'+
'.snoti{pointer-events:auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;background:#FDFCF8;border-radius:12px;padding:.9rem 1.1rem;box-shadow:0 2px 4px rgba(35,31,27,.1),0 10px 26px rgba(35,31,27,.2);transform-origin:center bottom;transition:transform .3s cubic-bezier(.215,.61,.355,1)}'+
'.snoti .tt{margin:0;font:600 12px "IBM Plex Mono",monospace;color:#1D1D1D}'+
'.snoti .bb{margin:.25rem 0 0;font:400 10.5px/1.4 "IBM Plex Mono",monospace;color:#62584F}'+
'.snoti .x{all:unset;cursor:pointer;color:#62584F;padding:.5rem;border-radius:50%;display:inline-flex}'+
'.snoti .x:hover{color:#1D1D1D}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
var vp=null;
window.SturijToast=function(msg,opts){
  opts=opts||{};
  if(!vp){vp=document.createElement('div');vp.className='stoast-vp';document.body.appendChild(vp);}
  var t=document.createElement('div');t.className='stoast';
  t.innerHTML='<div class="tt"></div>'+(opts.detail?'<div class="dd"></div>':'')+(opts.action?'<button class="act"></button>':'');
  t.querySelector('.tt').textContent=msg;
  if(opts.detail)t.querySelector('.dd').textContent=opts.detail;
  var gone=false;
  function dismiss(scale){
    if(gone)return;gone=true;clearTimeout(timer);
    var a=scale?anim(t,{opacity:[1,0],transform:['scale(1)','scale(.9)']},{duration:.18})
               :anim(t,{opacity:[1,0],transform:['translateX(0px)','translateX(140px)']},{duration:.2});
    var f=function(){t.remove();};if(a&&a.then)a.then(f);else setTimeout(f,220);
  }
  if(opts.action){var ab=t.querySelector('.act');ab.textContent=opts.action.label;
    ab.addEventListener('click',function(e){e.stopPropagation();dismiss(true);if(opts.action.onSelect)opts.action.onSelect();});}
  var timer=setTimeout(function(){dismiss(true);},opts.duration||3000);
  var down=false,sx=0,dx=0;
  t.addEventListener('pointerdown',function(e){down=true;sx=e.clientX;t.setPointerCapture&&t.setPointerCapture(e.pointerId);});
  t.addEventListener('pointermove',function(e){if(!down)return;dx=Math.max(0,e.clientX-sx);t.style.transform='translateX('+dx*.9+'px)';if(dx>100){down=false;dismiss(false);}});
  t.addEventListener('pointerup',function(){if(!down)return;down=false;anim(t,{transform:['translateX('+dx*.9+'px)','translateX(0px)']},{type:'spring',stiffness:400,damping:30});t.style.transform='translateX(0px)';dx=0;});
  vp.appendChild(t);
  anim(t,{opacity:[0,1],transform:['translateX(100px)','translateX(0px)']},{type:'spring',stiffness:350,damping:30})||(t.style.opacity=1);
  t.style.opacity=1;
  return {dismiss:function(){dismiss(true);}};
};
var nvp=null,RED=matchMedia('(prefers-reduced-motion: reduce)').matches;
window.SturijNotify=function(title,opts){
  opts=opts||{};
  if(!nvp){nvp=document.createElement('div');nvp.className='snoti-vp';document.body.appendChild(nvp);}
  var n=document.createElement('div');n.className='snoti';n.setAttribute('role','status');
  n.innerHTML='<div><p class="tt"></p>'+(opts.body?'<p class="bb"></p>':'')+'</div><button class="x" aria-label="Dismiss"><svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M10.5 1.4L1.4 10.5M10.5 10.5L1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
  n.querySelector('.tt').textContent=title;
  if(opts.body)n.querySelector('.bb').textContent=opts.body;
  var gone=false;
  function out(){
    if(gone)return;gone=true;clearTimeout(tm);
    var a=RED?anim(n,{opacity:[1,0]},{duration:.2})
             :anim(n,{opacity:[1,0],transform:['translateY(0px) scaleX(1)','translateY(10px) scaleX(.9)']},{duration:.2,ease:[.215,.61,.355,1]});
    var f=function(){n.remove();};if(a&&a.then)a.then(f);else setTimeout(f,220);
  }
  n.querySelector('.x').addEventListener('click',out);
  var tm=setTimeout(out,opts.duration||4000);
  nvp.appendChild(n);
  if(!RED){anim(n,{opacity:[0,1],transform:['translateY(14px) scaleX(.8)','translateY(0px) scaleX(1)']},{type:'spring',stiffness:200,damping:18})||(n.style.opacity=1);}
  n.style.opacity=1;
  return {dismiss:out};
};
})();
