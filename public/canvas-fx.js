/* Sturij Canvas — avatar menu, background personalisation, ambient effects.
   Effects are exclusive: toggling one on switches the live one off. Clouds is a
   vanilla WebGL2 port of the html-in-canvas Clouds component (overlay mode only —
   no content texture, so it runs in every browser). */
(function(){
var $=function(id){return document.getElementById(id);};
var PKEY='sturij.canvas.fx.'+(new URLSearchParams(location.hash.replace(/^#\??/,'')).get('p')||localStorage.getItem('sturij.canvas.proj')||'p1');
var st={fx:null,bg:null};
try{st=JSON.parse(localStorage.getItem(PKEY))||st;}catch(e){}
function persist(){try{localStorage.setItem(PKEY,JSON.stringify(st));}catch(e){}}

/* ---------- avatar + dropdown ---------- */
var tr=document.querySelector('.top .tr')||document.querySelector('.toprow');
var av=document.createElement('button');av.className='avbtn';av.id='cvAvatar';av.title='Your workspace';av.textContent='MW';
tr.appendChild(av);
var dd=document.createElement('div');dd.className='avmenu';dd.hidden=true;
dd.innerHTML='<button class="avmi" data-a="bg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 14l5-4 5 5 3-2 5 4"/></svg>Background</button>';
document.body.appendChild(dd);
av.onclick=function(e){e.stopPropagation();dd.hidden=!dd.hidden;
  var r=av.getBoundingClientRect();dd.style.top=(r.bottom+8)+'px';dd.style.right=(innerWidth-r.right)+'px';};
document.addEventListener('pointerdown',function(e){if(!dd.hidden&&!dd.contains(e.target)&&e.target!==av)dd.hidden=true;});
dd.querySelector('[data-a="bg"]').onclick=function(){dd.hidden=true;openBgModal();};

/* ---------- playground: per-effect controls ---------- */
var FXP={
 clouds:[['op','Opacity',.05,1,.01,.34],['sc','Scale',.4,3,.05,1.1],['sp','Speed',0,3,.05,1],['cov','Cover',0,.5,.01,.08]],
 grid:[['tile','Tile size',60,220,5,110],['lift','Lift',20,120,2,54],['tint','Tint',0,1,.02,.16]],
 particles:[['n','Particles',1000,9000,100,4200],['rad','Scatter',40,260,5,110],['op','Ink',.15,1,.05,.5]],
 blaze:[['h','Height',.1,1,.02,.42],['sp','Embers',0,1.5,.05,.55],['sm','Smoke',0,1,.05,.35],['gl','Glow',0,3,.1,1.1],['spd','Speed',.2,3,.05,1]],
 field:[['cells','Cells',6,40,1,16],['glow','Glow',.3,3,.05,1]],
 dots:[['sp','Spacing',10,48,1,22],['op','Ink',.04,.35,.01,.13]],
 grain:[['op','Strength',.01,.2,.005,.05]]};
var FXCOL=['grid','blaze','field'];
function fxCfg(k){var o=(st.fxCfg&&st.fxCfg[k])||{};var out={col:o.col||'#D4A01B'};(FXP[k]||[]).forEach(function(d){out[d[0]]=o[d[0]]!=null?o[d[0]]:d[5];});return out;}
function hexRGB(h){var c=parseInt(h.slice(1),16);return [((c>>16)&255)/255,((c>>8)&255)/255,(c&255)/255];}
/* ---------- effects engine (exclusive) ---------- */
var live=null,liveKey=null;
function stopFx(){if(live&&live.destroy)live.destroy();live=null;liveKey=null;}
function startFx(key){
  stopFx();
  if(key==='clouds')live=clouds();
  else if(key==='dots')live=dotsDepth();
  else if(key==='grain')live=grain();
  else if(key==='grid')live=waveGrid();
  else if(key==='blaze')live=blaze();
  else if(key==='field')live=forceField();
  else if(key==='particles')live=particleMark();
  liveKey=live?key:null;
  st.fx=liveKey;persist();
}

/* Dots depth: dotted upper third dissolving into a flat tonal gradient */
function dotsDepth(){
  var d=document.createElement('div');d.className='fxlayer';
  var o6=fxCfg('dots');
  d.style.background='radial-gradient(rgba(29,29,29,'+o6.op+') 1px,transparent 1px)';
  d.style.backgroundSize=o6.sp+'px '+o6.sp+'px';
  d.style.webkitMaskImage=d.style.maskImage='linear-gradient(to bottom,rgba(0,0,0,1) 0,rgba(0,0,0,.85) 30%,rgba(0,0,0,0) 62%)';
  var g=document.createElement('div');g.className='fxlayer';
  g.style.background='linear-gradient(to bottom,transparent 34%,rgba(29,29,29,.045) 100%)';
  document.body.insertBefore(g,$('world'));document.body.insertBefore(d,$('world'));
  return {destroy:function(){d.remove();g.remove();}};
}
/* Grain: SVG turbulence film */
function grain(){
  var d=document.createElement('div');d.className='fxlayer fxtop';
  d.style.opacity=String(fxCfg('grain').op);
  d.style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>')+'")';
  document.body.appendChild(d);
  return {destroy:function(){d.remove();}};
}

/* Clouds — WebGL2 overlay port */
function clouds(){
  var c9=fxCfg('clouds');
  var out=document.createElement('canvas');out.className='fxlayer fxtop';
  document.body.appendChild(out);
  var gl=out.getContext('webgl2',{alpha:true,depth:false,antialias:false,premultipliedAlpha:true});
  if(!gl){out.remove();toastSafe('Clouds needs WebGL2 — not available in this browser');return null;}
  var VERT='#version 300 es\nprecision highp float;layout(location=0) in vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}';
  var FIELD='#version 300 es\nprecision highp float;out vec4 o;uniform vec2 uR;uniform float uT;uniform float uS;uniform float uC;uniform float uD;'
    +'const mat2 m=mat2(1.6,1.2,-1.2,1.6);'
    +'vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453123);}'
    +'float noise(vec2 p){const float K1=.366025404;const float K2=.211324865;vec2 i=floor(p+(p.x+p.y)*K1);vec2 a=p-i+(i.x+i.y)*K2;vec2 q=(a.x>a.y)?vec2(1.,0.):vec2(0.,1.);vec2 b=a-q+K2;vec2 c=a-1.+2.*K2;vec3 h=max(.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.);vec3 n=h*h*h*h*vec3(dot(a,hash(i)),dot(b,hash(i+q)),dot(c,hash(i+1.)));return dot(n,vec3(70.));}'
    +'float fbm(vec2 n){float t=0.;float a=.1;for(int i=0;i<7;i++){t+=noise(n)*a;n=m*n;a*=.4;}return t;}'
    +'void main(){vec2 p=gl_FragCoord.xy/uR;vec2 asp=vec2(uR.x/uR.y,1.);float q=fbm(p*asp*uS*.5);'
    +'float r=0.;vec2 uv=p*asp*uS;uv-=q-uT;float w=.8;for(int i=0;i<8;i++){r+=abs(w*noise(uv));uv=m*uv+uT;w*=.7;}'
    +'float f=0.;uv=p*asp*uS;uv-=q-uT;w=.7;for(int i=0;i<8;i++){f+=w*noise(uv);uv=m*uv+uT;w*=.6;}f*=r+f;'
    +'float c=0.;float t2=uT*2.;uv=p*asp*uS*2.;uv-=q-t2;w=.4;for(int i=0;i<7;i++){c+=w*noise(uv);uv=m*uv+t2;w*=.6;}'
    +'float c1=0.;float t3=uT*3.;uv=p*asp*uS*3.;uv-=q-t3;w=.4;for(int i=0;i<7;i++){c1+=abs(w*noise(uv));uv=m*uv+t3;w*=.6;}c+=c1;'
    +'float cov=clamp(uC+uD*f*r+c,0.,1.);o=vec4(cov,clamp(c,0.,1.),0.,1.);}';
  var WIND='#version 300 es\nprecision highp float;out vec4 o;uniform sampler2D uP;uniform vec2 uR;uniform float uDe;uniform vec2 uA;uniform vec2 uB;uniform float uRa;uniform float uSt;'
    +'void main(){vec2 uv=gl_FragCoord.xy/uR;float pr=texture(uP,uv).r*uDe;vec2 asp=vec2(uR.x/uR.y,1.);vec2 p=uv*asp;vec2 a=uA*asp;vec2 b=uB*asp;vec2 pa=p-a;vec2 ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);float d=length(pa-ba*h)/max(uRa,1e-4);float s=exp(-d*d*3.)*uSt;o=vec4(clamp(pr+s,0.,1.),0.,0.,1.);}';
  var COMP='#version 300 es\nprecision highp float;out vec4 o;uniform sampler2D uF;uniform sampler2D uW;uniform vec2 uR;uniform vec3 uBase;uniform float uSh;uniform float uOp;uniform float uWA;'
    +'void main(){vec2 uv=gl_FragCoord.xy/uR;vec2 fd=texture(uF,uv).rg;float wn=texture(uW,uv).r*uWA;float cov=fd.r-wn;float mist=smoothstep(.04,.9,cov);float a=mist*uOp;'
    +'float lum=dot(uBase,vec3(.299,.587,.114));float sh=clamp(fd.g,0.,1.);float k=uSh*.35;'
    +'vec3 rgb=lum>.5?uBase-vec3((1.-sh)*k):uBase+vec3(sh*k);rgb=clamp(rgb,0.,1.);o=vec4(rgb*a,a);}';
  function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x;}
  function prog(fs){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VERT));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
    var u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(var i=0;i<n;i++){var inf=gl.getActiveUniform(p,i);u[inf.name]=gl.getUniformLocation(p,inf.name);}return {p:p,u:u};}
  var F=prog(FIELD),W=prog(WIND),C=prog(COMP);
  var quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  function tex(){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  var ftex=tex(),wtex=[tex(),tex()],wi=0,fbo=gl.createFramebuffer(),fw=0,fh=0;
  function size(){out.width=Math.max(16,Math.round(innerWidth*.5));out.height=Math.max(16,Math.round(innerHeight*.5));
    if(out.width!==fw||out.height!==fh){fw=out.width;fh=out.height;
      [ftex,wtex[0],wtex[1]].forEach(function(t){gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,fw,fh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);});}}
  size();
  var base=[1,1,1];
  (function(){var bg=getComputedStyle($('world')).getPropertyValue('--board-bg').trim()||'#FAF8F3';
    var c=document.createElement('canvas');c.width=c.height=1;var x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,1,1);
    var d=x.getImageData(0,0,1,1).data;base=[d[0]/255,d[1]/255,d[2]/255];})();
  var t=Math.random()*64,raf=0,last=performance.now(),dead=false;
  var px=.5,py=.5,ppx=.5,ppy=.5,hasP=false;
  var rm=matchMedia('(prefers-reduced-motion: reduce)');
  function mv(e){var x=e.clientX/innerWidth,y=1-e.clientY/innerHeight;if(!hasP){ppx=x;ppy=y;hasP=true;}px=x;py=y;}
  document.addEventListener('pointermove',mv,{passive:true});
  function frame(now){
    if(dead)return;
    var dt=Math.min((now-last)/1000,1/30);last=now;
    if(!rm.matches)t+=dt*0.018*c9.sp;
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ftex,0);
    gl.viewport(0,0,fw,fh);gl.useProgram(F.p);
    gl.uniform2f(F.u.uR,fw,fh);gl.uniform1f(F.u.uT,t);gl.uniform1f(F.u.uS,c9.sc);gl.uniform1f(F.u.uC,c9.cov);gl.uniform1f(F.u.uD,2.4);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    var pw=wtex[wi],nw=wtex[1-wi];wi=1-wi;
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,nw,0);
    gl.useProgram(W.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,pw);
    gl.uniform1i(W.u.uP,0);gl.uniform2f(W.u.uR,fw,fh);gl.uniform1f(W.u.uDe,Math.pow(.5,dt/.7));
    var moved=Math.hypot(px-ppx,py-ppy);
    gl.uniform2f(W.u.uA,ppx,ppy);gl.uniform2f(W.u.uB,px,py);
    gl.uniform1f(W.u.uRa,350/Math.max(innerHeight,1));
    gl.uniform1f(W.u.uSt,(hasP&&moved>0)?Math.min(.2+moved*12,1)*.5:0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    ppx=px;ppy=py;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,out.width,out.height);gl.useProgram(C.p);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,ftex);gl.uniform1i(C.u.uF,0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,nw);gl.uniform1i(C.u.uW,1);
    gl.uniform2f(C.u.uR,out.width,out.height);
    gl.uniform3f(C.u.uBase,base[0],base[1],base[2]);
    gl.uniform1f(C.u.uSh,.14);gl.uniform1f(C.u.uOp,c9.op);gl.uniform1f(C.u.uWA,.6);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  addEventListener('resize',size);
  return {destroy:function(){dead=true;cancelAnimationFrame(raf);removeEventListener('resize',size);document.removeEventListener('pointermove',mv);out.remove();}};
}
/* Force field — WebGL2 port of the canvasui ForceField component (overlay mode:
   no page capture, so no html-in-canvas requirement — the hex lattice, hover
   reveal, click ripples and edge glow render over the board in Sturij gold) */
