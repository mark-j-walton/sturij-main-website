/* Sturij Canvas — radial launcher (Motion+ RadialMenu port), replaces the bobble tile grid.
   Top-right trigger blooms the four sections: Create · Plan · Library · Deliver;
   picking a section blooms its tools in a second arc. Tools fire the original header buttons. */
(function(){
var $=function(id){return document.getElementById(id);};
var CATS=[
 ['Create',['cvSwatches','cvUpload','cvNote','cvText','cvPin']],
 ['Plan',['cvPlan','cvWall','cvRoom','cvFurn']],
 ['Library',['cvLib']],
 ['Deliver',['cvExport','cvInfo','cvTrade','cvPresent']]
];
var tr=document.querySelector('.top .tr');if(!tr)return;
var all=[];CATS.forEach(function(c){c[1].forEach(function(id){all.push(id);});});
all.forEach(function(id){var b=$(id);if(b)b.classList.add('grouped');});

var st=document.createElement('style');
st.textContent=
'.crad{position:fixed;top:110px;right:24px;z-index:120}'+
'.crroot{position:relative;width:0;height:0}'+
'.crtrig{all:unset;position:absolute;left:-23px;top:-23px;width:46px;height:46px;border-radius:50%;background:#FDFCF8;color:#62584F;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16),0 4px 12px rgba(35,31,27,.2);transition:color .15s}'+
'.crtrig:hover{color:#1D1D1D}'+
'.crtrig svg{transition:transform .25s cubic-bezier(.22,1,.36,1)}'+
'.crad.open .crtrig svg{transform:rotate(45deg)}'+
'.critem{position:absolute;left:-20px;top:-20px;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:0;padding:0;background:#FDFCF8;color:#62584F;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.16),0 3px 10px rgba(35,31,27,.22);opacity:0;transform:scale(0);will-change:transform,opacity;transition:color .14s}'+
'.critem:hover{color:#1D1D1D}'+
'.critem.crcat{background:#D4A01B;color:#1D1D1D}'+
'.critem svg{width:17px;height:17px}'+
'.critem b{font:500 8.5px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase}'+
'.crlab{position:fixed;z-index:230;padding:6px 11px;border-radius:10px;background:rgba(253,252,248,.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font:500 9px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#1D1D1D;box-shadow:0 8px 20px rgba(35,31,27,.2),inset 0 0 0 1px rgba(255,255,255,.45);pointer-events:none;white-space:nowrap}';
document.head.appendChild(st);

var wrap=document.createElement('div');wrap.className='crad';
wrap.innerHTML='<div class="crroot"><button class="crtrig" title="Tools" aria-label="Tools"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button></div>';
document.body.appendChild(wrap);
var root=wrap.firstChild,trig=root.firstChild;
var SPRING={type:'spring',stiffness:420,damping:24};
var open=false,items=[],lab=null;
function anim(el,kf,opts){if(window.Motion&&!document.body.classList.contains('rmotion')){try{return Motion.animate(el,kf,opts);}catch(_){/**/}}return null;}
function killLab(){if(lab){lab.remove();lab=null;}}
function clear(cb){
  if(!items.length){if(cb)cb();return;}
  var left=items.length,list=items;items=[];
  list.forEach(function(b,i){
    var a=anim(b,{opacity:0,scale:0,x:0,y:0},Object.assign({delay:(list.length-1-i)*.02},SPRING));
    function done(){b.remove();if(--left===0&&cb)cb();}
    if(a)a.then(done,done);else done();
  });
  killLab();
}
function bloom(defs){
  var A0=95,SPAN=Math.min(160,40*(defs.length-1)),R=76;
  defs.forEach(function(df,i){
    var ang=(A0+(defs.length===1?0:(i/(defs.length-1))*SPAN))*Math.PI/180;
    var b=document.createElement('button');b.className='critem'+(df.cat?' crcat':'');
    b.innerHTML=df.icon||('<b>'+df.label.slice(0,2)+'</b>');
    b._x=Math.cos(ang)*R;b._y=Math.sin(ang)*R;
    b.onmouseenter=function(){killLab();lab=document.createElement('div');lab.className='crlab';lab.textContent=df.label;document.body.appendChild(lab);
      var r=b.getBoundingClientRect();lab.style.left=(r.left-lab.offsetWidth-10)+'px';lab.style.top=(r.top+r.height/2-lab.offsetHeight/2)+'px';};
    b.onmouseleave=killLab;
    b.onclick=function(e){e.stopPropagation();df.fire(b);};
    root.appendChild(b);items.push(b);
    var a=anim(b,{opacity:1,scale:1,x:b._x,y:b._y},Object.assign({delay:i*.04},SPRING));
    if(!a){b.style.opacity=1;b.style.transform='scale(1) translate('+b._x+'px,'+b._y+'px)';}
  });
}
function catDefs(){
  return CATS.map(function(c){
    return {label:c[0],cat:true,fire:function(){
      if(c[1].length===1){var src=$(c[1][0]);close();if(src)setTimeout(function(){src.click();},60);return;}
      clear(function(){bloom(toolDefs(c));arm();});
    }};
  });
}
function toolDefs(c){
  var defs=[{label:'Back',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="15" height="15"><path d="M15 6l-6 6 6 6"/></svg>',fire:function(){clear(function(){bloom(catDefs());});}}];
  c[1].forEach(function(id){
    var src=$(id);if(!src)return;
    var svg=src.querySelector('svg'),label=(src.querySelector('span')||{}).textContent||src.title||id;
    defs.push({label:label,icon:svg?svg.outerHTML:null,fire:function(){close();setTimeout(function(){src.click();},60);}});
  });
  return defs;
}
function close(){open=false;wrap.classList.remove('open');clear();clearTimeout(fadeT);}
/* unused menus fade away on their own */
var fadeT=0;
function arm(){clearTimeout(fadeT);if(open)fadeT=setTimeout(function(){close();},6000);}
wrap.addEventListener('pointermove',arm);
wrap.addEventListener('pointerdown',arm);
trig.onclick=function(e){
  e.stopPropagation();
  if(open){close();return;}
  open=true;wrap.classList.add('open');bloom(catDefs());arm();
};
document.addEventListener('pointerdown',function(e){if(open&&!wrap.contains(e.target))close();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&open)close();});
})();

/* register canvas tools with the command palette */
(function(){
  if(!window.SturijCommands)window.SturijCommands=[];
  var CATS=[['Create',['cvSwatches','cvUpload','cvNote','cvText','cvPin']],['Plan',['cvPlan','cvWall','cvRoom','cvFurn']],['Library',['cvLib']],['Deliver',['cvExport','cvInfo','cvTrade','cvPresent']]];
  CATS.forEach(function(c){c[1].forEach(function(id){
    var src=document.getElementById(id);if(!src)return;
    var label=(src.querySelector('span')||{}).textContent||src.title||id;
    window.SturijCommands.push({group:c[0],label:label,keywords:['canvas','tool'],run:function(){src.click();}});
  });});
})();
