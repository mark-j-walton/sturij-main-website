/* dialog.js — confirm dialog with 3D blur entrance (Motion+ Radix dialog port). LIB.
   window.SturijDialog({title, body, confirmLabel, cancelLabel}) → Promise<boolean>.
   Paper card swings in from rotateY 25° / z -100 / blur(10px); overlay blur-fades. */
(function(){
var st=document.createElement('style');
st.textContent=
'.sdlg-ov{position:fixed;inset:0;z-index:9999998;background:rgba(35,31,27,.45);backdrop-filter:blur(3px);opacity:0}'+
'.sdlg-wrap{position:fixed;inset:0;z-index:9999999;display:flex;align-items:center;justify-content:center;pointer-events:none;perspective:500px}'+
'.sdlg{pointer-events:auto;min-width:300px;max-width:420px;background:#FDFCF8;border-radius:14px;padding:24px 26px;box-shadow:0 2px 4px rgba(35,31,27,.1),0 24px 60px rgba(35,31,27,.3);opacity:0}'+
'.sdlg h3{margin:0 0 12px;font:600 24px "Cormorant Garamond",Georgia,serif;color:#1D1D1D}'+
'.sdlg p{margin:0;font:400 11.5px/1.6 "IBM Plex Mono",monospace;color:#62584F}'+
'.sdlg .ctr{border-top:1px dashed rgba(98,88,79,.3);padding-top:16px;margin-top:18px;display:flex;justify-content:flex-end;gap:10px}'+
'.sdlg .ctr button{all:unset;cursor:pointer;font:600 10px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;padding:9px 16px;border-radius:100px}'+
'.sdlg .ctr .ok{background:#E4B32E;color:#231F1B;box-shadow:0 1px 2px rgba(35,31,27,.2)}'+
'.sdlg .ctr .no{background:rgba(98,88,79,.12);color:#62584F}'+
'.sdlg .ctr button:active{transform:scale(.97)}';
document.head.appendChild(st);
function anim(el,kf,o){if(window.Motion){try{return Motion.animate(el,kf,o);}catch(_){}}return null;}
window.SturijDialog=function(opts){
  opts=opts||{};
  return new Promise(function(res){
    var ov=document.createElement('div');ov.className='sdlg-ov';
    var wrap=document.createElement('div');wrap.className='sdlg-wrap';
    var d=document.createElement('div');d.className='sdlg';
    d.innerHTML='<h3></h3><p></p><div class="ctr"><button class="no"></button><button class="ok"></button></div>';
    d.querySelector('h3').textContent=opts.title||'Confirm';
    d.querySelector('p').textContent=opts.body||'';
    d.querySelector('.no').textContent=opts.cancelLabel||'Cancel';
    d.querySelector('.ok').textContent=opts.confirmLabel||'Confirm';
    wrap.appendChild(d);document.body.appendChild(ov);document.body.appendChild(wrap);
    anim(ov,{opacity:[0,1]},{duration:.25})||(ov.style.opacity=1);
    var IN={opacity:1,filter:'blur(0px)',transform:'translateZ(0px) rotateY(0deg) rotateX(0deg)'};
    var OUT={opacity:0,filter:'blur(10px)',transform:'translateZ(-100px) rotateY(25deg) rotateX(5deg)'};
    d.style.filter=OUT.filter;d.style.transform=OUT.transform;
    var a=anim(d,{opacity:[0,1],filter:['blur(10px)','blur(0px)'],transform:[OUT.transform,IN.transform]},{delay:.2,duration:.5,ease:[.17,.67,.51,1]});
    if(!a){d.style.opacity=1;d.style.filter='none';d.style.transform='none';}
    function close(v){
      anim(ov,{opacity:[1,0]},{duration:.3});
      var b=anim(d,{opacity:[1,0],filter:['blur(0px)','blur(10px)'],transform:[IN.transform,OUT.transform]},{duration:.3,ease:[.67,.17,.62,.64]});
      var fin=function(){ov.remove();wrap.remove();res(v);};
      if(b&&b.then)b.then(fin);else setTimeout(fin,320);
      document.removeEventListener('keydown',onKey);
    }
    function onKey(e){if(e.key==='Escape')close(false);}
    document.addEventListener('keydown',onKey);
    ov.addEventListener('click',function(){close(false);});
    d.querySelector('.no').addEventListener('click',function(){close(false);});
    d.querySelector('.ok').addEventListener('click',function(){close(true);});
  });
};
})();
