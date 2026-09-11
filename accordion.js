/* accordion.js — spring accordion (Motion+ Base UI accordion port). LIB — mount where needed.
   window.SturijAccordion(hostEl, [{title, content}]) → element. Paper card, dashed rules,
   height-spring open with blur-in content, rotating chevron. One panel open at a time. */
(function(){
var st=document.createElement('style');
st.textContent=
'.sacc{display:flex;flex-direction:column;background:#FDFCF8;border-radius:14px;box-shadow:0 2px 4px rgba(35,31,27,.08),0 14px 34px rgba(35,31,27,.12);max-width:500px;width:100%}'+
'.sacc .sec{padding:18px 20px;position:relative}'+
'.sacc .sec+.sec{border-top:1px dashed rgba(98,88,79,.3)}'+
'.sacc .trg{all:unset;width:100%;display:flex;align-items:center;justify-content:space-between;cursor:pointer;font:600 16px "Cormorant Garamond",Georgia,serif;color:#1D1D1D}'+
'.sacc .trg svg{color:#62584F;transition:transform .35s cubic-bezier(.22,1,.36,1)}'+
'.sacc .sec.open .trg svg{transform:rotate(180deg)}'+
'.sacc .pan{overflow:hidden;height:0;mask-image:linear-gradient(to bottom,black 50%,transparent 100%)}'+
'.sacc .sec.open .pan{mask-image:linear-gradient(to bottom,black 100%,transparent 100%)}'+
'.sacc .trg:focus-visible{outline:none}'+
'.sacc .trg .fring{position:absolute;inset:-10px;background:rgba(228,179,46,.14);border-radius:8px;z-index:0;opacity:0}'+
'.sacc .trg:focus-visible .fring{opacity:1}'+
'.sacc .trg span,.sacc .trg svg{position:relative;z-index:1}'+
'.sacc .trg:active{transform:scale(.98)}'+
'.sacc .inner{padding:14px 0 2px;font:400 11.5px/1.65 "IBM Plex Mono",monospace;color:#62584F}'+
'.sacc .inner p{margin:0}.sacc .inner p+p{margin-top:1em}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
window.SturijAccordion=function(host,items){
  var root=document.createElement('div');root.className='sacc';
  var open=null;
  items.forEach(function(it){
    var s=document.createElement('div');s.className='sec';
    s.innerHTML='<button class="trg"><div class="fring"></div><span></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button><div class="pan"><div class="inner">'
      +String(it.content).split('\n\n').map(function(p){return '<p>'+p+'</p>';}).join('')+'</div></div>';
    s.querySelector('span').textContent=it.title;
    var pan=s.querySelector('.pan'),inner=s.querySelector('.inner');
    function setH(o){
      var h=o?inner.offsetHeight:0;
      anim(pan,{height:[pan.offsetHeight,h]},{type:'spring',stiffness:300,damping:28})||((pan.style.height=h+'px'));
      pan.style.height=h+'px';
      anim(inner,o?{opacity:[0,1],filter:['blur(2px)','blur(0px)']}:{opacity:[1,0],filter:['blur(0px)','blur(2px)']},{duration:.25});
      s.classList.toggle('open',o);
    }
    s.querySelector('.trg').addEventListener('click',function(){
      if(open===s){setH(false);open=null;return;}
      if(open){open.classList.remove('open');var op=open.querySelector('.pan');anim(op,{height:[op.offsetHeight,0]},{type:'spring',stiffness:300,damping:28});op.style.height='0px';}
      setH(true);open=s;
    });
    root.appendChild(s);
  });
  host.appendChild(root);
  return root;
};
})();
