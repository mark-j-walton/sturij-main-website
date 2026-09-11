/* bobble.js — Bobble Hover (Motion+ example port, vanilla). LIB.
   window.SturijBobble(tiles, opts?) → {destroy} — attach to any set of tile elements
   (swatches, gallery thumbs, nav discs). Sweeps the pointer's per-frame segment against
   each tile (slab clip), so fast flicks never skip a tile; on crossing, injects the sweep
   velocity into springs on x/y/rotate/scaleX/scaleY (200/7 default — visible overshoot),
   with a volume-preserving stretch along the axis of travel and the transform origin
   pinned toward the leading edge so the stretch trails a tail. Touch-friendly.
   opts: {offsetFactor=.8, scaleFactor=.0008, stretchFactor=.0015, rotateFactor=.03,
          maxSpeed=4000, stiffness=200, damping=7} */
(function(){
var RED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function clamp(lo,hi,v){return v<lo?lo:v>hi?hi:v;}
window.SturijBobble=function(tiles,opts){
  if(RED)return {destroy:function(){}};
  opts=opts||{};
  var OF=opts.offsetFactor!=null?opts.offsetFactor:.8,
      SF=opts.scaleFactor!=null?opts.scaleFactor:.0008,
      TF=opts.stretchFactor!=null?opts.stretchFactor:.0015,
      RF=opts.rotateFactor!=null?opts.rotateFactor:.03,
      MS=opts.maxSpeed||4000,
      K=opts.stiffness||200, D=opts.damping||7;
  var list=[].slice.call(tiles).map(function(el){
    el.style.willChange='transform';
    return {el:el,rect:null,wasHit:false,
      // spring states: [value, velocity, rest]
      s:{x:[0,0,0],y:[0,0,0],r:[0,0,0],sx:[1,0,1],sy:[1,0,1]},
      ox:.5,oy:.5,active:false};
  });
  var px=null,py=null,cx=null,cy=null,raf=0,lastT=performance.now(),moveT=lastT;
  function measure(){list.forEach(function(t){t.rect=t.el.getBoundingClientRect();});}
  measure();
  addEventListener('resize',measure);addEventListener('scroll',measure,true);
  function slab(start,delta,lo,hi,span){
    if(delta===0)return start>=lo&&start<=hi;
    var e=(lo-start)/delta,x=(hi-start)/delta,tmp;
    if(e>x){tmp=e;e=x;x=tmp;}
    if(e>span.t0)span.t0=e;if(x<span.t1)span.t1=x;
    return span.t0<=span.t1;
  }
  function lineHit(x0,y0,x1,y1,r){
    var span={t0:0,t1:1};
    if(!slab(x0,x1-x0,r.left,r.right,span))return null;
    if(!slab(y0,y1-y0,r.top,r.bottom,span))return null;
    return span.t0;
  }
  function onMove(e){
    if(cx==null){cx=e.clientX;cy=e.clientY;px=cx;py=cy;return;}
    px=cx;py=cy;cx=e.clientX;cy=e.clientY;
    var nowT=performance.now(),dt=Math.max(1,nowT-moveT)/1000;moveT=nowT;
    var vx=clamp(-MS,MS,(cx-px)/dt),vy=clamp(-MS,MS,(cy-py)/dt);
    var v=Math.min(Math.hypot(vx,vy),MS);
    list.forEach(function(t){
      if(!t.rect)return;
      var entry=lineHit(px,py,cx,cy,t.rect);
      if(entry!==null){
        if(!t.wasHit){
          t.ox=.5+(.5*vx)/MS;t.oy=.5+(.5*vy)/MS;
          var pop=v*SF,str=(Math.abs(vx)-Math.abs(vy))*TF;
          t.s.x[1]+=vx*OF;t.s.y[1]+=vy*OF;t.s.r[1]+=vx*RF;
          t.s.sx[1]+=pop+str;t.s.sy[1]+=pop-str;
          t.active=true;
        }
        t.wasHit=true;
      }else t.wasHit=false;
    });
    if(!raf)raf=requestAnimationFrame(tick);
  }
  function onLeave(){cx=cy=px=py=null;}
  function step(sv,dt){
    // semi-implicit Euler spring toward rest
    var a=-K*(sv[0]-sv[2])-D*sv[1];
    sv[1]+=a*dt;sv[0]+=sv[1]*dt;
    return Math.abs(sv[0]-sv[2])>.001||Math.abs(sv[1])>.001;
  }
  function tick(now){
    var dt=Math.min(.05,(now-lastT)/1000)||.016;lastT=now;
    var any=false;
    list.forEach(function(t){
      if(!t.active)return;
      var s=t.s,live=false;
      ['x','y','r','sx','sy'].forEach(function(k){if(step(s[k],dt))live=true;});
      t.el.style.transformOrigin=(t.ox*100)+'% '+(t.oy*100)+'%';
      t.el.style.transform='translate('+s.x[0].toFixed(2)+'px,'+s.y[0].toFixed(2)+'px) rotate('+s.r[0].toFixed(2)+'deg) scale('+s.sx[0].toFixed(3)+','+s.sy[0].toFixed(3)+')';
      if(!live){t.active=false;t.el.style.transform='';t.el.style.transformOrigin='';}
      else any=true;
    });
    raf=any?requestAnimationFrame(tick):0;
  }
  addEventListener('pointermove',onMove,{passive:true});
  document.documentElement.addEventListener('pointerleave',onLeave);
  lastT=performance.now();
  return {destroy:function(){cancelAnimationFrame(raf);removeEventListener('pointermove',onMove);removeEventListener('resize',measure);removeEventListener('scroll',measure,true);}};
};
})();
