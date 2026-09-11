/* tabs.js — animated tabs (Motion+ Radix tabs + segmented tabs ports). LIB.
   window.SturijTabs(host, {tabs:[{value,label,render(el)}], value, segmented?, onChange}) → {set,get}.
   Default: paper card, gold underline slides, blur crossfade. segmented:true — embossed
   pill control with a sliding paper indicator (500/35) and direction-aware content slide
   (x ±50 + blur 4px, ease [0.25,1,0.5,1]). */
(function(){
var st=document.createElement('style');
st.textContent=
'.stab{display:flex;flex-direction:column;width:100%;max-width:440px;background:#FDFCF8;border-radius:14px;overflow:hidden;box-shadow:0 2px 4px rgba(35,31,27,.08),0 14px 34px rgba(35,31,27,.12)}'+
'.stab .lst{display:flex;border-bottom:1px dashed rgba(98,88,79,.3)}'+
'.stab .trg{all:unset;position:relative;flex:1;height:46px;display:flex;align-items:center;justify-content:center;cursor:pointer;font:600 10.5px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#62584F;transition:color .2s}'+
'.stab .trg:hover,.stab .trg.on{color:#1D1D1D}'+
'.stab .und{position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#D4A01B}'+
'.stab .body{padding:20px;will-change:opacity,filter}'+
'.stab.seg{background:none;box-shadow:none;overflow:visible;gap:14px}'+
'.stab.seg .lst{border-bottom:0;padding:4px;border-radius:12px;background:#F4F1E9;box-shadow:inset 0 1px 3px rgba(35,31,27,.12),0 1px 0 rgba(255,255,255,.7)}'+
'.stab.seg .trg{height:38px;border-radius:9px}'+
'.stab.seg .und{position:absolute;inset:0;height:auto;border-radius:9px;background:#FDFCF8;box-shadow:0 1px 3px rgba(35,31,27,.14);z-index:0}'+
'.stab.seg .trg span{position:relative;z-index:1}'+
'.stab.seg .bodywrap{position:relative;overflow:hidden;border-radius:14px;background:#FDFCF8;box-shadow:0 2px 4px rgba(35,31,27,.08),0 14px 34px rgba(35,31,27,.12)}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
window.SturijTabs=function(host,cfg){
  var root=document.createElement('div');root.className='stab'+(cfg.segmented?' seg':'');
  var lst=document.createElement('div');lst.className='lst';
  var body=document.createElement('div');body.className='body';
  root.appendChild(lst);
  if(cfg.segmented){var bw=document.createElement('div');bw.className='bodywrap';bw.appendChild(body);root.appendChild(bw);}
  else root.appendChild(body);
  var cur=cfg.value||cfg.tabs[0].value,btns={};
  function moveUnd(from,to){
    var old=lst.querySelector('.und');
    var u=document.createElement('div');u.className='und';to.appendChild(u);
    if(old){var a=old.getBoundingClientRect(),b=to.getBoundingClientRect();old.remove();
      anim(u,{transform:['translateX('+(a.left-b.left)+'px)','translateX(0px)']},{type:'spring',stiffness:500,damping:40});}
  }
  function show(v,animate,dir){
    var t=cfg.tabs.filter(function(x){return x.value===v;})[0];if(!t)return;
    var seg=cfg.segmented,off=(dir||0)*50;
    function fill(){
      body.innerHTML='';t.render(body);
      if(animate){
        if(seg)anim(body,{opacity:[0,1],filter:['blur(4px)','blur(0px)'],transform:['translateX('+off+'px)','translateX(0px)']},{duration:.3,ease:[.25,1,.5,1]});
        else anim(body,{opacity:[0,1],filter:['blur(5px)','blur(0px)']},{duration:.25});
      }
      body.style.opacity=1;body.style.filter='none';body.style.transform='none';
    }
    if(animate){
      var a=seg?anim(body,{opacity:[1,0],filter:['blur(0px)','blur(4px)'],transform:['translateX(0px)','translateX('+(-off)+'px)']},{duration:.15})
               :anim(body,{opacity:[1,0],filter:['blur(0px)','blur(5px)']},{duration:.15});
      if(a&&a.then)a.then(fill);else setTimeout(fill,150);
    }else fill();
  }
  cfg.tabs.forEach(function(t,ti){
    var b=document.createElement('button');b.className='trg';b.innerHTML='<span></span>';b.querySelector('span').textContent=t.label;
    b.addEventListener('click',function(){
      if(cur===t.value)return;
      var prevIdx=cfg.tabs.map(function(x){return x.value;}).indexOf(cur);
      var dir=ti>prevIdx?1:-1;
      var prev=btns[cur];if(prev)prev.classList.remove('on');
      cur=t.value;b.classList.add('on');moveUnd(prev,b);show(cur,true,dir);
      if(cfg.onChange)cfg.onChange(cur);
    });
    lst.appendChild(b);btns[t.value]=b;
  });
  btns[cur].classList.add('on');moveUnd(null,btns[cur]);show(cur,false,0);
  host.appendChild(root);
  return {set:function(v){if(btns[v])btns[v].click();},get:function(){return cur;}};
};
})();
