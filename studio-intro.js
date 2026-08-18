/* ===== Pairing Studio · 3D intro layer =====
   A cinematic Three.js welcome built from REAL Sturij material: photoreal
   room renders exported from the Pairing Studio float as gallery canvases in
   3D space, and each scheme's actual labelled swatch panels (Egger decors,
   Farrow & Ball colours, worktops, floors — real names, real hexes) orbit
   their room like physical sample chips. Textures stream in over a dark
   stage that renders fine on its own, so a slow connection still gets a
   working intro.

   "Enter the Studio" flies the camera in and hands over to the page.
   'three' resolves via the import map declared in the host page.
   window.STURIJ_INTRO_ASSETS = {base:'…', map:{path:dataURI}} may override
   where assets come from (used by the self-contained demo build). */

import * as THREE from 'three';
import {RoomEnvironment} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

(function(){
  var layer=document.getElementById('intro3d');
  if(!layer||layer.classList.contains('gone'))return;

  /* ---------- the real pairing sets this intro showcases ---------- */
  var PANELS=['panel-walls.jpg','panel-boards.jpg','panel-worktop.jpg','panel-floor.jpg','panel-carcass.jpg','panel-ceiling.jpg','panel-skirting.jpg'];
  var SETS=[1,2,3,4].map(function(n){return {dir:'showcase/pairings/set-'+n+'/',render:'render.jpg',panels:PANELS};});

  var GOLD=0xD4A01B,NAVY=0x1D1D1D;
  var scene,camera,renderer,root,chips=[],sparkles,goldLight,raf=0,t0=0,leaving=false,leaveT=0;
  var mx=0,my=0,tmx=0,tmy=0;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- asset resolution (relative, or overridden by the demo build) ---------- */
  var OVR=window.STURIJ_INTRO_ASSETS||{};
  function assetURL(p){return (OVR.map&&OVR.map[p])||((OVR.base||'')+p);}
  function markReal(){window.__i3realTextures=(window.__i3realTextures||0)+1;}
  /* swap a material's map to a real image once it arrives; photos stay unlit-true */
  function realise(mat,p){
    var im=new Image();
    if(/^https?:/.test(assetURL(p)))im.crossOrigin='anonymous';
    im.onload=function(){
      var t=new THREE.Texture(im);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;
      mat.map=t;mat.color.set('#ffffff');mat.needsUpdate=true;markReal();
    };
    im.src=assetURL(p);                                    /* onerror: placeholder stays */
  }

  /* ---------- scene ---------- */
  function build(){
    scene=new THREE.Scene();
    scene.background=new THREE.Color(NAVY);
    scene.fog=new THREE.Fog(NAVY,10,24);

    camera=new THREE.PerspectiveCamera(42,layer.clientWidth/Math.max(1,layer.clientHeight),.1,60);
    camera.position.set(0,2.0,9.2);

    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(layer.clientWidth,layer.clientHeight);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    layer.insertBefore(renderer.domElement,layer.firstChild);

    /* image-based lighting — soft reflections on frames and floor */
    try{
      var pmrem=new THREE.PMREMGenerator(renderer);
      var env=new RoomEnvironment();
      scene.environment=pmrem.fromScene(env,.04).texture;
      if(env.dispose)env.dispose();pmrem.dispose();
    }catch(e){/* env lighting is a bonus — lights below carry the scene */}

    scene.add(new THREE.HemisphereLight(0xFAF8F3,0x14120F,.25));
    var key=new THREE.DirectionalLight(0xFFF2DC,1.2);
    key.position.set(4.5,8,6);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);key.shadow.camera.near=1;key.shadow.camera.far=26;
    key.shadow.camera.left=key.shadow.camera.bottom=-9;key.shadow.camera.right=key.shadow.camera.top=9;
    key.shadow.bias=-.0004;
    scene.add(key);
    goldLight=new THREE.PointLight(GOLD,10,14,2);goldLight.position.set(0,2.6,3);scene.add(goldLight);

    root=new THREE.Group();scene.add(root);
    buildGallery();buildSparkles();
    fitPortrait();
  }
  /* portrait phones: lift the gallery into the upper half, clear of the text */
  function fitPortrait(){if(root)root.position.y=layer.clientHeight>layer.clientWidth?1.0:0;}

  /* a floating gallery: each real room render on a framed canvas, its real
     sample panels drifting around it */
  function buildGallery(){
    var g=new THREE.Group();g.name='gallery';
    var edges=[];

    /* dark polished floor grounds the gallery */
    var floor=new THREE.Mesh(new THREE.PlaneGeometry(30,20),
      new THREE.MeshStandardMaterial({color:0x141311,roughness:.32,metalness:.25}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);

    var frameMat=new THREE.MeshStandardMaterial({color:0x2A2724,roughness:.45,metalness:.35});
    var paper=new THREE.MeshStandardMaterial({color:0xEDE8DE,roughness:.85});

    for(var i=0;i<SETS.length;i++){
      var set=SETS[i],off=i-(SETS.length-1)/2;             /* -1.5 … 1.5 */
      var cx=off*3.8,cz=-3.0-Math.abs(off)*1.0,ry=-off*.16; /* shallow arc facing the camera */
      var H=2.55,W=2.55;                                    /* renders are square */

      /* frame + canvas */
      var frame=new THREE.Mesh(new THREE.BoxGeometry(W+.18,H+.18,.1),frameMat);
      frame.position.set(cx,2.15,cz);frame.rotation.y=ry;frame.castShadow=true;g.add(frame);
      var e=new THREE.LineSegments(new THREE.EdgesGeometry(frame.geometry),
        new THREE.LineBasicMaterial({color:GOLD,transparent:true,opacity:0}));
      e.position.copy(frame.position);e.rotation.copy(frame.rotation);g.add(e);edges.push(e);

      var canvasMat=new THREE.MeshBasicMaterial({color:0x35322E,toneMapped:false});
      realise(canvasMat,set.dir+set.render);
      var cv=new THREE.Mesh(new THREE.PlaneGeometry(W,H),canvasMat);
      cv.position.set(cx+Math.sin(ry)*.06,2.15,cz+Math.cos(ry)*.06);
      cv.rotation.y=ry;g.add(cv);

      /* the scheme's real sample chips orbit their canvas */
      for(var p=0;p<set.panels.length;p++){
        var front=new THREE.MeshBasicMaterial({color:0x8f887c,toneMapped:false});
        realise(front,set.dir+set.panels[p]);
        var chip=new THREE.Mesh(new THREE.BoxGeometry(.52,.37,.015),
          [paper,paper,paper,paper,front,paper]);
        chip.castShadow=true;
        chip.userData={cx:cx,cz:cz+.55,a:(p/set.panels.length)*Math.PI*2+i*.8,
                       r:1.65+(p%3)*.28,h:2.1+Math.sin(p*2.1+i)*.85,
                       ph:p*1.7+i*2.3,sp:(.16+(p%3)*.05)*(i%2?1:-1),delay:.5+i*.22+p*.06,s:0};
        chip.scale.setScalar(reduced?1:.0001);
        chips.push(chip);g.add(chip);
      }
    }

    g.userData.edges=edges;
    g.position.y=reduced?0:-2.8;
    root.add(g);
  }

  function buildSparkles(){
    var n=340,pos=new Float32Array(n*3);
    for(var i=0;i<n;i++){
      pos[i*3]=(Math.random()-.5)*20;
      pos[i*3+1]=Math.random()*7;
      pos[i*3+2]=(Math.random()-.5)*14;
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

    /* the gallery rises; gold frame-lines draw in */
    var g=root.getObjectByName('gallery');
    if(g){
      var rise=ease(t/1.6);
      g.position.y=-2.8*(1-rise);
      var eo=Math.max(0,Math.min(1,(t-1.2)/1.4))* .5*(0.6+0.4*Math.sin(t*1.3));
      for(var i=0;i<g.userData.edges.length;i++)g.userData.edges[i].material.opacity=eo;
    }

    /* sample chips pop in with stagger, then orbit their own canvas, facing the camera */
    for(var k=0;k<chips.length;k++){
      var m=chips[k],u=m.userData;
      u.s=ease((t-u.delay)/.9);
      m.scale.setScalar(Math.max(.0001,u.s));
      var a=u.a+t*u.sp*.4;
      m.position.set(u.cx+Math.cos(a)*u.r,u.h+Math.sin(t*.8+u.ph)*.14,u.cz+Math.sin(a)*u.r*.32);
      m.rotation.set(Math.sin(t*.5+u.ph)*.08,Math.atan2(camera.position.x-m.position.x,camera.position.z-m.position.z),Math.cos(t*.42+u.ph)*.06);
    }

    if(sparkles){sparkles.rotation.y=t*.014;sparkles.material.opacity=.35+.2*Math.sin(t*.9);}
    if(goldLight)goldLight.intensity=8+2.5*Math.sin(t*1.7);

    /* camera: pans along the gallery + mouse parallax; fly-in on leave */
    var la=new THREE.Vector3(0,1.7,-2);
    if(leaving){
      leaveT+=1/60;var e2=ease(leaveT/1.05);
      camera.position.lerpVectors(camera.userData.from,new THREE.Vector3(.3,1.85,.6),e2);
      camera.fov=42+10*e2;camera.updateProjectionMatrix();
      la.set(0,1.85,-2.6);
    }else{
      var pan=Math.sin(t*.09)*2.6;
      camera.position.set(pan+mx*1.2,2.0+my*.5+Math.sin(t*.23)*.1,9.2-Math.min(t*.22,.9));
      la.x=pan*.55;
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
    fitPortrait();
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
        if(o.material){var ms=[].concat(o.material);ms.forEach(function(m){if(m.map)m.map.dispose();m.dispose();});}
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
  window.__i3wired=true;   /* tells any inline fallback wiring to stand down */
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
