/* SmartEduTrack — shared UI helpers used across app screens:
   loading/empty/error states, a fetch-backed list panel, a confirm dialog for
   significant actions, and lightweight field validation. */
(function(){
  'use strict';
  var SE=window.SE=window.SE||{};
  var esc=function(s){return SE.esc?SE.esc(s):String(s);};

  var ICON={
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/></svg>'
  };

  SE.ui={
    icon:ICON,
    skeleton:function(n){ var s=''; n=n||3; for(var i=0;i<n;i++)s+='<div class="skel-row"></div>'; return '<div class="skel">'+s+'</div>'; },
    empty:function(title,sub,iconKey){ return '<div class="empty"><span class="ei">'+(ICON[iconKey]||ICON.box)+'</span><b>'+esc(title)+'</b><p>'+esc(sub)+'</p></div>'; },
    errorBox:function(retryId){ return '<div class="err"><span class="eic">'+ICON.warn+'</span><div><b>Couldn’t load this</b><p>Check your connection and try again.</p><button class="btn b-gray b-xs" type="button" id="'+retryId+'" style="margin-top:9px">Try again</button></div></div>'; },

    /* Mount a fetch-backed list into an element with full state handling.
       cfg: { mount, count?, fetch(), row(item), empty:{title,sub,icon}, onAction?, after? } */
    listPanel:function(cfg){
      var body=(typeof cfg.mount==='string')?document.getElementById(cfg.mount):cfg.mount;
      var count=cfg.count?document.getElementById(cfg.count):null;
      function setCount(n){ if(count) count.textContent=(n==null?'':n); }
      function load(){
        body.setAttribute('aria-busy','true');
        body.innerHTML=SE.ui.skeleton(cfg.skeleton||3); setCount('');
        cfg.fetch().then(function(items){
          body.setAttribute('aria-busy','false');
          if(!items.length){ body.innerHTML=SE.ui.empty(cfg.empty.title,cfg.empty.sub,cfg.empty.icon); setCount(0); return; }
          body.innerHTML=items.map(cfg.row).join(''); setCount(items.length);
          /* gentle staggered entrance — capped so long lists don't cascade forever */
          for(var i=0;i<body.children.length;i++){ body.children[i].style.setProperty('--i',Math.min(i,12)); body.children[i].classList.add('se-in'); }
          if(cfg.after) cfg.after(items,body);
        }).catch(function(){
          body.setAttribute('aria-busy','false');
          var rid=(cfg.mount||'list')+'-retry';
          body.innerHTML=SE.ui.errorBox(rid); setCount('');
          var r=document.getElementById(rid); if(r) r.addEventListener('click',load);
        });
      }
      if(cfg.onAction){
        body.addEventListener('click',function(e){
          var btn=e.target.closest('[data-act]'); if(!btn) return;
          var rowEl=btn.closest('[data-id]'); if(!rowEl) return;
          cfg.onAction(rowEl.getAttribute('data-id'), btn.getAttribute('data-act'), rowEl, btn);
        });
      }
      load();
      return { reload:load };
    },

    /* Soft-remove a row. */
    dropRow:function(rowEl,done){
      rowEl.style.transition='opacity .22s var(--ease-out),transform .22s var(--ease-out)';
      rowEl.style.opacity='0'; rowEl.style.transform='translateX(10px)';
      setTimeout(function(){ rowEl.remove(); if(done) done(); },220);
    },

    /* Confirm dialog — native <dialog>, so it escapes any overflow/stacking context.
       Settles on an explicit button click (with the <dialog> close/cancel events
       kept as fallbacks) so the promise resolves reliably in every environment. */
    confirm:function(opts){
      opts=opts||{};
      return new Promise(function(resolve){
        var d=document.createElement('dialog');
        d.className='se-dialog';
        var card=document.createElement('form');
        card.method='dialog'; card.className='se-dialog-card';
        card.innerHTML='<h3>'+esc(opts.title||'Are you sure?')+'</h3>'+
          (opts.body?'<p>'+esc(opts.body)+'</p>':'')+
          '<div class="se-dialog-acts">'+
            '<button data-v="cancel" class="btn b-gray b-sm" type="button">'+esc(opts.cancelLabel||'Cancel')+'</button>'+
            '<button data-v="ok" class="btn '+(opts.tone==='danger'?'b-red':'b-filled')+' b-sm" type="button">'+esc(opts.confirmLabel||'Confirm')+'</button>'+
          '</div>';
        d.appendChild(card);
        document.body.appendChild(d);
        var settled=false;
        function settle(v){ if(settled)return; settled=true; try{d.close();}catch(e){} d.remove(); resolve(v); }
        card.addEventListener('click',function(e){ var b=e.target.closest('[data-v]'); if(b) settle(b.getAttribute('data-v')==='ok'); });
        d.addEventListener('cancel',function(e){ e.preventDefault(); settle(false); });   /* Esc */
        d.addEventListener('close',function(){ settle(d.returnValue==='ok'); });           /* fallback */
        d.showModal();
        var ok=card.querySelector('[data-v="ok"]'); if(ok) ok.focus();
      });
    },

    /* Field validation. rules = { fieldName: value => errorMessage | null }.
       Fields use <label class="fld2"> wrapping a .field with matching name, plus
       a <span class="fe" data-err="fieldName">. */
    validate:function(form,rules){
      var ok=true;
      Object.keys(rules).forEach(function(name){
        var input=form.elements[name];
        var val=(input&&input.value||'').trim();
        var msg=rules[name](val)||'';
        var errEl=form.querySelector('[data-err="'+name+'"]');
        var wrap=input&&input.closest('.fld2');
        if(errEl) errEl.textContent=msg;
        if(wrap) wrap.classList.toggle('invalid',!!msg);
        if(msg) ok=false;
      });
      return ok;
    },
    clearErrors:function(form){
      [].forEach.call(form.querySelectorAll('[data-err]'),function(e){ e.textContent=''; });
      [].forEach.call(form.querySelectorAll('.fld2.invalid'),function(e){ e.classList.remove('invalid'); });
    }
  };
})();
