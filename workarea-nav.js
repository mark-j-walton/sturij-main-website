/* workarea-nav.js — Materials · Studio · Creative switcher (glass pill) + curtain wash transition.
   Shared by studio.html and canvas.html. Config: localStorage 'sturij.workareas'
   {items:[{label,href}], wash:{<label>:hex}, fade:{inMs,holdMs,outMs}} — window.setWorkareas(cfg) from admin.
   Motion+ hook: when the licensed motion-plus bundle lands, swap the wash animate calls for
   curtains(() => nav(), { effect: blinds({size:64,direction:'row'}) }). */
(function(){
var DEF={
  items:[{label:'Materials',href:'studio.html'},{label:'Studio',href:'canvas.html'},{label:'Creative',href:'creative.html'}],
  wash:{Materials:'#7A8B7F',Studio:'#62584F',Creative:'#D4A01B'},
  fade:{inMs:380,holdMs:500,outMs:1900}
};
var cfg;try{cfg=Object.assign({},DEF,JSON.parse(localStorage.getItem('sturij.workareas')||'{}'));}catch(e){cfg=DEF;}
/* migration: Creative now has its own page */
cfg.items=(cfg.items||[]).map(function(it){return it.label==='Creative'&&it.href==='canvas.html'?{label:'Creative',href:'creative.html'}:it;});
window.setWorkareas=function(c){cfg=Object.assign({},cfg,c);localStorage.setItem('sturij.workareas',JSON.stringify(cfg));paint();};

var st=document.createElement('style');
st.textContent=
'.wanav{position:fixed;top:10px;right:84px;z-index:119;display:flex;gap:4px;align-items:center;padding:5px 10px;border-radius:999px;background:rgba(253,252,248,.72);backdrop-filter:blur(14px) saturate(1.25);-webkit-backdrop-filter:blur(14px) saturate(1.25);box-shadow:0 2px 4px rgba(35,31,27,.1),0 10px 24px rgba(35,31,27,.18),inset 0 0 0 1px rgba(255,255,255,.45)}'+
'.wanav button{all:unset;cursor:pointer;font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#62584F;padding:4px 8px;border-radius:999px;transition:color .15s,background .15s}'+
'.wanav button:hover{color:#1D1D1D;background:rgba(29,29,29,.05)}'+
'.wanav button.on{color:#1D1D1D}'+
'.wanav{position:fixed}'+
'.wanav .waind{position:absolute;top:5px;bottom:5px;border-radius:999px;background:#D4A01B;z-index:0;box-shadow:0 1px 2px rgba(35,31,27,.18);transition:left .35s cubic-bezier(.22,1.2,.36,1),width .35s cubic-bezier(.22,1.2,.36,1)}'+
'.wanav button{position:relative;z-index:1}'+
'.wanav .waedit{font-size:10px;opacity:.4}.wanav .waedit:hover{opacity:.9}'+
'@media (max-width:1000px){.wanav{top:auto;bottom:64px;right:14px}}'+
'.wawash{position:fixed;inset:0;z-index:400;pointer-events:none;overflow:hidden}'+
'.wadoor{position:absolute;top:0;bottom:0;width:50.5%}'+
'.wadoor.l{left:0}.wadoor.r{right:0}'+
'.wamid{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}'+
'.wawash img{position:absolute;left:50%;top:50%;width:340px;transform:translate(-50%,-50%);opacity:.04}'+
'.wawash b{font:600 clamp(60px,9vw,150px) "Cormorant Garamond",Georgia,serif;color:rgba(250,248,243,.96);letter-spacing:.02em}';
document.head.appendChild(st);

function current(){var p=location.pathname.split('/').pop()||'';var hit=null;
  cfg.items.forEach(function(it){if(it.href.split('#')[0]===p)hit=hit||it.label;});return hit;}
function anim(el,kf,opts){if(window.Motion&&!document.body.classList.contains('rmotion')){try{return Motion.animate(el,kf,opts);}catch(_){/**/}}return null;}

var row=document.createElement('nav');row.className='wanav';document.body.appendChild(row);
function placeInd(){
  var ind=row.querySelector('.waind'),on=row.querySelector('button.on');
  if(!ind||!on)return;
  ind.style.left=(on.offsetLeft)+'px';ind.style.width=(on.offsetWidth)+'px';
}
function paint(){
  row.innerHTML='';
  var ind=document.createElement('div');ind.className='waind';row.appendChild(ind);
  cfg.items.forEach(function(it){
    var b=document.createElement('button');b.textContent=it.label;
    if(it.label===current())b.classList.add('on');
    b.onclick=function(ev){
      row.querySelectorAll('button.on').forEach(function(x){x.classList.remove('on');});
      b.classList.add('on');placeInd();
      go(it,ev);
    };
    row.appendChild(b);
  });
  var ed=document.createElement('button');ed.className='waedit';ed.title='Rename work areas';ed.textContent='\u270e';
  ed.onclick=function(){
    cfg.items=cfg.items.map(function(it){var v=prompt('Label for "'+it.label+'"',it.label);return {label:(v||it.label).trim()||it.label,href:it.href};});
    localStorage.setItem('sturij.workareas',JSON.stringify(cfg));paint();
  };
  row.appendChild(ed);
}
paint();
requestAnimationFrame(placeInd);addEventListener('resize',placeInd);

function washEl(label){
  var col=(cfg.wash&&cfg.wash[label])||'#62584F';
  var w=document.createElement('div');w.className='wawash';
  w.innerHTML='<div class="wadoor l" style="background:'+col+'"></div><div class="wadoor r" style="background:'+col+'"></div>'
    +'<div class="wamid"><img src="brand/sturij-mark-white.png" alt=""><b>'+label+'</b></div>';
  document.body.appendChild(w);return w;
}
function doorEls(w){return [w.querySelector('.wadoor.l'),w.querySelector('.wadoor.r'),w.querySelector('.wamid')];}
function go(it,ev){
  if(it.label===current())return;
  var w=washEl(it.label),d=doorEls(w);
  /* iris: the wash grows from the click point (motion-plus iris(), approximated with clip-path) */
  var ox=ev?ev.clientX:innerWidth-40,oy=ev?ev.clientY:70;
  w.style.clipPath='circle(0px at '+ox+'px '+oy+'px)';
  d[0].style.transform=d[1].style.transform='none';
  try{sessionStorage.setItem('sturij.wa.arrive',it.label);}catch(e){}
  function nav(){location.href=it.href;}
  var R=Math.hypot(Math.max(ox,innerWidth-ox),Math.max(oy,innerHeight-oy))+40;
  var a=anim(w,{clipPath:['circle(0px at '+ox+'px '+oy+'px)','circle('+R+'px at '+ox+'px '+oy+'px)']},{duration:cfg.fade.inMs/1000,ease:[.22,1,.36,1]});
  anim(d[2],{opacity:[0,1]},{duration:cfg.fade.inMs/1000*1.2});
  if(a){a.then(nav,nav);}else{w.style.clipPath='none';setTimeout(nav,cfg.fade.inMs);}
}
(function(){
  var label;try{label=sessionStorage.getItem('sturij.wa.arrive');sessionStorage.removeItem('sturij.wa.arrive');}catch(e){}
  if(!label||label!==current())return;
  var w=washEl(label),d=doorEls(w);
  setTimeout(function(){
    var dur=cfg.fade.outMs/1000;
    /* iris out: shrinks away toward the centre */
    var R2=Math.hypot(innerWidth/2,innerHeight/2)+40;
    var a1=anim(w,{clipPath:['circle('+R2+'px at 50% 50%)','circle(0px at 50% 50%)']},{duration:dur,ease:[.65,0,.35,1]});
    anim(d[2],{opacity:[1,0]},{duration:dur*.6});
    function done(){w.remove();}
    if(a1){a1.then(done,done);}
    else{w.style.transition='opacity '+cfg.fade.outMs+'ms ease';w.style.opacity=0;setTimeout(done,cfg.fade.outMs+80);}
  },cfg.fade.holdMs);
})();
})();
