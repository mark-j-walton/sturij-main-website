/* hero-stagger.js — hero entrance + ambient glows (Motion hero-stagger port). LIB.
   window.SturijStagger(container, {interval=0.1, offsetY=40}) — animates the container's
   direct children in sequence: rise from offsetY with blur(4px)→0 on a 120/20 spring.
   window.SturijGlow(host, {colors?}) — two soft warm radial glows drifting on
   prime-number loops (23/19s and 17/29s) so the pattern never repeats; mix-blend screen.
   Both respect prefers-reduced-motion. */
(function(){
var RED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
window.SturijStagger=function(container,opts){
  opts=opts||{};var iv=(opts.interval||0.1),oy=(opts.offsetY==null?40:opts.offsetY);
  var kids=[].slice.call(container.children);
  kids.forEach(function(k,i){
    if(RED)return;
    k.style.opacity='0';
    setTimeout(function(){
      anim(k,{opacity:[0,1],transform:['translateY('+oy+'px)','translateY(0px)'],filter:['blur(4px)','blur(0px)']},{type:'spring',stiffness:120,damping:20})||0;
      k.style.opacity='1';k.style.transform='none';k.style.filter='none';
    },i*iv*1000);
  });
};
window.SturijGlow=function(host,opts){
  opts=opts||{};
  var cols=opts.colors||['rgba(212,160,27,.14)','rgba(122,141,110,.12)'];
  var kf=[[[0,60,-40,20,0],[0,-30,50,-20,0],23,19],[[0,-50,30,-60,0],[0,40,-30,50,0],17,29]];
  cols.slice(0,2).forEach(function(c,i){
    var g=document.createElement('div');
    g.style.cssText='position:absolute;border-radius:50%;filter:blur(10px);mix-blend-mode:screen;pointer-events:none;z-index:1;'+
      (i===0?'top:35%;left:45%;width:500px;height:300px;':'top:20%;left:30%;width:400px;height:250px;')+
      'transform:translate(-50%,-50%);background:radial-gradient(ellipse at center,'+c+' 0%,transparent 70%);opacity:0';
    host.appendChild(g);
    anim(g,{opacity:[0,1]},{duration:1.2+i*.2,ease:'easeOut'});g.style.opacity=1;
    if(!RED){
      var k=kf[i];
      anim(g,{x:k[0]},{duration:k[2],repeat:Infinity,ease:'easeInOut'});
      anim(g,{y:k[1]},{duration:k[3],repeat:Infinity,ease:'easeInOut'});
    }
  });
};
})();
