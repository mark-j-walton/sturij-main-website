/* action-bar.js — global action bar, docked bottom-left on all three work areas.
   Embossed pill bar: Layout · Share · Notes, then grouped menus (People, Library,
   Settings) opening as anchored dropdowns (dropdown.js). Collapses to a small ⋯ pill;
   state persists. Menu items without pages yet confirm with a slip and record intent. */
(function(){
var st=document.createElement('style');
st.textContent=
'.abar{position:fixed;right:18px;top:58px;z-index:117;display:flex;align-items:center;gap:2px;padding:7px 9px;border-radius:100px;background:#FDFCF8;box-shadow:inset 0 1.5px 2px rgba(255,255,255,.85),inset 0 -1.5px 2.5px rgba(35,31,27,.14),0 10px 26px rgba(35,31,27,.18)}'+
'.abar button{all:unset;cursor:pointer;font:600 9.5px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#62584F;padding:8px 12px;border-radius:100px;transition:background .15s,color .15s;white-space:nowrap}'+
'.abar button:hover{background:rgba(228,179,46,.16);color:#1D1D1D}'+
'.abar button:active{transform:scale(.94)}'+
'.abar .vsep{width:1px;align-self:stretch;background:rgba(98,88,79,.18);margin:2px 5px}'+
'.abar .grp:after{content:" \\25BE";font-size:8px;color:#9a9284}'+
'.abar.min button:not(.amin){display:none}.abar.min .vsep,.abar.min .tc{display:none}'+
'.abar .amin{padding:8px 11px}'+
'.aslip{position:fixed;right:18px;top:106px;z-index:117;background:#231F1B;color:#FAF8F2;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.06em;padding:8px 15px;border-radius:100px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}'+
'.aslip.on{opacity:1;transform:translateY(4px)}'+
'@media (max-width:760px){.abar{right:10px;top:auto;bottom:10px}.aslip{right:10px;top:auto;bottom:58px}}'+
'.abar .tc{position:static;transform:none;display:flex;gap:4px;padding:3px;border-radius:100px;background:rgba(35,31,27,.06);box-shadow:inset 0 1px 2px rgba(35,31,27,.12)}'+
'.abar .tc .hbtn{color:#62584F}'+
'.abar .tc .hbtn.on svg{stroke:#231F1B}';
document.head.appendChild(st);
function slip(msg){
  var s=document.querySelector('.aslip');
  if(!s){s=document.createElement('div');s.className='aslip';document.body.appendChild(s);}
  s.textContent=msg;s.classList.add('on');
  clearTimeout(s._t);s._t=setTimeout(function(){s.classList.remove('on');},2200);
}
function note(label){return function(){slip(label+' \u2014 coming soon');};}
addEventListener('DOMContentLoaded',function(){
  var bar=document.createElement('div');bar.className='abar';
  bar.innerHTML='<button class="amin" title="Collapse">\u22EF</button><div class="vsep"></div>'
    +'<button data-a="layout">Layout</button><button data-a="share">Share</button><button data-a="notes">Notes</button>'
    +'<div class="vsep"></div>'
    +'<button class="grp" data-g="people">People</button><button class="grp" data-g="library">Library</button><button class="grp" data-g="settings">Settings</button>';
  document.body.appendChild(bar);
  if(localStorage.getItem('sturij.abar')==='min')bar.classList.add('min');
  bar.querySelector('.amin').onclick=function(){
    bar.classList.toggle('min');
    localStorage.setItem('sturij.abar',bar.classList.contains('min')?'min':'open');
  };
  bar.querySelector('[data-a="layout"]').onclick=note('Layout options');
  bar.querySelector('[data-a="share"]').onclick=function(){
    if(window.openShareSheet)window.openShareSheet({title:document.title});
    else if(navigator.share)navigator.share({title:document.title,url:location.href}).catch(function(){});
    else if(navigator.clipboard){navigator.clipboard.writeText(location.href);slip('Link copied');}
  };
  bar.querySelector('[data-a="notes"]').onclick=function(){
    if(window.openNotes)window.openNotes();else note('Notes')();
  };
  var MENUS={
    people:[{label:'Contacts',onSelect:note('Contacts')},{label:'Suppliers',onSelect:note('Suppliers')},{label:'Advisors',onSelect:note('Advisors')}],
    library:[{label:'Links',onSelect:note('Links')},{label:'Materials',onSelect:function(){location.href='studio.html';}},{label:'Brands',onSelect:note('Brands')}],
    settings:[{label:'Colour',onSelect:note('Colour settings')},{label:'Screensaver',onSelect:note('Screensaver')},{label:'Backgrounds',onSelect:note('Backgrounds')},'separator',{label:'Canvas animation',onSelect:note('Canvas animation')}]
  };
  [].forEach.call(bar.querySelectorAll('.grp'),function(b){
    if(window.SturijDropdown)window.SturijDropdown(b,MENUS[b.getAttribute('data-g')]);
    else b.onclick=note(b.textContent);
  });
});
})();
