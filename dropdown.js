/* dropdown.js — anchored dropdown + context menu (Motion+ Radix dropdown/context-menu ports). LIB.
   window.SturijDropdown(triggerEl, items) — click-anchored menu.
   window.SturijContextMenu(targetEl, items) — right-click menu at the pointer, spring scale-in (400/20).
   items: [{label, shortcut?, danger?, disabled?, checked?(fn|bool), children?[…], onSelect}] or 'separator'.
   Submenus fly out to the right (x −10→0); checkbox items show a gold ✓. Esc / outside click closes. */
(function(){
var st=document.createElement('style');
st.textContent=
'.sdd{position:fixed;z-index:100000;min-width:170px;background:#FDFCF8;border-radius:10px;padding:5px;box-shadow:0 2px 4px rgba(35,31,27,.1),0 14px 34px rgba(35,31,27,.22);transform-origin:top left;opacity:0}'+
'.sdd button{all:unset;display:block;width:calc(100% - 24px);padding:8px 12px;border-radius:6px;cursor:pointer;font:500 11px "IBM Plex Mono",monospace;color:#1D1D1D;transition:background .12s}'+
'.sdd button:hover,.sdd button:focus-visible{background:rgba(228,179,46,.16)}'+
'.sdd button:active{transform:scale(.95)}'+
'.sdd button.danger{color:#B5502F}.sdd button.danger:hover{background:rgba(181,80,47,.12)}'+
'.sdd .sep{height:1px;background:rgba(98,88,79,.22);margin:5px 4px}'+
'.sdd button{display:flex;align-items:center;justify-content:space-between;gap:16px}'+
'.sdd .sc{color:rgba(98,88,79,.55);font-size:10px}'+
'.sdd button.dis{color:rgba(98,88,79,.45);cursor:not-allowed}.sdd button.dis:hover{background:none}'+
'.sdd .chk{width:14px;display:inline-block;color:#D4A01B;margin-right:2px}'+
'.sdd .lbl{flex:1;display:flex;align-items:center;text-align:left}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
window.SturijDropdown=function(trigger,items){
  var menu=null;
  function close(){
    if(!menu)return;var m=menu;menu=null;
    var a=anim(m,{opacity:[1,0],transform:['scale(1)','scale(.85)']},{duration:.15});
    var fin=function(){m.remove();};if(a&&a.then)a.then(fin);else setTimeout(fin,160);
    document.removeEventListener('pointerdown',onOut,true);
    document.removeEventListener('keydown',onKey);
  }
  function onOut(e){if(menu&&!menu.contains(e.target)&&e.target!==trigger)close();}
  function onKey(e){if(e.key==='Escape')close();}
  function open(){
    if(menu){close();return;}
    menu=document.createElement('div');menu.className='sdd';
    items.forEach(function(it){
      if(it==='separator'){var s=document.createElement('div');s.className='sep';menu.appendChild(s);return;}
      var b=document.createElement('button');b.textContent=it.label;
      if(it.danger)b.className='danger';
      b.addEventListener('click',function(){close();if(it.onSelect)it.onSelect();});
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    var r=trigger.getBoundingClientRect(),mw=menu.offsetWidth,mh=menu.offsetHeight;
    var x=Math.min(r.left,innerWidth-mw-8),y=r.bottom+10;
    if(y+mh>innerHeight-8){y=r.top-10-mh;menu.style.transformOrigin='bottom left';}
    menu.style.left=x+'px';menu.style.top=y+'px';
    anim(menu,{opacity:[0,1],transform:['scale(.85)','scale(1)']},{duration:.2})||(menu.style.opacity=1);
    setTimeout(function(){
      document.addEventListener('pointerdown',onOut,true);
      document.addEventListener('keydown',onKey);
    },0);
  }
  trigger.addEventListener('click',open);
  return {open:open,close:close};
};
window.SturijContextMenu=function(target,items){
  var open=[];
  function closeAll(){
    open.forEach(function(m){var a=anim(m,{opacity:[1,0],transform:['scale(1)','scale(.9)']},{duration:.12});var f=function(){m.remove();};if(a&&a.then)a.then(f);else setTimeout(f,130);});
    open=[];document.removeEventListener('pointerdown',onOut,true);document.removeEventListener('keydown',onKey);
  }
  function onOut(e){if(!open.some(function(m){return m.contains(e.target);}))closeAll();}
  function onKey(e){if(e.key==='Escape')closeAll();}
  function build(list,x,y,sub){
    var menu=document.createElement('div');menu.className='sdd';
    list.forEach(function(it){
      if(it==='separator'){var s=document.createElement('div');s.className='sep';menu.appendChild(s);return;}
      var b=document.createElement('button');
      var isChk=('checked' in it);
      var chk=typeof it.checked==='function'?it.checked():it.checked;
      b.innerHTML='<span class="lbl">'+(isChk?'<span class="chk">'+(chk?'\u2713':'')+'</span>':'')+'<span></span></span>'+(it.children?'<span class="sc">\u203a</span>':it.shortcut?'<span class="sc">'+it.shortcut+'</span>':'');
      b.querySelector('.lbl span:last-child').textContent=it.label;
      if(it.danger)b.classList.add('danger');
      if(it.disabled){b.classList.add('dis');menu.appendChild(b);return;}
      if(it.children){
        var subMenu=null;
        b.addEventListener('pointerenter',function(){
          if(subMenu)return;var r=b.getBoundingClientRect();
          subMenu=build(it.children,r.right+4,r.top-5,true);
        });
      }else{
        b.addEventListener('click',function(){
          if(isChk&&it.onToggle){it.onToggle(!chk);closeAll();return;}
          closeAll();if(it.onSelect)it.onSelect();
        });
      }
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    var mw=menu.offsetWidth,mh=menu.offsetHeight;
    menu.style.left=Math.min(x,innerWidth-mw-8)+'px';
    menu.style.top=Math.min(y,innerHeight-mh-8)+'px';
    if(sub)anim(menu,{opacity:[0,1],transform:['translateX(-10px)','translateX(0px)']},{type:'spring',stiffness:400,damping:20})||(menu.style.opacity=1);
    else anim(menu,{opacity:[0,1],transform:['scale(.9)','scale(1)']},{type:'spring',stiffness:400,damping:20})||(menu.style.opacity=1);
    menu.style.opacity=1;
    open.push(menu);
    return menu;
  }
  target.addEventListener('contextmenu',function(e){
    e.preventDefault();closeAll();
    build(typeof items==='function'?items():items,e.clientX,e.clientY,false);
    setTimeout(function(){document.addEventListener('pointerdown',onOut,true);document.addEventListener('keydown',onKey);},0);
  });
};
})();
