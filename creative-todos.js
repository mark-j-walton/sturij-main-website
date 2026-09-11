/* creative-todos.js — vanilla port of the Motion Reorder to-do list (drag reorder, strike-through, completed sink). */
addEventListener('DOMContentLoaded',function(){
var COLS=['#D4A01B','#7A8B7F','#B98A4A','#9DB5AF','#8a3b2e','#62584F'];
var KEY='sturij.creative.todos';
var todos;try{todos=JSON.parse(localStorage.getItem(KEY));}catch(e){}
if(!Array.isArray(todos)||!todos.length)todos=[
 {id:1,text:'Brief the Halloran moodboard',done:false},
 {id:2,text:'Pick cover look for spring decks',done:false},
 {id:3,text:'Request limewash trend research',done:false},
 {id:4,text:'Crop board shots for Instagram',done:false}];
var list=document.getElementById('tlist'),add=document.getElementById('tadd');
if(!list)return;
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){/**/}}return null;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(todos));}catch(e){}}
function colorOf(t){return COLS[t.id%COLS.length];}
function tick(){return '<svg width="10" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
function render(){
  list.innerHTML='';
  todos.forEach(function(t){
    var li=document.createElement('li');li.className='titem';li._t=t;
    var c=colorOf(t);
    li.innerHTML='<button class="tchk" style="border-color:'+c+';background:'+(t.done?c:'transparent')+'">'+(t.done?tick():'')
      +'</button><span class="ttxtw"><span class="ttxt" style="opacity:'+(t.done?.45:1)+'">'+t.text
      +'</span><span class="tstrike" style="background:'+c+';transform:scaleX('+(t.done?1:0)+')"></span></span>';
    var chk=li.querySelector('.tchk');
    chk.addEventListener('click',function(e){e.stopPropagation();toggle(t,li);});
    chk.addEventListener('pointerdown',function(e){e.stopPropagation();});
    wireDrag(li);
    list.appendChild(li);
  });
}
function flip(fn){
  var before={};[].forEach.call(list.children,function(r){before[r._t.id]=r.getBoundingClientRect().top;});
  fn();
  [].forEach.call(list.children,function(r){
    var d=before[r._t.id]!==undefined?before[r._t.id]-r.getBoundingClientRect().top:0;
    if(d)anim(r,{y:[d,0]},{type:'spring',stiffness:400,damping:30});
  });
}
var gestureOn=false,pendingSink=null;
function sinkDone(){
  flip(function(){
    todos=todos.filter(function(q){return !q.done;}).concat(todos.filter(function(q){return q.done;}));
    save();render();
  });
}
function toggle(t,li){
  t.done=!t.done;save();
  var strike=li.querySelector('.tstrike'),txt=li.querySelector('.ttxt'),chk=li.querySelector('.tchk');
  chk.style.background=t.done?colorOf(t):'transparent';
  chk.innerHTML=t.done?tick():'';
  anim(strike,{scaleX:t.done?[0,1]:[1,0]},{duration:.4,ease:'easeOut'})||(strike.style.transform='scaleX('+(t.done?1:0)+')');
  anim(txt,{opacity:t.done?.45:1},{duration:.4});
  if(t.done&&window.SturijConfetti){var cr=chk.getBoundingClientRect();SturijConfetti.burst(cr.left+cr.width/2,cr.top+cr.height/2,{particleCount:34,startVelocity:16,size:.8});}
  if(t.done)setTimeout(function(){
    if(gestureOn){pendingSink=sinkDone;return;} /* never rebuild mid-gesture */
    sinkDone();
  },600);
}
function wireDrag(li){
  li.addEventListener('pointerdown',function(e){
    e.preventDefault();try{li.setPointerCapture(e.pointerId);}catch(_){/**/}
    gestureOn=true;
    var startY=e.clientY,startX=e.clientX,moved=false,axis=null;
    function slotTop(){var tr=li.style.transform;li.style.transform='none';var t=li.getBoundingClientRect().top;li.style.transform=tr;return t;}
    function paintSwipe(dx){
      li.style.transform='translateX('+dx+'px)';
      var w=li.offsetWidth,p=dx/w;
      if(p>0.08)li.style.background='rgba(212,160,27,'+Math.min(.35,p*.6)+')';
      else if(p<-0.08)li.style.background='rgba(138,59,46,'+Math.min(.3,-p*.5)+')';
      else li.style.background='';
    }
    function mv(ev){
      var dx=ev.clientX-startX,dy=ev.clientY-startY;
      if(!axis&&(Math.abs(dx)>6||Math.abs(dy)>6)){axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(axis==='y')li.classList.add('drag');}
      if(!axis)return;moved=true;
      if(axis==='x'){paintSwipe(dx);return;}
      li.style.transform='translateY('+dy+'px)';
      var sibs=[].slice.call(list.children),i=sibs.indexOf(li);
      var prev=sibs[i-1],next=sibs[i+1];
      var r=li.getBoundingClientRect();
      if(prev&&r.top<prev.getBoundingClientRect().top+prev.offsetHeight/2){
        var o1=slotTop();list.insertBefore(li,prev);startY+=slotTop()-o1;
        li.style.transform='translateY('+(ev.clientY-startY)+'px)';
        anim(prev,{y:[-(li.offsetHeight+10),0]},{type:'spring',stiffness:400,damping:30});
      }else if(next&&r.bottom>next.getBoundingClientRect().bottom-next.offsetHeight/2){
        var o2=slotTop();list.insertBefore(next,li);startY+=slotTop()-o2;
        li.style.transform='translateY('+(ev.clientY-startY)+'px)';
        anim(next,{y:[li.offsetHeight+10,0]},{type:'spring',stiffness:400,damping:30});
      }
    }
    function up(ev){
      window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
      li.classList.remove('drag');
      gestureOn=false;
      var runPending=function(){if(pendingSink){var p=pendingSink;pendingSink=null;setTimeout(p,80);}};
      if(axis==='x'){
        var dx=ev.clientX-startX,w=li.offsetWidth;
        li.style.background='';
        if(dx>w*.45){li.style.transform='';toggle(li._t,li);}
        else if(dx<-w*.45){
          var done=false;
          var gone=function(){if(done)return;done=true;todos=todos.filter(function(q){return q!==li._t;});save();flip(render);runPending();};
          var a=anim(li,{x:[dx,-w-40],opacity:[1,0]},{duration:.2,ease:'easeOut'});
          if(a)a.then(gone,gone);
          setTimeout(gone,300); /* belt & braces: never rely on the anim promise alone */
          return;
        }else{var curx=dx;li.style.transform='';if(curx)anim(li,{x:[curx,0]},{type:'spring',stiffness:900,damping:80});}
        runPending();
        return;
      }
      var cur=parseFloat((li.style.transform.match(/-?[\d.]+/)||[0])[0])||0;
      li.style.transform='';
      if(cur)anim(li,{y:[cur,0]},{type:'spring',stiffness:420,damping:30});
      if(moved){todos=[].map.call(list.children,function(r){return r._t;});save();}
      runPending();
    }
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  });
}
if(add)add.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;
  var v=add.value.trim();if(!v)return;
  add.value='';
  todos.unshift({id:Date.now()%997,text:v,done:false});save();
  flip(render);
});
render();
});
