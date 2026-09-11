/* studio-motion.js — Motion springs for studio show/hide, zero edits to studio.js.
   Watches drawers/modals/cards appear and lands them per DESIGN.md §2.4 (things settle). */
(function(){
if(!window.Motion)return;
var SEL='.hdraw,.sdraw,.skdraw,.tpdraw,.favdraw,.mcard,.trbox,.infobox,.scard,.lightbox,.pfpanel,.est';
function reduced(){return document.body.classList.contains('rmotion')||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function visible(el){return !el.hidden&&el.offsetParent!==null;}
function landIn(el){
  if(reduced())return;
  try{Motion.animate(el,{y:[14,0],opacity:[0,1],scale:[.985,1]},{type:'spring',stiffness:340,damping:28});}catch(_){/**/}
}
var wasVis=new WeakMap();
var mo=new MutationObserver(function(muts){
  var seen=new Set();
  function check(t){
    if(!t||seen.has(t))return;seen.add(t);
    var v=visible(t),was=wasVis.get(t)||false;
    if(v&&!was)landIn(t);
    wasVis.set(t,v);
  }
  muts.forEach(function(m){
    if(m.type==='childList')m.addedNodes.forEach(function(n){
      if(n.nodeType!==1)return;
      if(n.matches&&n.matches(SEL))check(n);
      if(n.querySelectorAll)n.querySelectorAll(SEL).forEach(check);
    });
    if(m.target.nodeType===1){
      var t=m.target.closest?m.target.closest(SEL):null;
      if(t)check(t);
      if(m.target.querySelectorAll)m.target.querySelectorAll(SEL).forEach(check);
    }
  });
});
mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
document.querySelectorAll(SEL).forEach(function(el){wasVis.set(el,visible(el));});
})();
