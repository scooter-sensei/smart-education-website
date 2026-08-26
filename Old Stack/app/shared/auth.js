/* SmartEduTrack — session + role gate (front-end seam only).
   The Go backend is the real authority; UI gating is convenience (SRS §3.4). */
(function(){
  'use strict';
  var SE=window.SE=window.SE||{};
  var KEY='set-session';

  /* Resolve the app root from any depth (app/login, app/admin/x, app/teacher/x). */
  function appRoot(){
    var p=location.pathname, i=p.indexOf('/app/');
    return i>=0 ? p.slice(0,i+5) : 'app/';
  }
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;} }

  SE.auth={
    session:read,
    role:  function(){ var s=read(); return s&&s.role; },
    token: function(){ var s=read(); return s&&s.token; },
    user:  function(){ var s=read(); return s&&s.user; },
    header:function(){ var t=this.token(); return t?{Authorization:'Bearer '+t}:{}; },
    set:   function(s){ try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){} },
    clear: function(){ try{localStorage.removeItem(KEY);}catch(e){} },
    loginPath:function(){ return appRoot()+'login.html'; },
    homeFor:  function(role){ return appRoot()+(role===SE.ROLE.SUPER_ADMIN?'admin/dashboard.html':'teacher/dashboard.html'); },

    /* Page guard — call at the top of every protected screen. Returns false and
       redirects if the visitor lacks a session or the required role. */
    require:function(role){
      var s=read();
      if(!s||!s.token){ location.replace(this.loginPath()); return false; }
      if(role&&s.role!==role){ location.replace(this.homeFor(s.role)); return false; }
      return true;
    },
    logout:function(){ this.clear(); location.href=this.loginPath(); }
  };
})();
