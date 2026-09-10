/* Sturij Canvas — glass-mark screensaver.
   After a spell of inactivity the Sturij mark fades in as a slowly turning
   glass object (vanilla port of the GlassObject component: alpha-traced
   contours → extruded, bevelled geometry → MeshPhysicalMaterial transmission
   glass lit by a PMREM studio room with a gold ring light). Any pointer or
   key activity fades it away. three.js is imported lazily the first time the
   saver actually fires. Toggle lives in avatar → Background. */
(function(){
var KEY='sturij.canvas.saver';
var IDLE_MS=120000,enabled=false;
try{enabled=localStorage.getItem(KEY)==='1';}catch(e){}
var timer=null,active=false,inst=null,loading=false;

function resetTimer(){
  if(active)hide();
  clearTimeout(timer);
  if(enabled)timer=setTimeout(show,IDLE_MS);
}
['pointermove','pointerdown','keydown','wheel'].forEach(function(ev){
  document.addEventListener(ev,resetTimer,{passive:true});
});

window.SturijSaver={
  get enabled(){return enabled;},
  set:function(on){enabled=!!on;try{localStorage.setItem(KEY,on?'1':'0');}catch(e){}
    if(!on){hide();clearTimeout(timer);}else resetTimer();},
  preview:function(){if(enabled)show();}
};

function hide(){
  active=false;
  if(inst){var i=inst;inst=null;
    i.el.style.opacity='0';
    setTimeout(function(){i.destroy();},700);}
}
function show(){
  if(active||loading||document.hidden)return;
  active=true;loading=true;
  import('https://unpkg.com/three@0.165.0/build/three.module.js').then(function(THREE){
    loading=false;
    if(!active)return;
    inst=build(THREE);
    if(!inst)active=false;
  }).catch(function(){loading=false;active=false;});
}

/* ---- alpha tracing (marching squares → simplify → chaikin) ---- */
function traceMask(mask,w,h){
  var at=function(x,y){return x>=0&&y>=0&&x<w&&y<h&&mask[y*w+x]===1?1:0;};
  var segs=[];
  function T(x,y){return [x-.5,y-1];}function B(x,y){return [x-.5,y];}
  function L(x,y){return [x-1,y-.5];}function R(x,y){return [x,y-.5];}
  for(var cy=0;cy<=h;cy++)for(var cx=0;cx<=w;cx++){
    var c=at(cx-1,cy-1)*8+at(cx,cy-1)*4+at(cx,cy)*2+at(cx-1,cy);
    if(c===1)segs.push([L(cx,cy),B(cx,cy)]);else if(c===2)segs.push([B(cx,cy),R(cx,cy)]);
    else if(c===3)segs.push([L(cx,cy),R(cx,cy)]);else if(c===4)segs.push([T(cx,cy),R(cx,cy)]);
    else if(c===5){segs.push([L(cx,cy),T(cx,cy)]);segs.push([B(cx,cy),R(cx,cy)]);}
    else if(c===6)segs.push([T(cx,cy),B(cx,cy)]);else if(c===7)segs.push([L(cx,cy),T(cx,cy)]);
    else if(c===8)segs.push([L(cx,cy),T(cx,cy)]);else if(c===9)segs.push([T(cx,cy),B(cx,cy)]);
    else if(c===10){segs.push([T(cx,cy),R(cx,cy)]);segs.push([L(cx,cy),B(cx,cy)]);}
    else if(c===11)segs.push([T(cx,cy),R(cx,cy)]);else if(c===12)segs.push([L(cx,cy),R(cx,cy)]);
    else if(c===13)segs.push([B(cx,cy),R(cx,cy)]);else if(c===14)segs.push([L(cx,cy),B(cx,cy)]);
  }
  var key=function(p){return (Math.round(p[0]*2)+4)*8192+Math.round(p[1]*2)+4;};
  var adj={};
  segs.forEach(function(s,i){s.forEach(function(p){var k=key(p);(adj[k]=adj[k]||[]).push(i);});});
  var used=new Uint8Array(segs.length),loops=[];
  for(var s0=0;s0<segs.length;s0++){
    if(used[s0])continue;used[s0]=1;
    var loop=[segs[s0][0]],pt=segs[s0][1],sk=key(segs[s0][0]);
    while(key(pt)!==sk){
      loop.push(pt);
      var cands=adj[key(pt)]||[],nx=-1;
      for(var ci=0;ci<cands.length;ci++)if(!used[cands[ci]]){nx=cands[ci];break;}
      if(nx<0)break;used[nx]=1;
      pt=key(segs[nx][0])===key(pt)?segs[nx][1]:segs[nx][0];
    }
    if(loop.length>=4)loops.push(loop);
  }
  return loops;
}
function simplify(pts,eps){
  if(pts.length<6)return pts;
  var keep=new Uint8Array(pts.length);keep[0]=1;keep[pts.length-1]=1;
  var stack=[[0,pts.length-1]];
  while(stack.length){
    var seg=stack.pop(),lo=seg[0],hi=seg[1];
    var ax=pts[lo][0],ay=pts[lo][1],dx=pts[hi][0]-ax,dy=pts[hi][1]-ay;
    var len=Math.hypot(dx,dy)||1e-9,worst=-1,wd=eps;
    for(var i=lo+1;i<hi;i++){
      var d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/len;
      if(d>wd){wd=d;worst=i;}}
    if(worst>0){keep[worst]=1;stack.push([lo,worst],[worst,hi]);}
  }
  var out=[];for(var j=0;j<pts.length;j++)if(keep[j])out.push(pts[j]);
  return out;
}
function chaikin(pts,n){
  for(var it=0;it<n;it++){
    var nx=[];
    for(var i=0;i<pts.length;i++){
      var a=pts[i],b=pts[(i+1)%pts.length];
      nx.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);
    }
    pts=nx;
  }
  return pts;
}
function area(pts){var a=0;for(var i=0;i<pts.length;i++){var p=pts[i],q=pts[(i+1)%pts.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;}
function inside(loop,x,y){var v=false;for(var i=0,j=loop.length-1;i<loop.length;j=i++){var yi=loop[i][1],yj=loop[j][1],xi=loop[i][0],xj=loop[j][0];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)v=!v;}return v;}

function build(THREE){
  var el=document.createElement('canvas');
  el.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:200;pointer-events:none;opacity:0;transition:opacity .9s ease';
  document.body.appendChild(el);
  var renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:el,antialias:true,alpha:true});}catch(e){el.remove();return null;}
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(50,1,0.1,200);
  cam.position.set(0,-1,4).normalize().multiplyScalar(4.4);
  cam.lookAt(0,0,0);
  var float=new THREE.Group(),fit=new THREE.Group();
  float.add(fit);scene.add(float);
  var glass=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,transmission:1,roughness:.06,ior:1.7,clearcoat:1,clearcoatRoughness:.04,specularIntensity:1});
  glass.attenuationColor=new THREE.Color('#E8D9B0');glass.attenuationDistance=6;
  /* interior backdrop behind the mark — the glass needs a scene to refract.
     Designer's own picks (localStorage sturij-saver-rooms: array of image URLs/data-URLs,
     curated via their library) win; otherwise one of the Sturij rooms, random per wake. */
  var ROOMS=['brand/saver-room-1.jpg','brand/saver-room-2.jpg','brand/saver-room-3.jpg'];
  try{var own=JSON.parse(localStorage.getItem('sturij-saver-rooms')||'null');if(own&&own.length)ROOMS=own;}catch(e){/**/}
  var bgMat=new THREE.MeshBasicMaterial({color:0xEFEAE0});
  var bgPlane=new THREE.Mesh(new THREE.PlaneGeometry(46,46),bgMat);
  bgPlane.position.set(0,0,-8);scene.add(bgPlane);
  function loadRoom(){
    var url=ROOMS[Math.floor(Math.random()*ROOMS.length)];
    new THREE.TextureLoader().load(url,function(t){
      t.colorSpace=THREE.SRGBColorSpace;
      if(bgMat.map)bgMat.map.dispose();
      bgMat.map=t;bgMat.color.set(0xffffff);bgMat.needsUpdate=true;
      /* cover-fit the plane to the image aspect at its depth */
      var a=t.image.width/t.image.height,ph=30,pw=ph*a;
      if(pw<40){pw=40;ph=pw/a;}
      bgPlane.scale.set(pw/46,ph/46,1);
    });
  }
  loadRoom();
  if('dispersion' in glass)glass.dispersion=1.6;
  /* studio room: gray shell, gold ring light, white formers */
  var room=new THREE.Scene(),grp=new THREE.Group();grp.position.y=-.5;room.add(grp);
  var box=new THREE.BoxGeometry();
  var shell=new THREE.Mesh(box,new THREE.MeshStandardMaterial({color:0x808080,side:THREE.BackSide}));
  shell.position.set(0,13.2,0);shell.scale.set(31.5,28.5,31.5);grp.add(shell);
  var ring=new THREE.Mesh(new THREE.RingGeometry(.5,1,64),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false}));
  ring.material.color.set('#D4A01B').multiplyScalar(15);
  ring.position.set(2,3,-2);ring.scale.set(10,10,10);ring.lookAt(0,0,0);grp.add(ring);
  [[[-14,10,8],[.1,2.5,2.5],80],[[14,12,0],[.1,5,5],23],[[0,9,14],[5,5,.1],16],[[0,15,0],[10,1,10],20]].forEach(function(f){
    var m=new THREE.Mesh(box,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false}));
    m.material.color.set('#ffffff').multiplyScalar(f[2]);
    m.position.set(f[0][0],f[0][1],f[0][2]);m.scale.set(f[1][0],f[1][1],f[1][2]);grp.add(m);
    var l=new THREE.PointLight(0xffffff,100,28,2);l.position.copy(m.position);grp.add(l);
  });
  var pmrem=new THREE.PMREMGenerator(renderer);
  var env=pmrem.fromScene(room,.6,.1,1000);
  scene.environment=env.texture;
  /* trace the mark */
  var img=new Image();
  img.onload=function(){
    var W=512,r=Math.min(1,W/Math.max(img.width,img.height));
    var cw=Math.max(1,Math.round(img.width*r)),ch=Math.max(1,Math.round(img.height*r));
    var cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
    var x2=cv.getContext('2d');x2.drawImage(img,0,0,cw,ch);
    var d=x2.getImageData(0,0,cw,ch),mask=new Uint8Array(cw*ch);
    for(var i=0;i<cw*ch;i++)mask[i]=d.data[i*4+3]>=64?1:0;
    var loops=[];
    traceMask(mask,cw,ch).forEach(function(rl){
      var lp=chaikin(simplify(rl,.8),3);
      if(Math.abs(area(lp))>40)loops.push(lp);
    });
    if(!loops.length)return;
    loops.sort(function(a,b){return Math.abs(area(b))-Math.abs(area(a));});
    loops=loops.slice(0,48);
    var depths=loops.map(function(lp,i){var c=0;loops.forEach(function(o,j){if(j!==i&&inside(o,lp[0][0],lp[0][1]))c++;});return c;});
    var shapes=[],owners=[];
    loops.forEach(function(lp,i){
      if(depths[i]%2!==0)return;
      var sh=new THREE.Shape(lp.map(function(p){return new THREE.Vector2(p[0],p[1]);}));
      shapes.push(sh);owners.push({loop:lp,area:Math.abs(area(lp)),shape:sh});
    });
    loops.forEach(function(lp,i){
      if(depths[i]%2===0)return;
      var own=null;
      owners.forEach(function(o){if(inside(o.loop,lp[0][0],lp[0][1])&&(!own||o.area<own.area))own=o;});
      if(own)own.shape.holes.push(new THREE.Path(lp.map(function(p){return new THREE.Vector2(p[0],p[1]);})));
    });
    var size2d=Math.max(cw,ch),depthU=.055*size2d,bev=depthU*.32;
    var geo=new THREE.ExtrudeGeometry(shapes,{depth:Math.max(depthU-bev*2,depthU*.1),bevelEnabled:true,bevelThickness:bev,bevelSize:bev*.9,bevelSegments:8,curveSegments:16});
    geo.rotateX(Math.PI);
    var mesh=new THREE.Mesh(geo,glass);
    var b3=new THREE.Box3().setFromObject(mesh),sz=b3.getSize(new THREE.Vector3()),cen=b3.getCenter(new THREE.Vector3());
    mesh.position.sub(cen);
    var maxDim=Math.max(sz.x,sz.y,sz.z,1e-4);
    fit.scale.setScalar(2.8/maxDim);
    glass.thickness=4/fit.scale.x;
    fit.add(mesh);
    el.style.opacity='1';
  };
  img.src='brand/sturij-mark-white.png';
  var elapsed=Math.random()*100,last=0,raf=0,dead=false;
  var rm=matchMedia('(prefers-reduced-motion: reduce)');
  function size(){var w=Math.max(el.clientWidth,1),h=Math.max(el.clientHeight,1);
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  size();addEventListener('resize',size);
  function tick(t){
    if(dead)return;
    var dt=last?Math.min((t-last)/1000,.1):0;last=t;
    if(!rm.matches){
      elapsed+=dt;
      float.rotation.y+=dt*.12;               /* the slow turntable */
      float.rotation.x=Math.cos(elapsed/4)/10;
      float.rotation.z=Math.sin(elapsed/4)/24;
      float.position.y=Math.sin(elapsed/1.5)/10;
    }
    renderer.render(scene,cam);
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  return {el:el,destroy:function(){
    dead=true;cancelAnimationFrame(raf);removeEventListener('resize',size);
    env.dispose();pmrem.dispose();
    bgPlane.geometry.dispose();if(bgMat.map)bgMat.map.dispose();bgMat.dispose();
    fit.traverse(function(n){if(n.geometry)n.geometry.dispose();});
    glass.dispose();renderer.dispose();el.remove();
  }};
}
resetTimer();
})();