function forceField(){
  var o7=fxCfg('field'),c7=hexRGB(o7.col);
  var out=document.createElement('canvas');out.className='fxlayer fxtop';
  document.body.appendChild(out);
  var gl=out.getContext('webgl2',{alpha:true,depth:false,antialias:false,premultipliedAlpha:true});
  if(!gl){out.remove();toastSafe('Force field needs WebGL2');return null;}
  var VERT='#version 300 es\nprecision highp float;layout(location=0) in vec2 aPos;out vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}';
  var FRAG='#version 300 es\nprecision highp float;in vec2 vUv;out vec4 o;'
    +'uniform vec2 uR;uniform float uT;uniform vec3 uC;uniform vec2 uHitPos[10];uniform float uHitTime[10];uniform vec2 uM;'
    +'float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}'
    +'vec4 hexCell(vec2 p){const vec2 s=vec2(1.,1.7320508);'
    +'vec4 hC=floor(vec4(p,p-vec2(.5,1.))/s.xyxy)+.5;vec4 h=vec4(p-hC.xy*s,p-(hC.zw+.5)*s);'
    +'bool f=dot(h.xy,h.xy)<dot(h.zw,h.zw);vec2 l=f?h.xy:h.zw;vec2 id=f?hC.xy:hC.zw+.5;'
    +'vec2 c=abs(l);float d=max(dot(c,s*.5),c.x);return vec4(d,.5,id);}'
    +'void main(){vec2 frag=vUv*uR;float mn=min(uR.x,uR.y);vec2 st=frag/mn;float GLOW='+o7.glow.toFixed(2)+';'
    +'float ring=0.;float impact=0.;'
    +'for(int i=0;i<10;i++){float ht=uHitTime[i];float el=uT-ht;'
    +'if(ht<-900.||el<0.||el>1.6)continue;'
    +'vec2 to=(frag-uHitPos[i])/mn;float dist=length(to);float rr=min(el*.5,.85);'
    +'float band=dist-rr;float sig=.09;float g=exp(-band*band/(2.*sig*sig));'
    +'float fade=1.-smoothstep(.64,1.6,el);fade*=fade;'
    +'float rf=1.-smoothstep(.64,.85,rr);ring+=g*fade*rf;'
    +'impact+=smoothstep(.16,0.,dist)*(1.-smoothstep(0.,.56,el));}'
    +'ring=min(ring,1.5);impact=min(impact,1.);'
    +'vec4 info=hexCell(st*'+o7.cells.toFixed(1)+');'
    +'float line=smoothstep(info.y-.035,info.y,info.x);'
    +'float rnd=hash21(info.zw);'
    +'float flash=smoothstep(.6,1.,sin(uT*.6*(0.5+rnd*1.5)+rnd*6.2831))*.08;'
    +'vec2 bp=min(frag,uR-frag)/mn;float ef=.18;'
    +'float hmix=clamp(.5+.5*(bp.y-bp.x)/ef,0.,1.);'
    +'float ed=mix(bp.y,bp.x,hmix)-ef*hmix*(1.-hmix);'
    +'float fres=pow(1.-smoothstep(0.,ef,ed),1.6)*.22;'
    +'float md=distance(frag,uM);'
    +'float hover=exp(-md*md/(350.*350.*.5))*.2;'
    +'float hmask=1.-smoothstep(250.*.65,250.,md);'
    +'float grid=line*(.06+hmask*.9+impact*1.4+ring*.5);'
    +'float e=grid*(.35+fres*.4)+fres*.5+flash*line+hover*(.25+line*.75)+ring*.12;'
    +'vec3 col=uC*e*.9*GLOW;o=vec4(col,max(max(col.r,col.g),col.b));}';
  function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(x));return x;}
  var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VERT));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(p);
  var U={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(var i=0;i<n;i++){var inf=gl.getActiveUniform(p,i);U[inf.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,inf.name);}
  var quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  var dpr=Math.min(devicePixelRatio||1,1.5);
  function size(){out.width=Math.max(16,Math.round(innerWidth*dpr));out.height=Math.max(16,Math.round(innerHeight*dpr));}
  size();addEventListener('resize',size);
  var hitPos=new Float32Array(20),hitTime=new Float32Array(10).fill(-999),hi=0;
  var mx=-9999,my=-9999,t=3.7,raf=0,last=performance.now(),dead=false;
  var rm=matchMedia('(prefers-reduced-motion: reduce)');
  function mv(e){mx=e.clientX*dpr;my=out.height-e.clientY*dpr;}
  function dn(e){var idx=hi%10;hi++;hitPos[idx*2]=e.clientX*dpr;hitPos[idx*2+1]=out.height-e.clientY*dpr;hitTime[idx]=t;}
  document.addEventListener('pointermove',mv,{passive:true});
  document.addEventListener('pointerdown',dn,{passive:true});
  function frame(now){
    if(dead)return;
    var dt=Math.min((now-last)/1000,1/30);last=now;
    if(!rm.matches)t+=dt;
    gl.viewport(0,0,out.width,out.height);gl.useProgram(p);
    gl.uniform2f(U.uR,out.width,out.height);gl.uniform1f(U.uT,t);
    gl.uniform3f(U.uC,c7[0],c7[1],c7[2]);
    gl.uniform2fv(U.uHitPos,hitPos);gl.uniform1fv(U.uHitTime,hitTime);
    gl.uniform2f(U.uM,mx,my);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  return {destroy:function(){dead=true;cancelAnimationFrame(raf);removeEventListener('resize',size);document.removeEventListener('pointermove',mv);document.removeEventListener('pointerdown',dn);out.remove();}};
}
/* Hearth — WebGL2 port of the canvasui Blaze component (fire pass only, ember palette in Sturij gold) */
function blaze(){
  var out=document.createElement('canvas');out.className='fxlayer fxtop';
  document.body.appendChild(out);
  var gl=out.getContext('webgl2',{alpha:true,depth:false,antialias:false,premultipliedAlpha:true});
  if(!gl){out.remove();toastSafe('Hearth needs WebGL2');return null;}
  var o8=fxCfg('blaze'),c8=hexRGB(o8.col);
  var cfg={height:o8.h,sparks:o8.sp,sparkDensity:1.5,sparkSize:1,layers:4,smoke:o8.sm,glow:o8.gl,speed:o8.spd,
    sparkColor:c8,smokeColor:c8};
  var VERT='#version 300 es\nprecision highp float;layout(location=0) in vec2 aPos;out vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}';
  var NOISE='float hash1_2(vec2 x){return fract(sin(dot(x,vec2(52.127,61.2871)))*521.582);}'
    +'vec2 hash2_2(vec2 x){return fract(sin(x*mat2(20.52,24.1994,70.291,80.171))*492.194);}'
    +'vec2 noise2_2(vec2 uv){vec2 f=smoothstep(0.,1.,fract(uv));vec2 uv00=floor(uv);vec2 v00=hash2_2(uv00);vec2 v01=hash2_2(uv00+vec2(0.,1.));vec2 v10=hash2_2(uv00+vec2(1.,0.));vec2 v11=hash2_2(uv00+1.);return mix(mix(v00,v01,f.y),mix(v10,v11,f.y),f.x);}'
    +'vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}'
    +'float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}';
  var FIRE='#version 300 es\nprecision highp float;in vec2 vUv;out vec4 o;uniform vec2 uR;uniform float uT;uniform float uH;uniform float uSp;uniform float uSd;uniform float uSs;uniform int uL;uniform float uSm;uniform float uG;uniform vec3 uSc;uniform vec3 uMc;\n'
    +'#define MOVE_DIR vec2(0.,-1.)\n#define MOVE_SPEED .5\n'+NOISE
    +'float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<3;i++){v+=a*snoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+11.7;a*=.5;}return v*.5+.5;}'
    +'float smokeField(vec2 p,float t){vec2 rise=vec2(-t*.03,-t*.22);vec2 q=vec2(fbm(p+rise),fbm(p+rise*.85+vec2(5.2,1.3)));return fbm(p+.55*q+rise);}'
    +'vec2 rotate2(vec2 pt,float deg){float s=sin(deg);float c=cos(deg);return mat2(s,c,-c,s)*pt;}'
    +'vec2 voronoiPoint(vec2 root,float deg){vec2 pt=hash2_2(root)-.5;float s=sin(deg);float c=cos(deg);pt=mat2(s,c,-c,s)*pt*.66;pt+=root+.5;return pt;}'
    +'vec2 randomAround(vec2 pt,vec2 rg,vec2 uv){return pt+(hash2_2(uv)-.5)*rg;}'
    +'vec3 fireParticles(vec2 uv,vec2 ouv){vec3 pr=vec3(0.);vec2 ruv=floor(uv);float deg=uT*.6*(hash1_2(ruv)-.5)*2.;vec2 puv=voronoiPoint(ruv,deg);float sz=.002*uSs;'
    +'vec2 tuv=uv+vec2(snoise(uv*1.8+uT*.55),snoise(uv*1.8-uT*.4+7.3))*.06;'
    +'float dist=length(rotate2(tuv-puv,.7)*randomAround(vec2(.5,1.6),vec2(.25,.2),ruv));'
    +'float db=length(rotate2(tuv-puv,.7)*randomAround(vec2(.5,.8),vec2(.3,.1),ruv));'
    +'pr+=(1.-smoothstep(sz*.6,sz*3.,dist))*uSc*1.5;pr+=pow(1.-smoothstep(0.,sz*6.,db),3.)*uSc*.8;'
    +'float border=(hash1_2(ruv)-.5)*2.;float dis=1.-smoothstep(border,border+.5,ouv.y);'
    +'border=(hash1_2(ruv+.214)-1.8)*.7;float app=smoothstep(border,border+.4,ouv.y);return pr*dis*app;}'
    +'vec3 layeredParticles(vec2 uv,float szm,float alm,int layers,float smk){vec3 pr=vec3(0.);float sz=1.;float al=1.;vec2 off=vec2(0.);'
    +'for(int i=0;i<layers;i++){vec2 no=(noise2_2(uv*sz*2.+.5)-.5)*.15;vec2 buv=(uv*sz*uSd+uT*MOVE_DIR*MOVE_SPEED)+off+no;'
    +'pr+=fireParticles(buv,uv)*al*(1.-smoothstep(0.,1.,smk)*(float(i)/float(layers)));off+=hash2_2(vec2(al,al))*10.;al*=alm;sz*=szm;}return pr;}'
    +'void main(){vec2 uv=vUv;float zone=clamp(uH,.02,1.);float fy=uv.y/zone;if(fy>1.){o=vec4(0.);return;}'
    +'float aspect=uR.x/uR.y;vec2 fuv=vec2((uv.x-.5)*aspect*3.2,mix(-.7,1.6,fy));'
    +'float si=0.;if(uSm>.001){si=smokeField(fuv*vec2(.4,.55),uT);si=smoothstep(.42,1.15,si);si*=pow(1.-smoothstep(-1.,1.6,fuv.y),1.5);}'
    +'vec3 smoke=si*uMc*.8*uSm;vec3 pr=vec3(0.);if(uSp>.001){pr=layeredParticles(fuv,1.01,.9,uL,si)*uSp;}'
    +'float fade=1.-smoothstep(.55,1.,fy);vec3 glow=uMc*.05*uG*pow(1.-fy,2.);vec3 fire=(pr+smoke)*fade+glow;'
    +'o=vec4(fire*.85,max(fire.r,max(fire.g,fire.b))*.85);}';
  function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(x));return x;}
  var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VERT));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FIRE));gl.linkProgram(p);
  var U={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(var i=0;i<n;i++){var inf=gl.getActiveUniform(p,i);U[inf.name]=gl.getUniformLocation(p,inf.name);}
  var quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  function size(){out.width=Math.max(16,Math.round(innerWidth*.55));out.height=Math.max(16,Math.round(innerHeight*.55));}
  size();addEventListener('resize',size);
  var t=0,raf=0,last=performance.now(),dead=false,rm=matchMedia('(prefers-reduced-motion: reduce)');
  function frame(now){
    if(dead)return;
    var dt=Math.min((now-last)/1000,1/30);last=now;
    if(!rm.matches)t+=dt*cfg.speed;
    gl.viewport(0,0,out.width,out.height);gl.useProgram(p);
    gl.uniform2f(U.uR,out.width,out.height);gl.uniform1f(U.uT,t);gl.uniform1f(U.uH,cfg.height);
    gl.uniform1f(U.uSp,cfg.sparks);gl.uniform1f(U.uSd,cfg.sparkDensity);gl.uniform1f(U.uSs,cfg.sparkSize);
    gl.uniform1i(U.uL,cfg.layers);gl.uniform1f(U.uSm,cfg.smoke);gl.uniform1f(U.uG,cfg.glow);
    gl.uniform3f(U.uSc,cfg.sparkColor[0],cfg.sparkColor[1],cfg.sparkColor[2]);
    gl.uniform3f(U.uMc,cfg.smokeColor[0],cfg.smokeColor[1],cfg.smokeColor[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  return {destroy:function(){dead=true;cancelAnimationFrame(raf);removeEventListener('resize',size);out.remove();}};
}
/* Wave grid — WebGL2 port of the canvasui Grid component (overlay mode, no content texture) */
function waveGrid(){
  var out=document.createElement('canvas');out.className='fxlayer fxtop';
  document.body.appendChild(out);
  var gl=out.getContext('webgl2',{alpha:true,depth:false,antialias:false,premultipliedAlpha:true});
  if(!gl){out.remove();toastSafe('Wave grid needs WebGL2');return null;}
  var o9=fxCfg('grid'),t9=hexRGB(o9.col);
  var cfg={tileSize:o9.tile,gap:2,corner:8,amplitude:2.5,waveSpeed:.5,frequency:12,waveWidth:.05,fadeTime:.22,maxLift:1,jitter:.15,liftHeight:o9.lift,persp:1200,tilt:.7,shading:.5,tint:t9,tintStrength:o9.tint};
  var VERT='#version 300 es\nprecision highp float;layout(location=0) in vec2 aPos;out vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}';
  var TILE='#version 300 es\nprecision highp float;out vec4 o;uniform sampler2D uTr;uniform int uN;uniform float uWpt;uniform float uWs;uniform float uFr;uniform float uWw;uniform float uFt;uniform float uAm;uniform float uJ;uniform float uMl;'
    +'vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453123)-.5;}'
    +'void main(){vec2 tile=floor(gl_FragCoord.xy);vec2 world=(tile+.5)*uWpt+hash2(tile)*uJ*.12;'
    +'float wh=0.;float tw=0.;'
    +'for(int i=0;i<64;i++){if(i>=uN)break;vec4 td=texelFetch(uTr,ivec2(i,0),0);vec2 d=world-td.xy;float dist=length(d);float rd=dist-uWs*td.z;'
    +'float win=exp(-(rd*rd)/(uWw*uWw));float fade=exp(-td.z/uFt);float at=1./(1.+dist*3.);float w=fade*win*at*td.w;wh+=w*cos(uFr*rd);tw+=w;}'
    +'float lift=clamp(wh/max(tw,1.)*uAm,-uMl,uMl);o=vec4(lift*.5+.5,0.,0.,1.);}';
  var MAIN='#version 300 es\nprecision highp float;in vec2 vUv;out vec4 o;uniform sampler2D uTi;uniform vec2 uR;uniform ivec2 uG;uniform float uTp;uniform float uGp;uniform float uCp;uniform float uLp;uniform float uPe;uniform vec2 uV;uniform float uSh;uniform vec3 uTint;uniform float uTs;'
    +'float tl(ivec2 i){i=clamp(i,ivec2(0),uG-1);return texelFetch(uTi,i,0).r*2.-1.;}'
    +'float rb(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}'
    +'float ts(vec2 w,ivec2 i,float hs){vec2 c=(vec2(i)+.5)*uTp;return rb(w-c,vec2(hs),min(uCp,hs));}'
    +'vec2 up(vec2 p,float z){return uV+(p-uV)*(uPe-z)/uPe;}'
    +'void main(){vec2 pos=vUv*uR;float hs=uTp*.5-uGp*.5;'
    +'float bz=-1e6;float es=1.;ivec2 bi=ivec2(-1);float bl=0.;bool bw=false;vec2 wn=vec2(0.);ivec2 li=ivec2(-9999);'
    +'for(int k=0;k<8;k++){float pz=(float(k)/3.5-1.)*uLp;ivec2 idx=clamp(ivec2(floor(up(pos,pz)/uTp)),ivec2(0),uG-1);'
    +'if(all(equal(idx,li)))continue;li=idx;float lift=tl(idx);float h=lift*uLp;if(h<=bz)continue;'
    +'vec2 wh=up(pos,h);float sd=ts(wh,idx,hs);'
    +'if(sd<.75){bz=h;es=sd;bi=idx;bl=lift;bw=false;}'
    +'else if(h>0.){float s0=ts(pos,idx,hs);if(s0<.75){float za=0.;float zb=h;'
    +'for(int r=0;r<3;r++){float zm=(za+zb)*.5;float sm=ts(up(pos,zm),idx,hs);if(sm<0.){za=zm;}else{zb=zm;}}'
    +'float zs=(za+zb)*.5;if(zs>bz){vec2 wz=up(pos,zs);vec2 e=vec2(.75,0.);'
    +'wn=normalize(vec2(ts(wz+e.xy,idx,hs)-ts(wz-e.xy,idx,hs),ts(wz+e.yx,idx,hs)-ts(wz-e.yx,idx,hs))+1e-5);'
    +'bz=zs;es=s0;bi=idx;bl=lift;bw=true;}}}}'
    +'if(bi.x<0){o=vec4(0.);return;}float mask=1.-smoothstep(-.75,.75,es);if(mask<=0.){o=vec4(0.);return;}'
    +'float la=clamp(abs(bl),0.,1.);vec4 ct=vec4(mix(vec3(.62),uTint,clamp(uTs,0.,1.)),la*.55);'
    +'float t=clamp(bl,0.,1.)*uTs;vec3 col;float al;'
    +'if(bw){vec2 ld=normalize(vec2(-.55,.8));float fc=dot(wn,ld);float sd2=1.-(.5-.32*fc)*uSh;col=ct.rgb*sd2;al=min(ct.a*1.5,.85);}'
    +'else{float gx=tl(bi+ivec2(1,0))-tl(bi-ivec2(1,0));float gy=tl(bi+ivec2(0,1))-tl(bi-ivec2(0,1));'
    +'float sd3=(gy-gx)*.25*uSh;sd3+=clamp(bl,-1.,1.)*.1*uSh;col=ct.rgb*(1.+sd3*.85)+sd3*.12;al=clamp(ct.a+t+abs(sd3)*.5,0.,1.);}'
    +'col=mix(col,uTint,t);float ao=al*mask;o=vec4(col*ao,ao);}';
  function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(x));return x;}
  function prog(fs){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VERT));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
    var u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(var i=0;i<n;i++){var inf=gl.getActiveUniform(p,i);u[inf.name]=gl.getUniformLocation(p,inf.name);}return {p:p,u:u};}
  var T=prog(TILE),M=prog(MAIN);
  var quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  var MAXT=64,trailData=new Float32Array(MAXT*4),trail=[],lastPt=null;
  var ttex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,ttex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,MAXT,1,0,gl.RGBA,gl.FLOAT,trailData);
  var gtex=null,gfbo=null,gx=0,gy=0;
  function size(){var d=Math.min(devicePixelRatio||1,2);
    out.width=Math.max(1,Math.round(innerWidth*d));out.height=Math.max(1,Math.round(innerHeight*d));}
  function tiles(){var d=out.width/Math.max(innerWidth,1),tp=cfg.tileSize*d;
    var nx=Math.max(1,Math.ceil(out.width/tp)),ny=Math.max(1,Math.ceil(out.height/tp));
    if(gtex&&nx===gx&&ny===gy)return;gx=nx;gy=ny;
    if(gtex)gl.deleteTexture(gtex);if(gfbo)gl.deleteFramebuffer(gfbo);
    gtex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,gtex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gx,gy,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gfbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,gfbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,gtex,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
  size();
  var vx=.5,vy=.5,vtx=.5,vty=.5,raf=0,last=performance.now(),dead=false;
  var rm=matchMedia('(prefers-reduced-motion: reduce)');
  function mv(e){
    if(rm.matches)return;
    var w=Math.max(innerWidth,1),h=Math.max(innerHeight,1),asp=w/h;
    var fxp=e.clientX/w,fyp=e.clientY/h;vtx=fxp;vty=fyp;
    var x=fxp*asp,y=1-fyp,dd=.2;
    if(lastPt){dd=Math.hypot(x-lastPt.x,y-lastPt.y);if(dd<.03)return;}
    if(trail.length>=MAXT)trail.shift();
    trail.push({x:x,y:y,age:0,s:Math.min(Math.max(dd*6,.25),1.2)});
    lastPt={x:x,y:y};}
  document.addEventListener('pointermove',mv,{passive:true});
  function frame(now){
    if(dead)return;
    var dt=Math.min((now-last)/1000,1/30);last=now;
    var exp=cfg.fadeTime*4;
    for(var i=trail.length-1;i>=0;i--){trail[i].age+=dt;if(trail[i].age>exp)trail.splice(i,1);}
    var n=Math.min(trail.length,MAXT);
    for(i=0;i<n;i++){trailData[i*4]=trail[i].x;trailData[i*4+1]=trail[i].y;trailData[i*4+2]=trail[i].age;trailData[i*4+3]=trail[i].s;}
    gl.bindTexture(gl.TEXTURE_2D,ttex);
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MAXT,1,gl.RGBA,gl.FLOAT,trailData);
    tiles();
    var scl=out.width/Math.max(innerWidth,1),tp=cfg.tileSize*scl;
    var ease=1-Math.exp(-dt*4);vx+=(vtx-vx)*ease;vy+=(vty-vy)*ease;
    gl.useProgram(T.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,ttex);
    gl.uniform1i(T.u.uTr,0);gl.uniform1i(T.u.uN,n);
    gl.uniform1f(T.u.uWpt,tp/out.height);gl.uniform1f(T.u.uWs,cfg.waveSpeed);gl.uniform1f(T.u.uFr,cfg.frequency);
    gl.uniform1f(T.u.uWw,cfg.waveWidth);gl.uniform1f(T.u.uFt,cfg.fadeTime);gl.uniform1f(T.u.uAm,cfg.amplitude);
    gl.uniform1f(T.u.uJ,cfg.jitter);gl.uniform1f(T.u.uMl,cfg.maxLift);
    gl.bindFramebuffer(gl.FRAMEBUFFER,gfbo);gl.viewport(0,0,gx,gy);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.useProgram(M.p);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gtex);gl.uniform1i(M.u.uTi,1);
    gl.uniform2f(M.u.uR,out.width,out.height);gl.uniform2i(M.u.uG,gx,gy);
    gl.uniform1f(M.u.uTp,tp);gl.uniform1f(M.u.uGp,cfg.gap*scl);gl.uniform1f(M.u.uCp,cfg.corner*scl);
    gl.uniform1f(M.u.uLp,cfg.liftHeight*scl);gl.uniform1f(M.u.uPe,cfg.persp*scl);
    gl.uniform2f(M.u.uV,(.5+(vx-.5)*cfg.tilt)*out.width,(.5+(.5-vy)*cfg.tilt)*out.height);
    gl.uniform1f(M.u.uSh,cfg.shading);gl.uniform3f(M.u.uTint,cfg.tint[0],cfg.tint[1],cfg.tint[2]);gl.uniform1f(M.u.uTs,cfg.tintStrength);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,out.width,out.height);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  addEventListener('resize',size);
  return {destroy:function(){dead=true;cancelAnimationFrame(raf);removeEventListener('resize',size);document.removeEventListener('pointermove',mv);out.remove();}};
}
/* Particle mark — the Sturij mark as a spring-physics particle cloud (2D-canvas port of canvasui ParticleObject, image mode) */
function particleMark(){
  var out=document.createElement('canvas');out.className='fxlayer';out.style.zIndex='1';
  document.body.insertBefore(out,$('world'));
  var x2=out.getContext('2d');
  var d=Math.min(devicePixelRatio||1,2),raf=0,dead=false;
  function size(){out.width=Math.round(innerWidth*d);out.height=Math.round(innerHeight*d);}
  size();addEventListener('resize',size);
  var P=null,N=0,rm=matchMedia('(prefers-reduced-motion: reduce)');
  var img=new Image();
  img.onload=function(){
    var R2=420,r=Math.min(1,R2/Math.max(img.width,img.height));
    var cw=Math.max(1,Math.round(img.width*r)),ch2=Math.max(1,Math.round(img.height*r));
    var cv=document.createElement('canvas');cv.width=cw;cv.height=ch2;
    var cx2=cv.getContext('2d');cx2.drawImage(img,0,0,cw,ch2);
    var dat=cx2.getImageData(0,0,cw,ch2),px=[],wts=[],tot=0;
    for(var i=0;i<cw*ch2;i++){var a=dat.data[i*4+3];if(a<10)continue;tot+=a;px.push(i);wts.push(tot);}
    if(!px.length)return;
    N=Math.round(fxCfg('particles').n);P=new Float32Array(N*6); /* x,y,hx,hy,vx,vy */
    var longest=Math.max(cw,ch2);
    var scale=Math.min(innerWidth,innerHeight)*.5,ox=innerWidth/2,oy=innerHeight/2;
    for(i=0;i<N;i++){
      var pick=Math.random()*tot,lo=0,hi=wts.length-1;
      while(lo<hi){var mid=(lo+hi)>>1;if(wts[mid]<pick)lo=mid+1;else hi=mid;}
      var p=px[lo],pxx=p%cw,pyy=Math.floor(p/cw);
      var hx=ox+((pxx+Math.random()-cw/2)/longest)*scale;
      var hy=oy+((pyy+Math.random()-ch2/2)/longest)*scale;
      P[i*6]=hx;P[i*6+1]=hy;P[i*6+2]=hx;P[i*6+3]=hy;P[i*6+4]=0;P[i*6+5]=0;}
  };
  img.src='brand/sturij-mark-white.png';
  var mx=-1e4,my=-1e4,pmx=-1e4,pmy=-1e4,spd=0,lastT=0;
  function mv(e){
    var now=performance.now();
    if(lastT){var dt2=Math.max((now-lastT)/1000,1e-3);var s=Math.hypot(e.clientX-pmx,e.clientY-pmy)/dt2;spd+=(s-spd)*.35;}
    pmx=mx;pmy=my;mx=e.clientX;my=e.clientY;lastT=now;}
  document.addEventListener('pointermove',mv,{passive:true});
  var last=performance.now(),t=0;
  function frame(now){
    if(dead)return;
    var dt=Math.min((now-last)/1000,1/30);last=now;t+=dt;
    x2.setTransform(d,0,0,d,0,0);x2.clearRect(0,0,innerWidth,innerHeight);
    if(P){
      var RAD=fxCfg('particles').rad,R2m=RAD*RAD,stiff=60,decay=Math.exp(-7*dt);
      var push=26*Math.min(spd/900,2)*14*dt;spd*=Math.exp(-3*dt);
      x2.fillStyle='rgba(29,29,29,'+fxCfg('particles').op+')';
      for(var i=0;i<N;i++){
        var ix=i*6,pxp=P[ix],pyp=P[ix+1],hx=P[ix+2],hy=P[ix+3],vxp=P[ix+4],vyp=P[ix+5];
        if(!rm.matches){
          var dx=pxp-mx,dy=pyp-my,d2=dx*dx+dy*dy;
          if(d2<R2m&&d2>1e-6){var dist=Math.sqrt(d2),inv=1/dist,fall=1-dist/RAD,f=fall*fall*dt*26*60;
            vxp+=dx*inv*f+(-dy*inv)*.6*f;vyp+=dy*inv*f+(dx*inv)*.6*f;}
          var dr=.9;
          vxp+=Math.sin(t*1.7+i*61.0)*dr*dt*6;vyp+=Math.cos(t*1.3+i*23.0)*dr*dt*6;
        }
        vxp+=(hx-pxp)*stiff*dt;vyp+=(hy-pyp)*stiff*dt;
        vxp*=decay;vyp*=decay;
        pxp+=vxp*dt;pyp+=vyp*dt;
        P[ix]=pxp;P[ix+1]=pyp;P[ix+4]=vxp;P[ix+5]=vyp;
        x2.fillRect(pxp,pyp,1.4,1.4);
      }
    }
    raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  return {destroy:function(){dead=true;cancelAnimationFrame(raf);removeEventListener('resize',size);document.removeEventListener('pointermove',mv);out.remove();}};
}
function toastSafe(m){var t=$('toast');if(t){t.textContent=m;t.classList.add('on');setTimeout(function(){t.classList.remove('on');},2200);}}

/* ---------- background modal ---------- */
var SW=[['Paper','#FAF8F3'],['Warm','#F0EDE8'],['Blush','#F3E9E4'],['Sage','#E9EDE6'],['Sky','#E7EDF1'],['Slate','#2A2724']];
var FX=[['clouds','Clouds','Drifting mist over the board \u00b7 move the pointer to stir it'],
        ['grid','Wave grid','Tiles rise in a 3D wave behind the pointer'],
        ['particles','Particle mark','The Sturij mark as particles \u00b7 the pointer scatters them'],
        ['blaze','Hearth','Rising embers and smoke from the foot of the board'],
        ['field','Force field','A faint gold lattice \u00b7 clicks send ripples through it'],
        ['dots','Dots depth','Dotted upper third dissolving into a tonal gradient'],
        ['grain','Film grain','A quiet analogue texture over everything']];
function openBgModal(){
  var ov=document.createElement('div');ov.className='trmodal';
  var h='<div class="trbox bgbox"><div class="ifhd"><span class="oh">Background</span><button class="ifx">\u00d7</button></div>'
    +'<div class="bgsec">Canvas colour</div><div class="bgsw">'+SW.map(function(s){
      return '<button class="bgs" data-hex="'+s[1]+'" title="'+s[0]+'" style="background:'+s[1]+'"></button>';}).join('')+'</div>'
    +'<div class="bgsec">Effects \u00b7 one live at a time</div>';
  FX.forEach(function(f){
    h+='<div class="fxrow"><div><b>'+f[1]+'</b><span>'+f[2]+'</span></div><button class="fxtg" data-fx="'+f[0]+'" role="switch"></button></div>'
      +'<div class="fxctl" data-ctl="'+f[0]+'" style="display:none"></div>';});
  h+='<div class="bgsec">Screensaver</div>'
    +'<div class="fxrow"><div><b>Glass mark</b><span>The Sturij mark in slow-turning glass over a Sturij room after two minutes idle \u00b7 select up to 3 of your own board images and use \u201cSaver backdrop\u201d to use those instead</span></div><button class="fxtg" id="svtg" role="switch"></button></div>';
  h+='</div>';
  ov.innerHTML=h;
  var rto=null;
  function restart(k){clearTimeout(rto);rto=setTimeout(function(){if(liveKey===k)startFx(k);},180);}
  function buildCtls(){
    ov.querySelectorAll('.fxctl').forEach(function(c){
      var k=c.getAttribute('data-ctl');
      if(k!==liveKey){c.innerHTML='';c.style.display='none';return;}
      c.style.display='';
      var defs=FXP[k]||[],cfg=(st.fxCfg&&st.fxCfg[k])||{};
      var h2='';
      defs.forEach(function(d){var v=cfg[d[0]]!=null?cfg[d[0]]:d[5];
        h2+='<div class="fxpr"><span>'+d[1]+'</span><input type="range" data-p="'+d[0]+'" min="'+d[2]+'" max="'+d[3]+'" step="'+d[4]+'" value="'+v+'"></div>';});
      if(FXCOL.indexOf(k)>=0){var cur=cfg.col||'#D4A01B';
        h2+='<div class="fxpr"><span>Colour</span><span class="fxswl">'+['#D4A01B','#4A5D4E','#62584F','#1D1D1D'].map(function(x){return '<button data-cw="'+x+'" style="background:'+x+'" class="'+(x===cur?'on':'')+'"></button>';}).join('')+'</span></div>';}
      h2+='<div class="fxpr"><button class="fxreset">Reset</button></div>';
      c.innerHTML=h2;
      c.querySelectorAll('input[type=range]').forEach(function(inp){inp.addEventListener('input',function(){
        st.fxCfg=st.fxCfg||{};st.fxCfg[k]=st.fxCfg[k]||{};st.fxCfg[k][inp.getAttribute('data-p')]=+inp.value;persist();restart(k);});});
      c.querySelectorAll('[data-cw]').forEach(function(b){b.addEventListener('click',function(){
        st.fxCfg=st.fxCfg||{};st.fxCfg[k]=st.fxCfg[k]||{};st.fxCfg[k].col=b.getAttribute('data-cw');persist();
        c.querySelectorAll('[data-cw]').forEach(function(q){q.classList.toggle('on',q===b);});restart(k);});});
      var rs=c.querySelector('.fxreset');
      if(rs)rs.onclick=function(){if(st.fxCfg)delete st.fxCfg[k];persist();startFx(k);buildCtls();};
    });
  }
  function sync(){
    ov.querySelectorAll('.fxtg').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-fx')===liveKey);});
    buildCtls();
    ov.querySelectorAll('.bgs').forEach(function(b){b.classList.toggle('on',(st.bg||'#FAF8F3').toLowerCase()===b.getAttribute('data-hex').toLowerCase());});
  }
  ov.querySelectorAll('.bgs').forEach(function(b){b.onclick=function(){
    st.bg=b.getAttribute('data-hex');persist();
    $('world').style.setProperty('--board-bg',st.bg);
    if(liveKey==='clouds'){startFx('clouds');} /* re-sample base colour */
    sync();};});
  ov.querySelectorAll('.fxtg').forEach(function(b){b.onclick=function(){
    var k=b.getAttribute('data-fx');
    startFx(k===liveKey?null:k);sync();};});
  var sv=ov.querySelector('#svtg');
  if(sv&&window.SturijSaver){
    sv.classList.toggle('on',window.SturijSaver.enabled);
    sv.onclick=function(){window.SturijSaver.set(!window.SturijSaver.enabled);sv.classList.toggle('on',window.SturijSaver.enabled);};
    if(localStorage.getItem('sturij-saver-rooms')){
      var rst=document.createElement('button');rst.className='fxreset';rst.textContent='Use Sturij rooms';rst.style.marginLeft='10px';
      sv.parentNode.insertBefore(rst,sv);
      rst.onclick=function(){localStorage.removeItem('sturij-saver-rooms');rst.remove();};
    }
  }
  ov.querySelector('.ifx').onclick=function(){ov.remove();};
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);sync();
}

/* ---------- restore ---------- */
if(st.bg)$('world').style.setProperty('--board-bg',st.bg);
if(st.fx)startFx(st.fx);
})();
