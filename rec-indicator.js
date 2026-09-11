/* rec-indicator.js — always-visible recording pill.
   Any recorder calls SturijRec.show('Voice search') / SturijRec.hide().
   Fixed bottom-centre (thumb-reach on a phone), above everything: pulsing clay dot,
   label, and the spring progress bar as a live level/elapsed strip. */
(function(){
var st=document.createElement('style');
st.textContent=
'.srec{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%) translateY(80px);z-index:700;display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:999px;background:#1D1D1D;color:#FDFCF8;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:transform .35s cubic-bezier(.22,1,.36,1);pointer-events:none}'+
'.srec.on{transform:translateX(-50%) translateY(0)}'+
'.srec .dot{width:9px;height:9px;border-radius:50%;background:#c96a4a;box-shadow:0 0 10px rgba(201,106,74,.7);animation:srecp 1.2s infinite}'+
'@keyframes srecp{0%,100%{opacity:1}50%{opacity:.35}}'+
'.srec .well{width:90px;height:5px;border-radius:99px;background:rgba(250,248,243,.18);overflow:hidden}'+
'.srec .fill{height:100%;background:linear-gradient(90deg,#E4B32E,#D4A01B);border-radius:99px;transform-origin:0 50%;transform:scaleX(0)}'+
'@media (max-width:700px){.srec{width:calc(100vw - 48px);justify-content:center}}';
document.head.appendChild(st);
var el=null,raf=0,t0=0,cur=0,shown=0;
window.SturijRec={
  _x:0,show:function(label,seconds){document.body.classList.add('sturij-rec'); /* seconds: expected max (default 30 for one-shot; 0 = open-ended elapsed sweep) */
    if(!el){el=document.createElement('div');el.className='srec';
      el.innerHTML='<span class="dot"></span><span class="lbl"></span><span class="well"><span class="fill"></span></span>';
      document.body.appendChild(el);}
    el.querySelector('.lbl').textContent=label||'Recording';
    requestAnimationFrame(function(){el.classList.add('on');});
    t0=performance.now();cur=0;shown=0;
    var max=(seconds===0)?0:(seconds||30)*1000;
    cancelAnimationFrame(raf);
    var fill=el.querySelector('.fill');
    (function tick(){
      var e=performance.now()-t0;
      cur=max?Math.min(1,e/max):((e/1000)%3)/3; /* open-ended: 3s sweep */
      shown+=(cur-shown)*.12;
      fill.style.transform='scaleX('+shown.toFixed(4)+')';
      raf=requestAnimationFrame(tick);
    })();
  },
  hide:function(){document.body.classList.remove('sturij-rec');
    if(!el)return;cancelAnimationFrame(raf);
    el.classList.remove('on');
  }
};
})();
