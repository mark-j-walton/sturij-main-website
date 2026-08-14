/* Sturij Chat core — shared by chat.html (designer), customer.html (customer) and the canvas drawer.
   PATTERNS.md: paper ground, gold-only accent, mono caps labels, one frost recipe.
   Prototype mode: localStorage + window.claude.complete; set window.STURIJ_CHAT_API for real routes (CHAT-SPEC.md). */
(function(){
var API=window.STURIJ_CHAT_API||null;
var LS='sj-chat-sessions';
function load(){try{return JSON.parse(localStorage.getItem(LS)||'[]');}catch(e){return [];}}
function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){/**/}}
function uid(){return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
var MODES=[
 ['help','Tool help','Answers about the studio, canvas, plans and estimators'],
 ['project','Project Q&A','Reads the live board and scheme before answering'],
 ['feature','Feature request','Discuss an idea; summarise to a PDF for Sturij'],
 ['claude','Claude','Plain conversation, nothing tool-specific'],
 ['research','Research','Asks for sources and shows them under the answer'],
 ['image','Image','Describes a scene; renders through the visualiser']];
var SYS={
 help:'You are the Sturij assistant. You know the Pairing Studio (vertical material panels, favourites drawer, suggested pairings, post-it names, photo/zip/visualise) and the Canvas (endless board, walls with pages and versions, floor plans with doors/windows/zones, furniture incl. fitted wardrobes, paint/wallpaper/estimate/wardrobe calculators in the plan Info modal, snip, notes, stacks, screensaver). Answer plainly and concretely, in British English, no emoji.',
 project:'You are the Sturij assistant. The designer\u2019s current board state is provided as JSON context. Answer questions about their scheme, materials, plans and layout using it. Be specific: name the actual items. British English, no emoji.',
 feature:'You are collecting a feature request for the Sturij tools. Ask brief clarifying questions, then keep a running structured picture: problem, proposal, who benefits, priority. When the designer says they are done, produce a crisp summary titled FEATURE REQUEST with those four headings.',
 claude:'You are Claude, chatting with an interior designer. British English.',
 research:'You are a careful research assistant for an interior designer. Answer, then list 2-4 sources as markdown links on their own lines prefixed \u201cSource:\u201d. If you are unsure, say so.',
 image:'You help compose interior render prompts. Reply with a single vivid paragraph describing the room to render, no preamble.'};
function boardContext(){
  try{
    var b=JSON.parse(localStorage.getItem('sturij-canvas')||'null');
    if(!b||!b.items)return null;
    return JSON.stringify(b.items.map(function(q){return {type:q.type,name:q.name||q.text||'',cat:q.cat,hex:q.hex,w:q.w,h:q.h};}).slice(0,120));
  }catch(e){return null;}
}
function complete(sess,text,cb,fail){
  var msgs=sess.msgs.filter(function(m){return m.role!=='system';}).slice(-20)
    .map(function(m){return (m.role==='assistant'?'Assistant':'Designer')+': '+m.body;}).join('\n');
  var sys=SYS[sess.mode||'claude']||SYS.claude;
  var ctx=sess.mode==='project'?boardContext():null;
  var prompt=sys+(ctx?'\n\nBOARD CONTEXT:\n'+ctx:'')+'\n\n'+msgs+'\nDesigner: '+text+'\nAssistant:';
  if(API){
    fetch(API+'/chat/complete',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({sessionId:sess.id,mode:sess.mode,messages:sess.msgs.slice(-20),boardContext:ctx})})
    .then(function(r){return r.json();}).then(function(j){cb(j.text||'');}).catch(fail);
  } else if(window.claude&&window.claude.complete){
    window.claude.complete(prompt).then(cb).catch(fail);
  } else fail(new Error('No completion backend \u2014 set STURIJ_CHAT_API'));
}
var Chat=window.SturijChat={
  MODES:MODES,
  sessions:load,
  get:function(id){return load().filter(function(s){return s.id===id;})[0]||null;},
  create:function(kind,mode){
    var all=load();
    var s={id:uid(),kind:kind||'agent',mode:mode||'help',title:'',status:'open',msgs:[],created:Date.now()};
    all.unshift(s);save(all);return s;
  },
  put:function(sess){
    var all=load(),i=-1;
    all.forEach(function(q,j){if(q.id===sess.id)i=j;});
    if(i<0)all.unshift(sess);else all[i]=sess;save(all);
  },
  remove:function(id){save(load().filter(function(s){return s.id!==id;}));},
  send:function(sess,text,extra,cb,fail){
    sess.msgs.push(Object.assign({role:(extra&&extra.role)||'designer',body:text,t:Date.now()},extra||{}));
    if(!sess.title)sess.title=text.slice(0,44);
    Chat.put(sess);
    if(extra&&extra.noReply){cb&&cb(null);return;}
    complete(sess,text,function(reply){
      sess.msgs.push({role:'assistant',body:reply,t:Date.now()});
      Chat.put(sess);cb&&cb(reply);
    },function(e){fail&&fail(e);});
  },
  summarise:function(sess,cb,fail){
    if(API){fetch(API+'/chat/summarise',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sess.id})})
      .then(function(r){return r.json();}).then(function(j){sess.summary=j;sess.status='ended';Chat.put(sess);cb(j);}).catch(fail);return;}
    var tx=sess.msgs.map(function(m){return m.role+': '+m.body;}).join('\n');
    var p='Summarise this designer\u2013customer chat in 3 short sentences, then list up to 4 concrete actions for the designer, one per line prefixed "ACTION:".\n\n'+tx;
    if(window.claude&&window.claude.complete)window.claude.complete(p).then(function(r){
      var actions=[];r.split('\n').forEach(function(l){if(l.indexOf('ACTION:')===0)actions.push({label:l.slice(7).trim(),done:false});});
      var sum={text:r.split('ACTION:')[0].trim(),actions:actions};
      sess.summary=sum;sess.status='ended';sess.ended=Date.now();Chat.put(sess);cb(sum);
    }).catch(fail);
    else {sess.status='ended';sess.ended=Date.now();Chat.put(sess);fail&&fail(new Error('no backend'));}
  },
  status:{
    get:function(){try{return JSON.parse(localStorage.getItem('sj-chat-status')||'{"status":"Available"}');}catch(e){return {status:'Available'};}},
    set:function(st,custom){localStorage.setItem('sj-chat-status',JSON.stringify({status:st,custom:custom||'',t:Date.now()}));}
  },
  archive:function(sess){
    sess.archived=true;Chat.put(sess);
    if(API)fetch(API+'/brain/archive',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sess.id})}).catch(function(){});
  },
  attachToProject:function(sess,name){sess.project=name;Chat.put(sess);},
  listen:function(onText,onEnd){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return null;
    var r=new SR();r.lang='en-GB';r.interimResults=true;
    r.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;onText(t,e.results[e.results.length-1].isFinal);};
    r.onend=onEnd;r.start();return r;
  },
  speak:function(text){
    if(!window.speechSynthesis)return;
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(String(text||'').replace(/Source:.*$/gm,'').slice(0,600));
    u.lang='en-GB';u.rate=1.02;
    var v=speechSynthesis.getVoices().filter(function(q){return /en.GB/i.test(q.lang);})[0];
    if(v)u.voice=v;
    speechSynthesis.speak(u);
  },
  md:function(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>')
      .replace(/\n/g,'<br>');
  },
  featurePdf:function(sess){ /* branded print view; browser print-to-PDF */
    var w=window.open('','_blank');
    var rows=sess.msgs.map(function(m){
      return '<div class="m '+m.role+'"><span>'+(m.role==='assistant'?'Assistant':'Designer')+'</span><p>'+Chat.md(m.body)+'</p></div>';}).join('');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Sturij \u2014 Feature request</title><style>'
      +'body{font:14px/1.55 Georgia,serif;color:#1D1D1D;background:#fff;max-width:640px;margin:40px auto;padding:0 24px}'
      +'h1{font:600 22px Georgia,serif;border-bottom:2px solid #D4A01B;padding-bottom:10px}'
      +'.meta{font:10px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#62584F;margin:6px 0 26px}'
      +'.m{margin:0 0 14px}.m span{font:9px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#9a9284}'
      +'.m p{margin:2px 0 0}.m.assistant p{color:#3a352f}'
      +'@media print{body{margin:10mm auto}}</style></head><body>'
      +'<h1>Feature request \u2014 '+(sess.title||'untitled')+'</h1>'
      +'<div class="meta">Sturij Pairing Studio \u00b7 '+new Date(sess.created).toLocaleDateString('en-GB')+' \u00b7 send to hello@sturij.com</div>'
      +rows+'<script>print()<\/script></body></html>');
    w.document.close();
  }
};
})();
