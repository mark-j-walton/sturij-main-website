/* cursor.js — custom cursor with zone captions (Motion+ Cursor port). LIB.
   window.SturijCursor({labels:{zoneName:'Caption'}}) → {destroy}. A small gold dot
   spring-follows the pointer; over any element with data-cursor-zone="zoneName" it
   swells into an ink pill carrying that zone's caption. Hides on touch devices and
   leaves the native cursor visible unless a zone hides it (data-cursor-hide). */
(function(){
var st=document.createElement('style');
st.textContent=
'.scur{position:fixed;left:0;top:0;z-index:2147483100;pointer-events:none;display:flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:100px;background:#D4A01B;box-shadow:0 1px 4px rgba(35,31,27,.3);transform:translate(-50%,-50%);transition:width .25s cubic-bezier(.22,1,.36,1),height .25s cubic-bezier(.22,1,.36,1),background .2s;overflow:hidden;white-space:nowrap}'+
'.scur.zone{width:auto;height:auto;padding:9px 14px;background:#231F1B}'+
'.scur .cap{font:600 10px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#FAF8F2;opacity:0;transition:opacity .2s}'+
'.scur.zone .cap{opacity:1}'+
'[data-cursor-hide]{cursor:none}';
document.head.appendChild(st);
window.SturijCursor=function(cfg){
  cfg=cfg||{};
  if(matchMedia('(pointer: coarse)').matches)return {destroy:function(){}};
  var c=document.createElement('div');c.className='scur';
  c.innerHTML='<span class="cap"></span>';
  var cap=c.querySelector('.cap');
  document.body.appendChild(c);
  var tx=-100,ty=-100,x=tx,y=ty,raf=0,zone=null;
  function tick(){
    x+=(tx-x)*.22;y+=(ty-y)*.22;
    c.style.left=x+'px';c.style.top=y+'px';
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  function onMove(e){
    tx=e.clientX;ty=e.clientY;
    var zEl=e.target&&e.target.closest?e.target.closest('[data-cursor-zone]'):null;
    var z=zEl?zEl.getAttribute('data-cursor-zone'):null;
    if(z!==zone){
      zone=z;
      var label=z&&cfg.labels&&cfg.labels[z];
      if(label){cap.textContent=label;c.classList.add('zone');}
      else c.classList.remove('zone');
    }
  }
  function onLeave(){tx=-100;ty=-100;}
  addEventListener('pointermove',onMove,{passive:true});
  document.documentElement.addEventListener('pointerleave',onLeave);
  return {destroy:function(){cancelAnimationFrame(raf);removeEventListener('pointermove',onMove);c.remove();}};
};
})();
