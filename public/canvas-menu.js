/* Sturij Canvas — grouped launcher menu with bobble-hover tiles.
   Collapses the long header row into four category buttons; each opens a
   subtle tile grid on the canvas. Tiles carry the Bobble Hover physics
   (swept-segment collision + velocity-injected springs), toned to the
   studio's light editorial surface. Clicking a tile fires the original
   header button, which stays in the DOM, hidden. */
(function(){
var $=function(id){return document.getElementById(id);};
var CATS=[
 ['Create',['cvSwatches','cvUpload','cvNote','cvText','cvPin']],
 ['Plan',['cvPlan','cvWall','cvRoom','cvFurn']],
 ['Library',['cvLib']],
 ['Deliver',['cvExport','cvInfo','cvTrade','cvPresent']]
];
var DIRECT=['cvLib']; /* single-item categories fire straight through */
var tr=document.querySelector('.top .tr');if(!tr)return;
/* hide grouped buttons; keep Clear + Studio + avatar visible */
var all=[];CATS.forEach(function(c){c[1].forEach(function(id){all.push(id);});});
all.forEach(function(id){var b=$(id);if(b)b.classList.add('grouped');});
/* insert category buttons before the first grouped button */
var anchor=$('cvSwatches');
CATS.forEach(function(c){
  var b=document.createElement('button');b.className='hbtn catbtn';b.dataset.cat=c[0];b.title=c[0];b.setAttribute('aria-label',c[0]);
  b.innerHTML='<span>'+c[0]+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:11px;height:11px"><path d="M6 9l6 6 6-6"/></svg>';
  b.onclick=function(e){e.stopPropagation();
    if(c[1].length===1&&DIRECT.indexOf(c[1][0])>=0){$(c[1][0]).click();return;}
    if(openCat===c[0]){closeGrid();return;}
    openGrid(c);};
  tr.insertBefore(b,anchor);
});

/* ---------- bobble tile grid ---------- */
var grid=null,openCat=null,tiles=[],raf=0,pmx=null,pmy=null,cmx=null,cmy=null,lastT=0;
function closeGrid(){
  if(!grid)return;
  var g=grid;grid=null;openCat=null;tiles=[];cancelAnimationFrame(raf);raf=0;
  document.querySelectorAll('.catbtn').forEach(function(q){q.classList.remove('on');});
  g.classList.remove('in');
  setTimeout(function(){g.remove();},220);
  document.removeEventListener('pointermove',onMove);
  document.removeEventListener('pointerdown',onDown,true);
}
function onDown(e){if(grid&&!grid.contains(e.target)&&!e.target.closest('.catbtn'))closeGrid();}
function onMove(e){cmx=e.clientX;cmy=e.clientY;}
/* swept-segment vs rect (slab clip) so a fast flick can't skip a tile */
function lineHit(x0,y0,x1,y1,r){
  var t0=0,t1=1;
  function slab(s,d,lo,hi){
    if(d===0)return s>=lo&&s<=hi;
    var a=(lo-s)/d,b=(hi-s)/d;if(a>b){var t=a;a=b;b=t;}
    if(a>t0)t0=a;if(b<t1)t1=b;return t0<=t1;}
  if(!slab(x0,x1-x0,r.left,r.right))return null;
  if(!slab(y0,y1-y0,r.top,r.bottom))return null;
  return t0;
}
function openGrid(c){
  closeGrid();
  openCat=c[0];
  document.querySelectorAll('.catbtn').forEach(function(q){q.classList.toggle('on',q.dataset.cat===c[0]);});
  grid=document.createElement('div');grid.className='bobgrid';
  var n=c[1].length,cols=n<=4?n:Math.ceil(n/2);
  grid.style.gridTemplateColumns='repeat('+cols+',1fr)';
  tiles=[];
  c[1].forEach(function(id,i){
    var src=$(id);if(!src)return;
    var t=document.createElement('button');t.className='bobtile';
    var svg=src.querySelector('svg'),label=(src.querySelector('span')||{}).textContent||src.title;
    t.innerHTML=(svg?svg.outerHTML:'')+'<b>'+label+'</b><i>'+String(i+1).padStart(2,'0')+'</i>';
    t.onclick=function(){closeGrid();setTimeout(function(){src.click();},60);};
    grid.appendChild(t);
    tiles.push({el:t,x:0,y:0,vx:0,vy:0,rot:0,vr:0,sx:1,sy:1,vsx:0,vsy:0,hit:false,rect:null});
  });
  document.body.appendChild(grid);
  requestAnimationFrame(function(){grid.classList.add('in');});
  pmx=pmy=cmx=cmy=null;lastT=performance.now();
  document.addEventListener('pointermove',onMove,{passive:true});
  document.addEventListener('pointerdown',onDown,true);
  raf=requestAnimationFrame(step);
}
var STIFF=200,DAMP=7,MAXV=4000,OFF=.4,SCL=.0006,STR=.0011,ROT=.02;
function step(now){
  if(!grid)return;
  var dt=Math.min((now-lastT)/1000,1/30)||1/60;lastT=now;
  var mx=cmx,my=cmy;
  if(mx!=null&&pmx!=null&&(mx!==pmx||my!==pmy)){
    var vx=(mx-pmx)/dt,vy=(my-pmy)/dt;
    vx=Math.max(-MAXV,Math.min(MAXV,vx));vy=Math.max(-MAXV,Math.min(MAXV,vy));
    var v=Math.min(Math.hypot(vx,vy),MAXV);
    tiles.forEach(function(t){
      if(!t.rect)t.rect=t.el.getBoundingClientRect();
      var e=lineHit(pmx,pmy,mx,my,t.rect);
      if(e!==null){
        if(!t.hit){
          t.el.style.transformOrigin=(50+50*vx/MAXV)+'% '+(50+50*vy/MAXV)+'%';
          var pop=v*SCL,stretch=(Math.abs(vx)-Math.abs(vy))*STR;
          t.vx+=vx*OFF;t.vy+=vy*OFF;t.vr+=vx*ROT;
          t.vsx+=pop+stretch;t.vsy+=pop-stretch;
        }
        t.hit=true;
      }else t.hit=false;
    });
  }
  pmx=mx;pmy=my;
  var decay=Math.exp(-DAMP*dt);
  tiles.forEach(function(t){
    t.vx+=-t.x*STIFF*dt;t.vy+=-t.y*STIFF*dt;t.vr+=-t.rot*STIFF*dt;
    t.vsx+=(1-t.sx)*STIFF*dt;t.vsy+=(1-t.sy)*STIFF*dt;
    t.vx*=decay;t.vy*=decay;t.vr*=decay;t.vsx*=decay;t.vsy*=decay;
    t.x+=t.vx*dt;t.y+=t.vy*dt;t.rot+=t.vr*dt;t.sx+=t.vsx*dt;t.sy+=t.vsy*dt;
    t.el.style.transform='translate('+t.x.toFixed(2)+'px,'+t.y.toFixed(2)+'px) rotate('+t.rot.toFixed(2)+'deg) scale('+t.sx.toFixed(3)+','+t.sy.toFixed(3)+')';
  });
  raf=requestAnimationFrame(step);
}
addEventListener('resize',function(){tiles.forEach(function(t){t.rect=null;});});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeGrid();});
})();
