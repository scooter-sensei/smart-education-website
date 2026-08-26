/* Smart Education portals — appearance (light/dark) controller.
   Include in <head> so the stored theme applies before first paint. */
(function(){
  'use strict';
  var KEY='se-theme';
  var root=document.documentElement;
  var mql=window.matchMedia('(prefers-color-scheme: dark)');

  function stored(){
    try{return localStorage.getItem(KEY);}catch(e){return null;}
  }
  function effective(){
    var s=stored();
    return (s==='light'||s==='dark')?s:(mql.matches?'dark':'light');
  }
  function apply(){
    var s=stored();
    if(s==='light'||s==='dark') root.setAttribute('data-theme',s);
    else root.removeAttribute('data-theme');

    var dark=effective()==='dark';
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',dark?'#000000':'#F2F2F7');

    var btn=document.getElementById('themeBtn');
    if(btn){
      btn.classList.toggle('is-dark',dark);
      btn.setAttribute('aria-pressed',dark);
      btn.setAttribute('aria-label',dark?'Switch to light appearance':'Switch to dark appearance');
    }
  }

  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');

  apply();
  if(mql.addEventListener) mql.addEventListener('change',apply);

  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.getElementById('themeBtn');
    if(!btn) return;
    btn.addEventListener('click',function(){
      var next=effective()==='dark'?'light':'dark';
      try{localStorage.setItem(KEY,next);}catch(e){}
      /* Ease the swap into a full-document cross-fade where supported; a rare,
         deliberate action, so it earns motion. Falls back to an instant apply. */
      if(document.startViewTransition&&!reduce.matches) document.startViewTransition(apply);
      else apply();
    });
    apply();
  });
})();
