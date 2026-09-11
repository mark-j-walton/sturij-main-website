/* confetti.js — GPU confetti (Motion+ Confetti port; physics after canvas-confetti, ISC, Kiril Vatev).
   window.SturijConfetti.burst(x, y, opts?) anywhere on any page. Sturij colours by default. */
(function(){
var COLORS=['#D4A01B','#E4B32E','#7A8B7F','#B98A4A','#9DB5AF','#8a3b2e','#F7E9A8'];
var SHAPES=['circle','rect','rect','strip','strip'];
var STEPS=40,SCALE_F=.08;
function enabled(){return localStorage.getItem('sturij.celebrate')==='on';} /* admin: off by default */
window.setCelebrate=function(on){localStorage.setItem('sturij.celebrate',on?'on':'off');mountTrigger();};
function keyframes(p){
  var transform=[],opacity=[];
  var velocity=p.startVelocity,x=0,y=0,wobble=p.wobbleOffset,tick=0;
  for(var step=0;step<=STEPS;step++){
    var t=step/STEPS;
    if(step>0){
      var target=Math.round(step*p.ticks/STEPS);
      while(tick<target){
        x+=Math.cos(p.angle)*velocity+p.drift;
        y+=Math.sin(p.angle)*velocity+p.gravity*3;
        velocity*=p.decay;wobble+=p.wobbleSpeed;tick++;
      }
    }
    var wx=step===0?0:x+Math.cos(wobble)*15*p.size,wy=y;
    var scale;
    if(t<SCALE_F*.6)scale=(t/(SCALE_F*.6))*1.15;
    else if(t<SCALE_F){var st=(t-SCALE_F*.6)/(SCALE_F*.4);scale=1.15-st*.15;}
    else scale=1;
    var rotY=p.tiltRotations*360*t,op;
    if(t<=.5)op=1;else if(t<=.8)op=1-((t-.5)/.3)*.5;else op=.5-((t-.8)/.2)*.5;
    transform.push('translate('+wx.toFixed(1)+'px,'+wy.toFixed(1)+'px) scale('+scale.toFixed(3)+') rotateY('+rotY.toFixed(1)+'deg) rotate('+p.rotation.toFixed(1)+'deg)');
    opacity.push(op);
  }
  return {transform:transform,opacity:opacity};
}
window.SturijConfetti={
  burst:function(cx,cy,opts){
    opts=opts||{};
    if(!enabled()&&!opts.force)return;
    var count=opts.particleCount||46,dur=opts.duration||2.2,size=opts.size||1;
    var cols=opts.colors||COLORS,ticks=Math.round(dur*60);
    var layer=document.createElement('div');
    layer.style.cssText='position:fixed;left:'+cx+'px;top:'+cy+'px;pointer-events:none;z-index:10000';
    document.body.appendChild(layer);
    for(var i=0;i<count;i++){
      var radSpread=(opts.spread||100)*Math.PI/180;
      var angle=-Math.PI/2+(.5*radSpread-Math.random()*radSpread);
      var vel=(opts.startVelocity||22)*.5+Math.random()*(opts.startVelocity||22);
      var pieceSize=6*size+Math.random()*6*size;
      var shape=SHAPES[Math.floor(Math.random()*SHAPES.length)];
      var w=shape==='strip'?pieceSize*.3:shape==='rect'?pieceSize*.7:pieceSize;
      var h=shape==='strip'?pieceSize*2:pieceSize;
      var d=document.createElement('div');
      d.style.cssText='position:absolute;width:'+w+'px;height:'+h+'px;border-radius:'+(shape==='circle'?'50%':(shape==='strip'?pieceSize*.12+'px':'2px'))
        +';background:'+cols[Math.floor(Math.random()*cols.length)]+';will-change:transform,opacity;pointer-events:none';
      layer.appendChild(d);
      var kf=keyframes({angle:angle,startVelocity:vel,decay:opts.decay||.91,gravity:opts.gravity||1,drift:opts.drift||0,
        wobbleSpeed:Math.min(.11,Math.random()*.1+.05),wobbleOffset:Math.random()*10,size:size,ticks:ticks,
        tiltRotations:2+Math.random()*4,rotation:Math.random()*360});
      if(window.Motion){try{Motion.animate(d,kf,{duration:dur,ease:'linear'});}catch(_){/**/}}
    }
    setTimeout(function(){layer.remove();},(dur+.5)*1000);
  }
};
/* clickable happy-moment trigger — studio & creative only, admin-gated */
function mountTrigger(){
  var old=document.getElementById('celebtn');if(old)old.remove();
  var page=(location.pathname.split('/').pop()||'');
  if(!enabled()||!(page==='studio.html'||page==='creative.html'))return;
  var b=document.createElement('button');b.id='celebtn';b.title='Celebrate';
  b.style.cssText='all:unset;position:fixed;left:20px;bottom:20px;z-index:240;width:40px;height:40px;border-radius:50%;background:#FDFCF8;color:#D4A01B;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16),0 4px 12px rgba(35,31,27,.2)';
  b.innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>';
  b.onclick=function(){
    var r=b.getBoundingClientRect();
    window.SturijConfetti.burst(r.left+r.width/2,r.top,{particleCount:60,startVelocity:26});
    if(window.Motion){try{Motion.animate(b,{scale:[.9,1]},{type:'spring',stiffness:400,damping:15});}catch(_){/**/}}
  };
  document.body.appendChild(b);
}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',mountTrigger);else mountTrigger();
/* admin toggle via the command palette on every page */
function reg(){
  if(!window.SturijCommands)return setTimeout(reg,500);
  window.SturijCommands.push({group:'Settings',label:'Celebrations on / off',keywords:['confetti','celebrate','admin','toggle'],
    run:function(){window.setCelebrate(!enabled());}});
}
reg();
})();
