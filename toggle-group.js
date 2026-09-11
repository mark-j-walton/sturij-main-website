/* toggle-group.js — toggle group + toolbar (Motion+ Radix toggle-group/toolbar ports). LIB.
   window.SturijToggleGroup(host, {options, value, multiple?, onChange}) → {get,set}.
   window.SturijToolbar(host, sections) — sections: {kind:'toggle',…group cfg} |
   {kind:'button',label,primary?,onSelect} | 'separator'. Composes groups on one paper bar. */
(function(){
var st=document.createElement('style');
st.textContent=
'.stgl{display:inline-flex;gap:5px;padding:6px;border-radius:100px;background:#F4F1E9;box-shadow:inset 0 1px 3px rgba(35,31,27,.12),0 1px 0 rgba(255,255,255,.7)}'+
'.stgl button{all:unset;position:relative;display:inline-flex;align-items:center;justify-content:center;padding:7px 12px;border-radius:100px;cursor:pointer;font:600 10px "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#62584F;transition:color .15s}'+
'.stgl button:active{transform:scale(.9)}'+
'.stgl button:focus-visible{box-shadow:0 0 0 2px rgba(212,160,27,.5)}'+
'.stgl button>span{position:relative;z-index:1}'+
'.stgl button.on{color:#231F1B}'+
'.stgl .ind{position:absolute;inset:0;border-radius:100px;background:#E4B32E;box-shadow:0 1px 2px rgba(35,31,27,.18)}'+
'.stgl button svg{width:16px;height:16px;display:block}'+
'.stbar{display:flex;align-items:center;gap:4px;padding:8px 10px;border-radius:12px;background:#FDFCF8;box-shadow:0 2px 4px rgba(35,31,27,.08),0 10px 26px rgba(35,31,27,.14)}'+
'.stbar .stgl{background:none;box-shadow:none;padding:0}'+
'.stbar .sep{width:1px;align-self:stretch;background:rgba(98,88,79,.22);margin:2px 8px}'+
'.stbar .abtn{all:unset;cursor:pointer;font:600 10px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;padding:8px 15px;border-radius:100px;color:#62584F}'+
'.stbar .abtn.pri{background:#E4B32E;color:#231F1B;box-shadow:0 1px 2px rgba(35,31,27,.2)}'+
'.stbar .abtn:active{transform:scale(.94)}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
window.SturijToggleGroup=function(host,cfg){
  var root=document.createElement('div');root.className='stgl';
  var multiple=!!cfg.multiple;
  var val=multiple?(cfg.value||[]).slice():cfg.value;
  var btns={};
  function indicator(){return root.querySelector('.ind');}
  function moveInd(from,to){
    var old=indicator();
    var span=to.querySelector('span');
    var ind=document.createElement('div');ind.className='ind';
    to.insertBefore(ind,span);
    if(old&&old.parentNode!==to){
      var a=old.getBoundingClientRect(),b=to.getBoundingClientRect();
      old.remove();
      var dx=a.left-b.left,dw=a.width/b.width;
      anim(ind,{transform:['translateX('+dx+'px) scaleX('+dw+')','translateX(0px) scaleX(1)']},{type:'spring',stiffness:500,damping:35})||0;
    }else if(!old){anim(ind,{opacity:[0,1]},{duration:.15});}
  }
  cfg.options.forEach(function(o){
    var b=document.createElement('button');
    b.innerHTML='<span></span>';
    if(o.html)b.querySelector('span').innerHTML=o.html;else b.querySelector('span').textContent=o.label;
    if(o.ariaLabel)b.setAttribute('aria-label',o.ariaLabel);
    b.addEventListener('click',function(){
      if(multiple){
        var i=val.indexOf(o.value);
        if(i>=0){val.splice(i,1);b.classList.remove('on');anim(b,{backgroundColor:['rgba(228,179,46,.35)','rgba(228,179,46,0)']},{duration:.2});b.style.background='';}
        else{val.push(o.value);b.classList.add('on');anim(b,{backgroundColor:['rgba(228,179,46,0)','rgba(228,179,46,.35)']},{duration:.2});b.style.background='rgba(228,179,46,.35)';}
      }else{
        if(val===o.value)return;
        var prev=btns[val];if(prev)prev.classList.remove('on');
        val=o.value;b.classList.add('on');moveInd(prev,b);
      }
      if(cfg.onChange)cfg.onChange(multiple?val.slice():val);
    });
    root.appendChild(b);btns[o.value]=b;
  });
  if(multiple){val.forEach(function(v){if(btns[v]){btns[v].classList.add('on');btns[v].style.background='rgba(228,179,46,.35)';}});}
  else if(btns[val]){btns[val].classList.add('on');moveInd(null,btns[val]);}
  host.appendChild(root);
  return {get:function(){return multiple?val.slice():val;},set:function(v){if(!multiple&&btns[v])btns[v].click();}};
};
window.SturijToolbar=function(host,sections){
  var bar=document.createElement('div');bar.className='stbar';
  var groups=[];
  sections.forEach(function(s){
    if(s==='separator'){var d=document.createElement('div');d.className='sep';bar.appendChild(d);return;}
    if(s.kind==='button'){
      var b=document.createElement('button');b.className='abtn'+(s.primary?' pri':'');b.textContent=s.label;
      if(s.end)b.style.marginLeft='auto';
      b.addEventListener('click',function(){if(s.onSelect)s.onSelect();});
      bar.appendChild(b);return;
    }
    groups.push(window.SturijToggleGroup(bar,s));
  });
  host.appendChild(bar);
  return {groups:groups,el:bar};
};
})();
