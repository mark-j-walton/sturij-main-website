/* ===== Pairing Studio · 3D intro layer =====
   A cinematic Three.js welcome: a realistically-furnished room vignette takes
   shape while material swatch cards drift around it. "Enter the Studio" flies
   the camera in and hands over to the app. Shows once per browser session;
   skipped for shared scheme links (#hash), reduced-motion users, and whenever
   WebGL is missing — the overlay's own buttons keep working without the 3D
   layer. 'three' resolves via the import map declared in studio.html. */

import * as THREE from 'three';
import {RoomEnvironment} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

(function(){
  var layer=document.getElementById('intro3d');
  if(!layer||layer.classList.contains('gone'))return;

  /* ---------- palette (brand + maker-inspired tones) ---------- */
  var GOLD=0xD4A01B,NAVY=0x1D1D1D,BRASS=0xB08D3E;
  var PAINTS=['#9BA88D','#7C8F84','#B55A45','#C7A25E','#8A9BA8','#5E6B5B','#D9CDBA','#C3B091','#B0A695','#42504A','#DBC9A9','#8F9779','#C2A878','#6E7F8D','#A98F79','#4A5D4E'];
  var WOODS=[['#8A6F52','#6E5640'],['#A98F6F','#8C755A'],['#62584F','#4E463F'],['#C2A878','#A78D5F']];

  var scene,camera,renderer,root,swatches=[],sparkles,goldLight,raf=0,t0=0,leaving=false,leaveT=0;
  var mx=0,my=0,tmx=0,tmy=0;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- procedural textures ---------- */
  function grain(g,tone,n,w,h){
    for(var i=0;i<n;i++){
      g.strokeStyle=tone;g.globalAlpha=.05+Math.random()*.12;g.lineWidth=.6+Math.random()*1.6;
      g.beginPath();var x=Math.random()*w;g.moveTo(x,-10);
      for(var y=0;y<=h+10;y+=18)g.lineTo(x+Math.sin((y+i*31)*.02)*6+(Math.random()-.5)*3,y);
      g.stroke();
    }
    g.globalAlpha=1;
  }
  function tex(c){var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  function woodCanvas(base,tone,s){
    var c=document.createElement('canvas');c.width=c.height=s||256;var g=c.getContext('2d');
    g.fillStyle=base;g.fillRect(0,0,c.width,c.height);grain(g,tone,46,c.width,c.height);
    return c;
  }
  /* plank floor: vertical boards with seams, per-board tone shift and grain */
  function plankTexture(){
    var c=document.createElement('canvas');c.width=c.height=512;var g=c.getContext('2d');
    var boards=6,bw=c.width/boards;
    for(var b=0;b<boards;b++){
      var l=.92+Math.sin(b*12.9)*.08;
      g.fillStyle='rgba('+Math.round(169*l)+','+Math.round(143*l)+','+Math.round(111*l)+',1)';
      g.fillRect(b*bw,0,bw,c.height);
      g.save();g.beginPath();g.rect(b*bw,0,bw,c.height);g.clip();
      g.translate(b*bw,0);grain(g,'#8C755A',14,bw,c.height);g.restore();
      g.fillStyle='rgba(60,48,38,.55)';g.fillRect(b*bw,0,2,c.height);
      /* board end-joints */
      var jy=((b*197)%512);g.fillStyle='rgba(60,48,38,.4)';g.fillRect(b*bw,jy,bw,2);
    }
    var t=tex(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
  }
  /* honed stone: dark base with light speckle and faint veins */
  function stoneTexture(){
    var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');
    g.fillStyle='#3A3833';g.fillRect(0,0,256,256);
    for(var i=0;i<2600;i++){
      g.fillStyle=Math.random()<.5?'rgba(220,215,205,.10)':'rgba(0,0,0,.12)';
      g.fillRect(Math.random()*256,Math.random()*256,1.2,1.2);
    }
    for(var v=0;v<5;v++){
      g.strokeStyle='rgba(210,205,195,.09)';g.lineWidth=1;g.beginPath();
      var x=Math.random()*256;g.moveTo(x,0);
      for(var y=0;y<=256;y+=16)g.lineTo(x+Math.sin(y*.05+v*9)*10+(Math.random()-.5)*4,y);
      g.stroke();
    }
    return tex(c);
  }
  function paintMat(hex){return new THREE.MeshStandardMaterial({color:hex,roughness:.94,metalness:0});}
  function woodMat(pair,s){
    var c=woodCanvas(pair[0],pair[1],s);
    return new THREE.MeshStandardMaterial({map:tex(c),bumpMap:new THREE.CanvasTexture(c),bumpScale:.012,roughness:.62,metalness:.04});
  }
  function brassMat(){return new THREE.MeshStandardMaterial({color:BRASS,roughness:.28,metalness:.95});}

  /* ---------- scene ---------- */
  function build(){
    scene=new THREE.Scene();
    scene.background=new THREE.Color(NAVY);
    scene.fog=new THREE.Fog(NAVY,9,20);

    camera=new THREE.PerspectiveCamera(42,layer.clientWidth/Math.max(1,layer.clientHeight),.1,60);
    camera.position.set(0,2.0,9.0);

    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(layer.clientWidth,layer.clientHeight);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    layer.insertBefore(renderer.domElement,layer.firstChild);

    /* image-based lighting — soft studio reflections on every surface */
    try{
      var pmrem=new THREE.PMREMGenerator(renderer);
      var env=new RoomEnvironment();
      scene.environment=pmrem.fromScene(env,.04).texture;
      if(env.dispose)env.dispose();pmrem.dispose();
    }catch(e){/* env lighting is a bonus — lights below carry the scene */}

    scene.add(new THREE.HemisphereLight(0xFAF8F3,0x14120F,.22));
    var key=new THREE.DirectionalLight(0xFFF2DC,1.6);
    key.position.set(4.5,7,5);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);key.shadow.camera.near=1;key.shadow.camera.far=22;
    key.shadow.camera.left=key.shadow.camera.bottom=-7;key.shadow.camera.right=key.shadow.camera.top=7;
    key.shadow.bias=-.0004;
    scene.add(key);
    goldLight=new THREE.PointLight(GOLD,10,12,2);goldLight.position.set(0,2.4,2.2);scene.add(goldLight);

    root=new THREE.Group();scene.add(root);
    buildRoom();buildSwatches();buildSparkles();
  }

  /* a realistically-furnished corner — plank floor, painted walls, shaker
     cabinetry with brass hardware, stone worktop, pendants, rug, plant, art */
  function buildRoom(){
    var room=new THREE.Group();room.name='room';
    var edges=[];
    function glow(mesh){ /* gold design-line overlay that draws in */
      var e=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({color:GOLD,transparent:true,opacity:0}));
      e.position.copy(mesh.position);e.rotation.copy(mesh.rotation);room.add(e);edges.push(e);
    }
    function add(m,x,y,z,cast){m.position.set(x,y,z);if(cast!==false){m.castShadow=true;}m.receiveShadow=true;room.add(m);return m;}

    var floor=new THREE.Mesh(new THREE.PlaneGeometry(9,9),
      new THREE.MeshStandardMaterial({map:plankTexture(),roughness:.55,metalness:.02}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;room.add(floor);

    var wallA=add(new THREE.Mesh(new THREE.PlaneGeometry(9,4.6),paintMat('#9BA88D')),0,2.3,-4.5,false);
    var wallB=new THREE.Mesh(new THREE.PlaneGeometry(9,4.6),paintMat('#D9CDBA'));
    wallB.rotation.y=Math.PI/2;add(wallB,-4.5,2.3,0,false);

    var white=paintMat('#FAF8F3');
    add(new THREE.Mesh(new THREE.BoxGeometry(9,.14,.04),white),0,.07,-4.47,false);
    var sk2=new THREE.Mesh(new THREE.BoxGeometry(9,.14,.04),white);sk2.rotation.y=Math.PI/2;add(sk2,-4.47,.07,0,false);
    add(new THREE.Mesh(new THREE.BoxGeometry(9,.1,.06),white),0,4.55,-4.47,false);          /* cornice */

    /* --- cabinetry: carcass, shaker door fronts, brass bar handles --- */
    var doorWood=WOODS[0],carc=woodMat(WOODS[2]);
    function shakerDoor(w,h,x,y,z){
      var d=new THREE.Group();
      var back=new THREE.Mesh(new THREE.BoxGeometry(w,h,.02),woodMat(doorWood,128));back.castShadow=true;d.add(back);
      var f=.07,fm=woodMat(doorWood,128);                     /* raised frame rails */
      [[0,h/2-f/2,w,f],[0,-h/2+f/2,w,f],[-w/2+f/2,0,f,h-2*f],[w/2-f/2,0,f,h-2*f]].forEach(function(r){
        var rail=new THREE.Mesh(new THREE.BoxGeometry(r[2],r[3],.016),fm);
        rail.position.set(r[0],r[1],.018);d.add(rail);
      });
      var bar=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.16,10),brassMat());
      bar.position.set(w/2-.09,0,.045);d.add(bar);
      var lug=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.03,8),brassMat());
      lug.rotation.x=Math.PI/2;lug.position.set(w/2-.09,.065,.03);d.add(lug);
      var lug2=lug.clone();lug2.position.y=-.065;d.add(lug2);
      d.position.set(x,y,z);room.add(d);
      return d;
    }
    for(var i=0;i<4;i++){
      var bx=-1.55+i*.98;
      glow(add(new THREE.Mesh(new THREE.BoxGeometry(.94,.86,.58),carc),bx,.43,-4.08));
      shakerDoor(.86,.78,bx,.43,-3.78);
    }
    var top=add(new THREE.Mesh(new THREE.BoxGeometry(4.1,.07,.72),
      new THREE.MeshStandardMaterial({map:stoneTexture(),roughness:.28,metalness:.06})),-.08,.905,-3.98);
    glow(top);
    /* upstand */
    add(new THREE.Mesh(new THREE.BoxGeometry(4.1,.12,.03),
      new THREE.MeshStandardMaterial({map:stoneTexture(),roughness:.3})),-.08,1,-4.32,false);

    /* tall larder unit with two doors */
    glow(add(new THREE.Mesh(new THREE.BoxGeometry(.94,2.2,.6),carc),2.6,1.1,-4.08));
    shakerDoor(.86,1.02,2.6,1.62,-3.77);
    shakerDoor(.86,1.02,2.6,.56,-3.77);

    /* floating shelf with paint tins + books */
    glow(add(new THREE.Mesh(new THREE.BoxGeometry(2.0,.05,.24),woodMat(WOODS[3])),-.6,2.35,-4.34));
    var tints=['#B55A45','#8A9BA8','#C7A25E'];
    for(var j=0;j<3;j++){
      var tin=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.2,20),paintMat(tints[j]));
      add(tin,-1.3+j*.42,2.48,-4.34);
      var lid=new THREE.Mesh(new THREE.CylinderGeometry(.077,.077,.015,20),brassMat());
      add(lid,-1.3+j*.42,2.585,-4.34,false);
    }
    for(var b=0;b<4;b++){ /* leaning books */
      var bk=new THREE.Mesh(new THREE.BoxGeometry(.035,.26-(b%2)*.03,.18),paintMat(PAINTS[(b*3+2)%PAINTS.length]));
      bk.rotation.z=b===3?-.28:0;add(bk,-.05+b*.055+(b===3?.05:0),2.51,-4.34);
    }

    /* two pendant lights over the worktop */
    function pendant(x){
      var cord=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,1.15,6),
        new THREE.MeshStandardMaterial({color:0x111111,roughness:.8}));add(cord,x,3.98,-3.98,false);
      var shade=new THREE.Mesh(new THREE.CylinderGeometry(.05,.17,.22,24,1,true),
        new THREE.MeshStandardMaterial({color:0x23211E,roughness:.35,metalness:.7,side:THREE.DoubleSide}));
      add(shade,x,3.3,-3.98);
      var bulb=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),
        new THREE.MeshStandardMaterial({color:0xFFE6B0,emissive:0xFFC963,emissiveIntensity:2.4,roughness:.4}));
      add(bulb,x,3.22,-3.98,false);
      var pl=new THREE.PointLight(0xFFD98A,9,5,2);pl.position.set(x,3.1,-3.85);room.add(pl);
    }
    pendant(-1.05);pendant(.85);

    /* framed prints on the side wall */
    function art(y,z,w,h,hex){
      var f=new THREE.Mesh(new THREE.BoxGeometry(.05,h,w),woodMat(WOODS[2],128));add(f,-4.44,y,z);
      var cv=new THREE.Mesh(new THREE.PlaneGeometry(w-.1,h-.1),paintMat(hex));
      cv.rotation.y=Math.PI/2;add(cv,-4.4,y,z,false);
    }
    art(2.5,-1.6,.62,.8,'#B55A45');art(2.35,-.7,.5,.62,'#42504A');

    /* rug + plant soften the empty floor */
    var rug=new THREE.Mesh(new THREE.CircleGeometry(1.35,40),
      new THREE.MeshStandardMaterial({color:0x77805F,roughness:1}));
    rug.rotation.x=-Math.PI/2;add(rug,-.4,.012,-1.4,false);
    var pot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.16,.4,18),paintMat('#A05A3C'));
    add(pot,-3.7,.2,-3.3);
    var trunk=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.5,8),woodMat(WOODS[2],64));
    add(trunk,-3.7,.62,-3.3);
    for(var p=0;p<5;p++){
      var leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.24-(p%3)*.045,1),
        new THREE.MeshStandardMaterial({color:0x40573E,roughness:.85,flatShading:true}));
      add(leaf,-3.7+Math.sin(p*2.4)*.2,1+p*.16,-3.3+Math.cos(p*2.4)*.18);
    }

    room.userData.edges=edges;
    room.userData.rise=reduced?1:0;                 /* build-in progress 0→1 */
    room.position.y=reduced?0:-2.6;
    root.add(room);
  }

  /* floating swatch cards orbiting the vignette */
  function buildSwatches(){
    var geo=new THREE.BoxGeometry(.36,.5,.025);
    for(var i=0;i<22;i++){
      var mat=(i%5===4)?woodMat(WOODS[i%WOODS.length],128):paintMat(PAINTS[i%PAINTS.length]);
      var m=new THREE.Mesh(geo,mat);m.castShadow=true;
      var a=(i/22)*Math.PI*2+(i%3)*.35;
      var r=3.9+(i%5)*.45+Math.sin(i*7.3)*.3;
      m.userData={a:a,r:r,h:1.2+Math.sin(i*3.1)*.9+(i%4)*.5,ph:i*1.7,sp:.12+(i%5)*.03,
                  rx:Math.sin(i*5.2)*.35,rz:Math.cos(i*3.7)*.28,delay:i*.07,s:0};
      m.scale.setScalar(reduced?1:0.0001);
      swatches.push(m);root.add(m);
    }
  }

  function buildSparkles(){
    var n=340,pos=new Float32Array(n*3);
    for(var i=0;i<n;i++){
      pos[i*3]=(Math.random()-.5)*16;
      pos[i*3+1]=Math.random()*6.5;
      pos[i*3+2]=(Math.random()-.5)*16;
    }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    sparkles=new THREE.Points(g,new THREE.PointsMaterial({color:GOLD,size:.035,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));
    scene.add(sparkles);
  }

  /* ---------- animation ---------- */
  function ease(x){return 1-Math.pow(1-Math.min(Math.max(x,0),1),3);}
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(!t0)t0=now;
    var t=(now-t0)/1000;

    mx+=(tmx-mx)*.04;my+=(tmy-my)*.04;

    /* room rises and its gold edge-lines draw in */
    var room=root.getObjectByName('room');
    if(room){
      var rise=ease(t/1.6);room.userData.rise=rise;
      room.position.y=-2.6*(1-rise);
      var eo=Math.max(0,Math.min(1,(t-1.2)/1.4))* .5*(0.6+0.4*Math.sin(t*1.3));
      for(var i=0;i<room.userData.edges.length;i++)room.userData.edges[i].material.opacity=eo;
    }

    /* swatches pop in with stagger, then bob and slowly orbit */
    for(var k=0;k<swatches.length;k++){
      var m=swatches[k],u=m.userData;
      u.s=ease((t-.5-u.delay)/.9);
      m.scale.setScalar(Math.max(.0001,u.s));
      var a=u.a+t*u.sp*.35;
      m.position.set(Math.cos(a)*u.r,u.h+Math.sin(t*.8+u.ph)*.16,Math.sin(a)*u.r*.45);
      m.rotation.set(u.rx+Math.sin(t*.5+u.ph)*.12,a+Math.PI/2,u.rz+Math.cos(t*.42+u.ph)*.1);
    }

    if(sparkles){sparkles.rotation.y=t*.014;sparkles.material.opacity=.35+.2*Math.sin(t*.9);}
    if(goldLight)goldLight.intensity=8+2.5*Math.sin(t*1.7);

    /* camera: slow drift + mouse parallax; fly-in on leave */
    var la=new THREE.Vector3(0,1.25,-1);
    if(leaving){
      leaveT+=1/60;var e=ease(leaveT/1.05);
      camera.position.lerpVectors(camera.userData.from,new THREE.Vector3(.6,1.5,1.6),e);
      camera.fov=42+10*e;camera.updateProjectionMatrix();
      la.set(0,1.3,-4);
    }else{
      var orb=Math.sin(t*.1)*.55;
      camera.position.set(orb*1.8+mx*1.1,2.0+my*.5+Math.sin(t*.23)*.12,9.0-Math.min(t*.22,.8));
    }
    camera.lookAt(la);
    renderer.render(scene,camera);
  }

  /* ---------- lifecycle ---------- */
  function onResize(){
    if(!renderer)return;
    camera.aspect=layer.clientWidth/Math.max(1,layer.clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(layer.clientWidth,layer.clientHeight);
  }
  function onMove(e){
    var p=e.touches?e.touches[0]:e;if(!p)return;
    tmx=(p.clientX/window.innerWidth-.5)*2;
    tmy=-(p.clientY/window.innerHeight-.5)*2;
  }
  function dispose(){
    cancelAnimationFrame(raf);
    window.removeEventListener('resize',onResize);
    window.removeEventListener('pointermove',onMove);
    if(renderer){
      renderer.dispose();
      scene.traverse(function(o){
        if(o.geometry)o.geometry.dispose();
        if(o.material){var ms=[].concat(o.material);ms.forEach(function(m){if(m.map)m.map.dispose();if(m.bumpMap)m.bumpMap.dispose();m.dispose();});}
      });
      if(renderer.domElement&&renderer.domElement.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer=null;
    }
  }
  function enter(){
    if(leaving)return;leaving=true;
    try{sessionStorage.setItem('sturij.studio.intro3d','1');}catch(e){}
    if(camera){camera.userData.from=camera.position.clone();}
    layer.classList.add('leaving');
    setTimeout(function(){layer.classList.add('gone');dispose();},850);
  }

  /* buttons work with or without the 3D layer */
  var go=document.getElementById('i3go'),skip=document.getElementById('i3skip');
  window.__i3wired=true;   /* tells the inline fallback in studio.html to stand down */
  if(go)go.addEventListener('click',enter);
  if(skip)skip.addEventListener('click',enter);
  window.addEventListener('keydown',function h(e){
    if(e.key==='Enter'||e.key==='Escape'){window.removeEventListener('keydown',h);enter();}
  });

  try{
    build();
    window.addEventListener('resize',onResize);
    if(window.visualViewport)window.visualViewport.addEventListener('resize',function(){setTimeout(onResize,0);});
    window.addEventListener('pointermove',onMove,{passive:true});
    if(reduced){renderer.render(scene,camera);}   /* single still frame, no motion */
    else raf=requestAnimationFrame(frame);
  }catch(err){
    /* no WebGL or CDN hiccup — the overlay still shows and the buttons still enter */
    dispose();
  }
})();
