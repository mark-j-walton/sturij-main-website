/* progress-bar.js — progress components (Motion progress bar + Radix ring ports).
   window.SturijProgress(hostEl) → {set(0..1), done()} — spring-smoothed gold bar.
   window.SturijProgressRing(hostEl,{size?}) → {set(0..1), done()} — circular ring:
   gold arc draws round a bronze track while the centre number counts up, sharpening
   from blur(10px)/scale .5 as it goes. LIB — not yet mounted. */
(function(){
var st=document.createElement('style');
st.textContent=
'.sprog{width:100%;max-width:300px;height:8px;background:rgba(98,88,79,.18);border-radius:20px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(35,31,27,.14)}'+
'.sprog .bar{height:100%;width:100%;background:linear-gradient(90deg,#E4B32E,#D4A01B);border-radius:20px;transform-origin:0 50%;transform:scaleX(0);will-change:transform}'+
'.sprogr{position:relative}'+
'.sprogr svg{width:100%;height:100%;display:block}'+
'.sprogr .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 34% "Cormorant Garamond",Georgia,serif;color:#1D1D1D;will-change:filter,transform,opacity}';
document.head.appendChild(st);
window.SturijProgress=function(host){
  var w=document.createElement('div');w.className='sprog';
  w.innerHTML='<div class="bar"></div>';
  host.appendChild(w);
  var bar=w.firstChild,cur=0,shown=0,raf=0;
  (function tick(){shown+=(cur-shown)*.12;bar.style.transform='scaleX('+shown.toFixed(4)+')';raf=requestAnimationFrame(tick);})();
  return {
    el:w,
    set:function(v){cur=Math.max(0,Math.min(1,v));},
    done:function(){cur=1;setTimeout(function(){cancelAnimationFrame(raf);},800);}
  };
};
window.SturijProgressRing=function(host,opts){
  opts=opts||{};var size=opts.size||160;
  var w=document.createElement('div');w.className='sprogr';
  w.style.width=size+'px';w.style.height=size+'px';
  var C=2*Math.PI*40;
  w.innerHTML='<svg viewBox="0 0 100 100"><path d="M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10" fill="none" stroke="rgba(98,88,79,.18)" stroke-width="8"/><path class="arc" d="M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10" fill="none" stroke="#D4A01B" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'"/></svg><div class="num" style="font-size:'+Math.round(size*.34)+'px">0</div>';
  host.appendChild(w);
  var arc=w.querySelector('.arc'),num=w.querySelector('.num'),cur=0,shown=0,raf=0;
  (function tick(){
    shown+=(cur-shown)*.1;
    arc.setAttribute('stroke-dashoffset',String(C*(1-shown)));
    arc.setAttribute('stroke-linecap',shown<=0.002?'butt':'round');
    num.textContent=Math.round(shown*100);
    num.style.filter='blur('+(10*(1-shown))+'px)';
    num.style.transform='scale('+(0.5+0.5*shown)+')';
    num.style.opacity=String(0.5+0.5*shown);
    raf=requestAnimationFrame(tick);
  })();
  return {
    el:w,
    set:function(v){cur=Math.max(0,Math.min(1,v));},
    done:function(){cur=1;setTimeout(function(){cancelAnimationFrame(raf);},1200);}
  };
};
})();
