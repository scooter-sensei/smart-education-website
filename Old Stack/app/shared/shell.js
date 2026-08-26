/* SmartEduTrack — application shell (sidebar + mobile top bar), role-aware.
   Call SE.shell.render('<role-relative href of current screen>') after SE.auth.require().
   Screens not yet built (later phases) render as "Soon" and explain themselves on tap. */
(function(){
  'use strict';
  var SE=window.SE=window.SE||{};

  var ICONS={
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    report:'M3 3v18h18M8 15v3M13 9v9M18 5v13',
    calendar:'M3 4h18v18H3zM3 9h18M8 2v4M16 2v4',
    layers:'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    book:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z',
    link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    teachers:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    inbox:'M22 12h-6l-2 3h-4l-2-3H2M5 5h14l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
    student:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    usercheck:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M11 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M15 11l2 2 4-4',
    userplus:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
    wallet:'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h3v-4z',
    billing:'M3 4h18v18H3zM3 9h18M8 2v4M16 2v4M9 15l2 2 4-4',
    rupee:'M6 3h12M6 8h12M9 3c4 0 6 2 6 4s-2 4-6 4H8l7 6',
    alert:'M12 2 1 21h22zM12 9v4M12 17h.01',
    percent:'M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
    coins:'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    check:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'
  };
  function icon(k){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(ICONS[k]||ICONS.grid)+'"/></svg>';
  }

  var NAV={
    SUPER_ADMIN:[
      {group:'Overview',items:[['Dashboard','admin/dashboard.html',true,'grid'],['Reports','admin/reports.html',true,'report']]},
      {group:'Academics',items:[
        ['Academic Sessions','admin/sessions.html',true,'calendar'],
        ['Classes','admin/classes.html',true,'layers'],
        ['Subjects','admin/subjects.html',true,'book'],
        ['Teacher – Subject Auth','admin/teacher-subjects.html',true,'link']]},
      {group:'People',items:[
        ['Teacher Accounts','admin/teachers.html',true,'teachers'],
        ['Registration Requests','admin/registration-requests.html',true,'inbox'],
        ['Students','admin/students.html',true,'student'],
        ['Enrollments','admin/enrollments.html',true,'usercheck']]},
      {group:'Finance',items:[
        ['Fee Configuration','admin/fee-configuration.html',true,'wallet'],
        ['Billing Cycles','admin/billing-cycles.html',true,'billing'],
        ['Payments','admin/payments.html',true,'rupee'],
        ['Dues','admin/dues.html',true,'alert'],
        ['Commission Reports','admin/commissions.html',true,'percent'],
        ['Teacher Payouts','admin/payouts.html',true,'coins']]}
    ],
    TEACHER:[
      {group:'Overview',items:[['Dashboard','teacher/dashboard.html',true,'grid']]},
      {group:'Teaching',items:[
        ['Attendance','teacher/attendance.html',true,'check'],
        ['My Students','teacher/students.html',true,'student'],
        ['My Enrollments','teacher/enrollments.html',true,'usercheck'],
        ['Register a Student','teacher/register-student.html',true,'userplus']]},
      {group:'Earnings',items:[['My Commission','teacher/commission.html',true,'percent']]}
    ]
  };

  function appRoot(){ var p=location.pathname,i=p.indexOf('/app/'); return i>=0?p.slice(0,i+5):'app/'; }
  function initials(n){ return String(n||'?').trim().split(/\s+/).map(function(w){return w.charAt(0);}).slice(0,2).join('').toUpperCase(); }
  var sun='<svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>';
  var moon='<svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';

  SE.shell={
    render:function(current){
      var role=SE.auth.role()||SE.ROLE.TEACHER;
      var user=SE.auth.user()||{name:'—'};
      var root=appRoot();
      var groups=NAV[role]||NAV.TEACHER;

      var nav=groups.map(function(g){
        var items=g.items.map(function(it){
          var label=it[0],href=it[1],built=it[2],ic=it[3],active=href===current;
          if(built){
            return '<a class="nav-item'+(active?' is-active':'')+'" href="'+root+href+'"'+(active?' aria-current="page"':'')+'>'+
              '<span class="ni-ic">'+icon(ic)+'</span><span class="ni-t">'+SE.esc(label)+'</span></a>';
          }
          return '<button type="button" class="nav-item is-soon" data-soon="'+SE.esc(label)+'">'+
            '<span class="ni-ic">'+icon(ic)+'</span><span class="ni-t">'+SE.esc(label)+'</span><i class="soon">Soon</i></button>';
        }).join('');
        return '<div class="nav-group"><p class="nav-glabel">'+SE.esc(g.group)+'</p>'+items+'</div>';
      }).join('');

      var side=document.createElement('aside');
      side.className='side'; side.id='side';
      side.innerHTML=
        '<div class="side-brand"><a class="sb-mark" href="'+SE.auth.homeFor(role)+'">SmartEdu<b>Track</b></a><span class="sb-ver">v1.0</span></div>'+
        '<nav class="side-nav" aria-label="Primary">'+nav+'</nav>'+
        '<div class="side-foot">'+
          '<button class="theme-btn" data-theme-btn type="button">'+sun+moon+'<span>Appearance</span></button>'+
          '<div class="acct"><span class="acct-ava" aria-hidden="true">'+initials(user.name)+'</span>'+
            '<span class="acct-t"><b>'+SE.esc(user.name)+'</b><span>'+SE.esc(SE.ROLE_LABEL[role]||role)+'</span></span></div>'+
          '<button class="logout" id="logoutBtn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>Log out</button>'+
        '</div>';

      var topbar=document.createElement('header');
      topbar.className='topbar';
      topbar.innerHTML=
        '<button class="tb-menu" id="tbMenu" type="button" aria-label="Open menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>'+
        '<span class="tb-brand">SmartEdu<b>Track</b></span>'+
        '<button class="theme-btn tb-theme" data-theme-btn type="button">'+sun+moon+'</button>';

      var scrim=document.createElement('div'); scrim.className='scrim'; scrim.id='scrim';

      document.body.classList.add('has-shell');
      document.body.insertBefore(scrim,document.body.firstChild);
      document.body.insertBefore(side,document.body.firstChild);
      document.body.insertBefore(topbar,document.body.firstChild);

      [].forEach.call(document.querySelectorAll('[data-theme-btn]'),function(b){
        b.addEventListener('click',function(){ if(SE.theme) SE.theme.toggle(); });
      });
      if(SE.theme) SE.theme.apply();

      document.getElementById('logoutBtn').addEventListener('click',function(){ SE.auth.logout(); });

      function setMenu(open){ document.body.classList.toggle('menu-open',open); document.getElementById('tbMenu').setAttribute('aria-expanded',open); }
      document.getElementById('tbMenu').addEventListener('click',function(){ setMenu(!document.body.classList.contains('menu-open')); });
      scrim.addEventListener('click',function(){ setMenu(false); });
      side.addEventListener('click',function(e){
        if(e.target.closest('a.nav-item')) setMenu(false);
        var b=e.target.closest('[data-soon]');
        if(b) SE.shell.toast(b.getAttribute('data-soon')+' arrives in a later build phase.');
      });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape') setMenu(false); });
    },

    toast:function(msg){
      var t=document.getElementById('se-toast');
      if(!t){ t=document.createElement('div'); t.id='se-toast'; t.className='toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
      t.textContent=msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
      clearTimeout(t._h); t._h=setTimeout(function(){ t.classList.remove('on'); },2600);
    }
  };
})();
