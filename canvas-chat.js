/* Canvas chat drawer — quick line to the Sturij assistant; full history in chat.html */
(function(){
var C=window.SturijChat;if(!C)return;
var fab=document.createElement('button');fab.id='chatfab';fab.title='Ask the Sturij assistant';
fab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12z"/></svg>';
document.body.appendChild(fab);
var drw=document.createElement('div');drw.id='chatdrw';
drw.innerHTML='<div class="cdh"><b>Sturij assistant</b><a href="chat.html">All chats</a><button class="cdx">\u00d7</button></div>'
  +'<div id="cdthread"></div>'
  +'<div id="cdcomp"><div class="cwrap"><textarea id="cdinp" rows="1" placeholder="Ask about your board\u2026"></textarea>'
  +'<button class="cbn" id="cdsend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></div></div>';
document.body.appendChild(drw);
var sess=null;
function ensure(){
  if(sess)return sess;
  var all=C.sessions().filter(function(s){return s.kind==='agent'&&s.mode==='project'&&s.status==='open';});
  sess=all[0]||C.create('agent','project');return sess;
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function render(){
  var t=document.getElementById('cdthread'),h='';
  ensure().msgs.forEach(function(m){
    h+='<div class="msg '+m.role+'"><div class="body">'+C.md(m.body)+'</div></div>';});
  if(!h)h='<div style="margin:auto;text-align:center;color:#9a9284;font:400 11px var(--f-mono);letter-spacing:.06em;max-width:240px">Ask about your scheme \u2014 this mode reads the live board before answering.</div>';
  t.innerHTML=h;t.scrollTop=t.scrollHeight;
}
fab.onclick=function(){drw.classList.add('open');render();setTimeout(function(){document.getElementById('cdinp').focus();},250);};
drw.querySelector('.cdx').onclick=function(){drw.classList.remove('open');};
var inp;
function send(){
  inp=document.getElementById('cdinp');
  var v=inp.value.trim();if(!v)return;
  inp.value='';
  var t=document.getElementById('cdthread');
  t.insertAdjacentHTML('beforeend','<div class="msg designer"><div class="body">'+esc(v)+'</div></div><div class="msg"><div class="body" id="cdth">\u2026</div></div>');
  t.scrollTop=t.scrollHeight;
  C.send(ensure(),v,null,function(){render();},function(e){
    var n=document.getElementById('cdth');if(n)n.textContent='No completion backend available \u2014 open chat.html for details.';
  });
}
document.getElementById('cdsend').onclick=send;
document.getElementById('cdinp').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
})();
