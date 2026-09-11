/* compare-reveal.js — before/after reveal slider (Motion+ ImageRevealSlider port).
   Select TWO photo cards on the canvas → ⌘K → "Compare selected photos" (or one photo → colour vs mono).
   window.openCompare(srcA, srcB?) for future use (version comparisons, wall renders). */
(function(){
var st=document.createElement('style');
st.textContent=
'.cmpov{position:fixed;inset:0;z-index:520;display:flex;align-items:center;justify-content:center}'+
'.cmpbk{position:absolute;inset:0;background:rgba(29,26,23,.5)}'+
'.cmpcard{position:relative;background:#FDFCF8;border-radius:16px;padding:16px;box-shadow:0 24px 70px rgba(35,31,27,.35)}'+
'.cmpbox{position:relative;width:min(760px,80vw);aspect-ratio:4/3;max-height:70vh;border-radius:12px;overflow:hidden;box-shadow:inset 0 1px 4px rgba(35,31,27,.2)}'+
'.cmpbox img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}'+
'.cmpline{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#FDFCF8;cursor:grab;touch-action:none;filter:drop-shadow(2px 0 3px rgba(0,0,0,.4))}'+
'.cmphandle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:#FDFCF8;color:#1D1D1D;display:flex;align-items:center;justify-content:center;cursor:grab;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.2),0 4px 12px rgba(35,31,27,.3)}'+
'.cmphandle:active{cursor:grabbing}'+
'.cmpx{all:unset;position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:50%;background:#FDFCF8;color:rgba(98,88,79,.8);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:3;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16),0 1px 3px rgba(35,31,27,.14)}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion&&!document.body.classList.contains('rmotion')){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
window.openCompare=function(a,b){
  var ov=document.createElement('div');ov.className='cmpov';
  ov.innerHTML='<div class="cmpbk"></div><div class="cmpcard">'
   +'<button class="cmpx"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M10.5 1.4L1.4 10.5M10.5 10.5L1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>'
   +'<div class="cmpbox"><img src="'+a+'"><img class="cmptop" src="'+(b||a)+'" style="'+(b?'':'filter:grayscale(100%)')+'">'
   +'<div class="cmpline"><div class="cmphandle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 8 4 4-4 4"/><path d="m6 8-4 4 4 4"/></svg></div></div></div></div>';
  document.body.appendChild(ov);
  var box=ov.querySelector('.cmpbox'),top=ov.querySelector('.cmptop'),line=ov.querySelector('.cmpline');
  function close(){ov.remove();document.removeEventListener('keydown',keys);}
  ov.querySelector('.cmpbk').onclick=close;ov.querySelector('.cmpx').onclick=close;
  anim(ov.querySelector('.cmpcard'),{opacity:[0,1],scale:[.96,1],y:[-12,0]},{type:'spring',stiffness:500,damping:35});
  var pos=.5;
  function apply(){
    pos=Math.max(0,Math.min(1,pos));
    top.style.clipPath='inset(0 0 0 '+(pos*100)+'%)';
    line.style.left=(pos*100)+'%';
    var edge=Math.min(pos,1-pos);
    line.style.opacity=Math.max(0,Math.min(1,edge/0.06));
  }
  apply();
  line.addEventListener('pointerdown',function(e){
    e.preventDefault();line.setPointerCapture(e.pointerId);
    function mv(ev){var r=box.getBoundingClientRect();pos=(ev.clientX-r.left)/r.width;apply();}
    function up(){window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);}
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  });
  function keys(e){
    if(e.key==='Escape'){close();return;}
    if(e.key==='ArrowLeft'){pos-=.08;apply();}
    if(e.key==='ArrowRight'){pos+=.08;apply();}
  }
  document.addEventListener('keydown',keys);
};
function selPhotos(){
  return [].map.call(document.querySelectorAll('.citem.img.sel .inner img'),function(i){return i.src;});
}
addEventListener('DOMContentLoaded',function(){
  if(window.SturijCommands)window.SturijCommands.push({group:'Create',label:'Compare selected photos',keywords:['before','after','reveal','slider','versions'],
    run:function(){
      var s=selPhotos();
      if(!s.length)return;
      window.openCompare(s[0],s[1]||null);
    }});
});
})();
