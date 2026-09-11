/* status-badge.js — multi-state badge (Motion+ MultiStateBadge port) for the image-enhance flow.
   window.SturijBadge(hostEl, opts?) → controller {set(state), next()}.
   Default states: enhance → processing → received → library (error shakes). */
(function(){
var st=document.createElement('style');
st.textContent=
'.msb{display:inline-flex;align-items:center;justify-content:center;overflow:hidden;padding:11px 18px;border-radius:999px;background:#1D1D1D;color:#FDFCF8;cursor:pointer;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;will-change:transform,filter;user-select:none}'+
'.msb .ic{height:18px;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible;width:0;transition:width .3s cubic-bezier(.22,1,.36,1)}'+
'.msb .ic svg{display:block}'+
'.msb .lb{position:relative;white-space:nowrap;transition:margin .2s}'+
'.msb.hasic .ic{width:22px}'+
'.msb.state-processing .spinwrap{animation:msbsp 1s linear infinite;display:flex}'+
'@keyframes msbsp{to{transform:rotate(360deg)}}'+
'.msb.state-received{background:#7A8B7F}'+
'.msb.state-library{background:#D4A01B;color:#1D1D1D}'+
'.msb.state-error{background:#8a3b2e}';
document.head.appendChild(st);
var ICONS={
  processing:'<span class="spinwrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>',
  received:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 12 9 17 20 6"/></svg>',
  library:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  error:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'
};
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
window.SturijBadge=function(host,opts){
  opts=opts||{};
  var STATES=opts.states||{enhance:'Enhance',processing:'Room processing',received:'Received',library:'Library'};
  var keys=Object.keys(STATES),cur=keys[0];
  var el=document.createElement('div');el.className='msb';
  el.innerHTML='<span class="ic"></span><span class="lb"></span>';
  host.appendChild(el);
  var ic=el.querySelector('.ic'),lb=el.querySelector('.lb');
  function set(state){
    cur=state;
    el.className='msb state-'+state+(ICONS[state]?' hasic':'');
    ic.innerHTML=ICONS[state]||'';
    if(ICONS[state]){var s=ic.firstChild;anim(s,{y:[-16,0],opacity:[0,1],filter:['blur(6px)','blur(0px)']},{duration:.18,ease:'easeInOut'});lb.style.marginLeft='8px';}
    else lb.style.marginLeft='0';
    var old=lb.textContent;
    lb.textContent=STATES[state];
    anim(lb,{y:[-12,0],opacity:[0,1],filter:['blur(8px)','blur(0px)']},{duration:.2,ease:'easeInOut'});
    if(state==='received'||state==='success')anim(el,{scale:[1,1.18,1]},{duration:.3,ease:'easeInOut'});
    if(state==='error')anim(el,{x:[0,-6,6,-6,0]},{duration:.3,ease:'easeInOut'});
    if(opts.onChange)opts.onChange(state,old);
  }
  function next(){set(keys[(keys.indexOf(cur)+1)%keys.length]);}
  if(opts.cycleOnClick!==false)el.addEventListener('click',function(){next();});
  set(cur);
  return {el:el,set:set,next:next,get state(){return cur;}};
};
})();
