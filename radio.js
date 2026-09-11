/* radio.js — animated radio group (Motion+ Base UI radio port). LIB.
   window.SturijRadio(hostEl, {options:[{value,label}], value, onChange}) → {set(v), get()}.
   Embossed paper wells; on select a gold ring draws in (easeOut .2s) and the dot
   springs up (400/25); hover 1.05 / tap 0.95 squash on the control. */
(function(){
var st=document.createElement('style');
st.textContent=
'.srad{display:flex;flex-direction:column;gap:10px}'+
'.srad .row{display:flex;align-items:center;gap:12px}'+
'.srad .ctl{all:unset;position:relative;width:24px;height:24px;border-radius:50%;background:#F4F1E9;box-shadow:inset 0 1px 3px rgba(35,31,27,.16),0 1px 0 rgba(255,255,255,.7);cursor:pointer;transition:transform .15s}'+
'.srad .ctl:hover{transform:scale(1.05)}.srad .ctl:active{transform:scale(.95)}'+
'.srad .ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid #D4A01B;opacity:0}'+
'.srad .dot{position:absolute;inset:0;margin:auto;width:10px;height:10px;border-radius:50%;background:#D4A01B;transform:scale(0)}'+
'.srad label{font:500 11.5px "IBM Plex Mono",monospace;color:#1D1D1D;cursor:pointer}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
window.SturijRadio=function(host,cfg){
  var root=document.createElement('div');root.className='srad';
  var cur=cfg.value,rows={};
  cfg.options.forEach(function(o){
    var row=document.createElement('div');row.className='row';
    var b=document.createElement('button');b.className='ctl';
    b.innerHTML='<div class="ring"></div><div class="dot"></div>';
    var lb=document.createElement('label');lb.textContent=o.label;
    function pick(){set(o.value,true);}
    b.addEventListener('click',pick);lb.addEventListener('click',pick);
    row.appendChild(b);row.appendChild(lb);root.appendChild(row);
    rows[o.value]=b;
  });
  function show(b,on){
    var ring=b.querySelector('.ring'),dot=b.querySelector('.dot');
    if(on){
      anim(ring,{opacity:[0,1],transform:['scale(.95)','scale(1)'],borderWidth:['3px','1.5px']},{duration:.2,ease:'easeOut'})||(ring.style.opacity=1);
      ring.style.opacity=1;
      anim(dot,{transform:['scale(0)','scale(1)'],opacity:[0,1]},{type:'spring',stiffness:400,damping:25});
      dot.style.transform='scale(1)';dot.style.opacity=1;
    }else{
      anim(ring,{opacity:[1,0],transform:['scale(1)','scale(.95)']},{duration:.2});ring.style.opacity=0;
      anim(dot,{transform:['scale(1)','scale(0)'],opacity:[1,0]},{duration:.15});dot.style.transform='scale(0)';dot.style.opacity=0;
    }
  }
  function set(v,fire){
    if(v===cur)return;
    if(rows[cur])show(rows[cur],false);
    cur=v;if(rows[cur])show(rows[cur],true);
    if(fire&&cfg.onChange)cfg.onChange(v);
  }
  if(rows[cur])show(rows[cur],true);
  host.appendChild(root);
  return {set:function(v){set(v,false);},get:function(){return cur;}};
};
})();
