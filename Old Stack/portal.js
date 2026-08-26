/* Smart Education portals — shared behaviors.
   Include just before the page's own script, at the end of <body>. */
(function(){
  'use strict';
  var SE=window.SE={};

  /* Escape user-supplied text for interpolation into HTML (incl. attributes). */
  SE.esc=function(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };

  /* Inline feedback banner (tone: green | blue | red). Text only — built via
     textContent so no markup can be injected through the message. */
  var BANNER_ICON='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>';
  SE.banner=function(hostId,tone,text){
    var host=document.getElementById(hostId);
    var el=document.createElement('div');
    el.className='banner bn-'+tone;
    el.setAttribute('role','status');
    el.innerHTML=BANNER_ICON; /* static icon markup only */
    var span=document.createElement('span');
    span.textContent=text;
    el.appendChild(span);
    host.replaceChildren(el);
  };

  /* Nav bar: hairline + condensed title once the large title scrolls away. */
  var navbar=document.getElementById('navbar');
  if(navbar){
    var ticking=false;
    var onScroll=function(){
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(function(){
        navbar.classList.toggle('scrolled',window.scrollY>34);
        ticking=false;
      });
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }

  /* Quick-nav chips: highlight the section currently in view.
     Multi-column layouts put two sections in the same vertical band, so:
     - a click selects its own chip and locks it until the user scrolls manually,
     - while scrolling, the active chip is kept as long as its section is still
       in the band (hysteresis), so same-row neighbours can never steal it,
     - otherwise the section nearest the anchor line wins. */
  var rail=document.getElementById('chipRail');
  if(rail&&'IntersectionObserver' in window){
    var chips=Array.prototype.slice.call(rail.querySelectorAll('a'));
    var byId={},visible={},activeId=null,lockedId=null;
    var ANCHOR_Y=120; /* matches [data-anchor] scroll-margin-top */

    chips.forEach(function(c){byId[c.getAttribute('href').slice(1)]=c;});
    var seed=rail.querySelector('a.on');
    if(seed)activeId=seed.getAttribute('href').slice(1);

    function setActive(id){
      if(id===activeId||!byId[id])return;
      activeId=id;
      chips.forEach(function(c){
        var on=c.getAttribute('href')==='#'+id;
        c.classList.toggle('on',on);
        if(on)c.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
      });
    }

    function reselect(){
      if(lockedId){setActive(lockedId);return;}
      if(activeId&&visible[activeId])return;
      var best=null,bestD=Infinity;
      for(var id in visible){
        if(!visible[id])continue;
        var d=Math.abs(document.getElementById(id).getBoundingClientRect().top-ANCHOR_Y);
        if(d<bestD){bestD=d;best=id;}
      }
      if(best)setActive(best);
    }

    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){visible[en.target.id]=en.isIntersecting;});
      reselect();
    },{rootMargin:'-12% 0px -55% 0px'});

    chips.forEach(function(c){
      var id=c.getAttribute('href').slice(1);
      var t=document.getElementById(id);
      if(t)io.observe(t);
      c.addEventListener('click',function(){
        lockedId=id;
        setActive(id);
      });
    });

    /* Direct deep links (page.html#section) select their chip too. */
    var hashId=(location.hash||'').slice(1);
    if(byId[hashId]){lockedId=hashId;setActive(hashId);}

    /* Manual scroll intent releases the click lock. */
    function unlock(){if(lockedId){lockedId=null;reselect();}}
    window.addEventListener('wheel',unlock,{passive:true});
    window.addEventListener('touchstart',unlock,{passive:true});
    window.addEventListener('keydown',function(e){
      if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].indexOf(e.key)>-1)unlock();
    });
  }

  /* Keyboard activation for rows exposed as buttons. */
  document.addEventListener('keydown',function(e){
    if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role="button"][tabindex]')){
      e.preventDefault();
      e.target.click();
    }
  });
})();
