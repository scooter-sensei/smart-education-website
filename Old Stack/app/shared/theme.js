/* SmartEduTrack — appearance (light/dark) controller.
   Include in <head> so the stored theme applies before first paint.
   Exposes SE.theme so dynamically-rendered controls (the app shell) can drive it. */
(function(){
  'use strict';
  var SE=window.SE=window.SE||{};
  var KEY='se-theme';
  var root=document.documentElement;
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');

  function stored(){ try{return localStorage.getItem(KEY);}catch(e){return null;} }
  function effective(){ var s=stored(); return (s==='light'||s==='dark')?s:(mql.matches?'dark':'light'); }

  function apply(){
    var s=stored();
    if(s==='light'||s==='dark') root.setAttribute('data-theme',s); else root.removeAttribute('data-theme');
    var dark=effective()==='dark';
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',dark?'#000000':'#F2F2F7');
    document.querySelectorAll('[data-theme-btn],#themeBtn').forEach(function(btn){
      btn.classList.toggle('is-dark',dark);
      btn.setAttribute('aria-pressed',dark);
      btn.setAttribute('aria-label',dark?'Switch to light appearance':'Switch to dark appearance');
    });
  }
  function toggle(){
    var next=effective()==='dark'?'light':'dark';
    try{localStorage.setItem(KEY,next);}catch(e){}
    /* A rare, deliberate action — earns a full-document cross-fade where supported.
       If the transition is interrupted (a quick re-toggle, or navigating mid-fade)
       its promises reject; swallow that expected abort so it doesn't surface as an
       uncaught rejection. The swap itself has already been applied. */
    if(document.startViewTransition&&!reduce.matches){
      var vt=document.startViewTransition(apply);
      if(vt){ ['finished','ready','updateCallbackDone'].forEach(function(k){ if(vt[k]&&vt[k].catch) vt[k].catch(function(){}); }); }
    } else apply();
  }

  SE.theme={apply:apply,toggle:toggle,effective:effective};
  apply();
  if(mql.addEventListener) mql.addEventListener('change',apply);
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.getElementById('themeBtn');
    if(b) b.addEventListener('click',toggle);
    apply();
  });
})();
