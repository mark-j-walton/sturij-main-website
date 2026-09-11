/* Sturij progress modal — motion.dev "base progress" language, board patterns (gold accent, one frost recipe, mono caps).
   API: SturijProgress.open(title, phases[]) → SturijProgress.done(msg) | SturijProgress.fail(msg) | SturijProgress.set(0..1) */
(function(){
  var box=null,bar=null,pct=null,cap=null,tick=null,phTimer=null,target=0,shown=0,anim=null,startT=0;
  var GOLD='#D4A01B',INK='#1D1D1D';
  function M(){return window.Motion&&window.Motion.animate?window.Motion:null;}
  function build(title){
    var ov=document.createElement('div');ov.id='sjprog';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(250,248,243,.55);backdrop-filter:blur(14px) saturate(1.1);-webkit-backdrop-filter:blur(14px) saturate(1.1);opacity:0;transition:opacity .28s';
    var card=document.createElement('div');
    card.style.cssText='width:min(420px,86vw);background:rgba(255,255,255,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:18px;box-shadow:0 24px 70px rgba(29,29,29,.22),0 2px 8px rgba(29,29,29,.08);padding:30px 32px 26px;transform:scale(.94) translateY(10px)';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px">'
      +'<span data-p="t" style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.18em;text-transform:uppercase;color:'+INK+'"></span>'
      +'<span data-p="pct" style="font:600 13px \'IBM Plex Mono\',monospace;color:'+GOLD+';font-variant-numeric:tabular-nums">0%</span></div>'
      +'<div style="height:4px;border-radius:999px;background:rgba(29,29,29,.08);overflow:hidden">'
      +'<div data-p="bar" style="height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,'+GOLD+',#E4B93B);box-shadow:0 0 10px rgba(212,160,27,.5)"></div></div>'
      +'<div data-p="cap" style="margin-top:14px;font:400 12px \'IBM Plex Mono\',monospace;color:#62584F;min-height:16px;transition:opacity .3s"></div>';
    ov.appendChild(card);document.body.appendChild(ov);
    card.querySelector('[data-p=t]').textContent=title;
    bar=card.querySelector('[data-p=bar]');pct=card.querySelector('[data-p=pct]');cap=card.querySelector('[data-p=cap]');
    requestAnimationFrame(function(){ov.style.opacity='1';
      var m=M();if(m){try{m.animate(card,{transform:['scale(.94) translateY(10px)','scale(1) translateY(0)']},{type:'spring',stiffness:260,damping:24});}catch(e){card.style.transform='none';}}
      else{card.style.transition='transform .3s cubic-bezier(.22,1,.36,1)';card.style.transform='none';}});
    return ov;
  }
  function render(){
    if(!bar)return;
    bar.style.width=(shown*100).toFixed(1)+'%';
    pct.textContent=Math.round(shown*100)+'%';
  }
  function loop(){
    if(!box)return;
    /* spring-ish chase of the target, plus a slow asymptotic drift so it never stalls dead */
    var drift=Math.min(.92,target+(1-Math.exp(-(Date.now()-startT)/26000))*.0001);
    var goal=Math.max(target,Math.min(target+.06,drift));
    shown+=(goal-shown)*.06;
    render();
    anim=requestAnimationFrame(loop);
  }
  var P=window.SturijProgress={
    open:function(title,phases){
      P.close(true);
      target=.04;shown=0;startT=Date.now();
      box=build(title||'Working');
      loop();
      if(phases&&phases.length){
        var i=0;cap.textContent=phases[0];
        phTimer=setInterval(function(){
          i=(i+1)%phases.length;
          cap.style.opacity='0';
          setTimeout(function(){cap.textContent=phases[i];cap.style.opacity='1';},300);
          /* each phase nudges the target toward 90% */
          target=Math.min(.9,target+.9/(phases.length*2));
        },5200);
      }
      /* baseline creep for calls with no set() */
      var creep=setInterval(function(){if(!box){clearInterval(creep);return;}target=Math.min(.9,target+.045);},2600);
      box._creep=creep;
    },
    set:function(v){target=Math.max(target,Math.min(.98,v));},
    done:function(msg,cb){
      if(!box){if(cb)cb();return;}
      clearInterval(phTimer);clearInterval(box._creep);
      target=1;
      if(msg&&cap){cap.style.opacity='1';cap.textContent=msg;}
      var b2=box;
      setTimeout(function(){
        cancelAnimationFrame(anim);shown=1;render();
        b2.style.opacity='0';
        setTimeout(function(){b2.remove();if(box===b2){box=null;bar=null;}if(cb)cb();},300);
      },420);
    },
    fail:function(msg){
      if(!box)return;
      clearInterval(phTimer);clearInterval(box._creep);cancelAnimationFrame(anim);
      bar.style.background='#B4543E';bar.style.boxShadow='none';pct.textContent='';
      cap.style.opacity='1';cap.textContent=msg||'Something went wrong';
      var b2=box;box=null;
      setTimeout(function(){b2.style.opacity='0';setTimeout(function(){b2.remove();},300);},2600);
    },
    close:function(now){
      clearInterval(phTimer);if(box)clearInterval(box._creep);cancelAnimationFrame(anim);
      if(box){var b2=box;box=null;if(now)b2.remove();else{b2.style.opacity='0';setTimeout(function(){b2.remove();},300);}}
      bar=null;
    }
  };
})();
