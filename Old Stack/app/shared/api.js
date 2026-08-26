/* SmartEduTrack — data layer. Every screen talks to the backend ONLY through
   SE.api.*  Today each method is the MOCK implementation: it resolves ERD-shaped
   rows from an in-memory DB after a short delay. That DB is persisted to
   sessionStorage, so state (payments, generated cycles, approvals…) survives page
   navigation within a session and the finance flow connects end-to-end.

   Back-end seam: to connect the Go API, replace each SE.api.* method body with a
   call to SE.request(path, opts) — a ready HTTP helper (below) that adds the auth
   header + JSON handling and throws {code,message} on failure. USE_MOCK / BASE are
   provided for that swap. The mock is self-contained so the UI can be built and
   demoed before the back-end exists. */
(function(){
  'use strict';
  var SE=window.SE=window.SE||{};
  var USE_MOCK=true;               /* the back-end swaps method bodies to SE.request(...) */
  var BASE='/api/v1';
  var LATENCY=280;                 /* gives loading states something real to show */
  var DBKEY='se-db-v2';            /* bump to discard a persisted demo DB after a seed change */

  /* Current + prior two months (YYYY-MM), so seeded finance/attendance data always
     lands in "this month" regardless of when the demo is run. */
  function ym(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2); }
  var _now=new Date();
  var M0=ym(_now),
      M1=ym(new Date(_now.getFullYear(),_now.getMonth()-1,1)),
      M2=ym(new Date(_now.getFullYear(),_now.getMonth()-2,1));
  function monthLabel(m){ try{ return new Date(m+'-01T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}); }catch(e){ return m; } }
  function monthEnd(m){ var y=+m.slice(0,4), mo=+m.slice(5,7), d=new Date(y,mo,0).getDate(); return m+'-'+(d<10?'0'+d:d); }

  function qs(o){
    if(!o) return '';
    var p=Object.keys(o).filter(function(k){return o[k]!=null&&o[k]!=='';})
      .map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(o[k]);});
    return p.length?'?'+p.join('&'):'';
  }
  function persist(){ try{ sessionStorage.setItem(DBKEY, JSON.stringify(DB)); }catch(e){} }
  /* Every method ends in delay(result); mutations happen synchronously before it,
     so persisting here captures all writes (harmless no-op on reads). */
  function delay(v){ persist(); return new Promise(function(res){ setTimeout(function(){res(v);},LATENCY); }); }
  function nextId(arr){ return arr.reduce(function(m,x){return Math.max(m,x.id);},0)+1; }
  function find(arr,id){ id=+id; return arr.filter(function(x){return x.id===id;})[0]; }
  function pad3(n){ n=String(n); while(n.length<3)n='0'+n; return n; }
  function today(){ return new Date().toISOString().slice(0,10); }
  function nextStudentSeq(){ var mx=0; DB.students.forEach(function(s){ var m=/SE-\d{4}-(\d+)/.exec(s.student_code); if(m) mx=Math.max(mx,+m[1]); }); return mx+1; }
  /* Which teacher is signed in. The real API scopes by the auth token; the mock
     matches the session email to a teacher, falling back to the first active one
     so the demo always has data to show. */
  function currentTeacher(){
    var email=(SE.auth&&SE.auth.user&&SE.auth.user()&&SE.auth.user().email||'').toLowerCase();
    return DB.teachers.filter(function(x){return (x.email||'').toLowerCase()===email;})[0]
        || DB.teachers.filter(function(x){return x.is_active;})[0];
  }
  /* Commission accrued per teacher (keyed by teacher_id, not name — no name-collision
     risk) = COMMISSION_RATE% of what's been collected for their subjects. And the
     payouts already made, per teacher_id. */
  function accruedByTeacher(){
    var raw={}; DB.paymentAllocations.forEach(function(a){ var r=find(DB.feeRecords,a.fee_record_id); if(r&&r.teacher_id!=null){ raw[r.teacher_id]=(raw[r.teacher_id]||0)+a.amount; } });
    var out={}; Object.keys(raw).forEach(function(tid){ out[tid]=Math.round(raw[tid]*SE.COMMISSION_RATE/100); }); return out;
  }
  function paidByTeacher(){ var out={}; DB.teacherPayouts.forEach(function(p){ if(p.teacher_id!=null){ out[p.teacher_id]=(out[p.teacher_id]||0)+p.amount; } }); return out; }

  /* Real HTTP call to the Go API — the seam the back-end wires into. Adds the auth
     header, JSON-encodes the body, and rejects with {code,message} on a non-2xx.
     Append a query string with SE.qs(params). Unused while USE_MOCK is true. */
  function request(path,opts){
    opts=opts||{};
    return fetch(BASE+path,{
      method:opts.method||'GET',
      headers:Object.assign({'Content-Type':'application/json'},(SE.auth&&SE.auth.header?SE.auth.header():{})),
      body:opts.body?JSON.stringify(opts.body):undefined
    }).then(function(res){
      if(!res.ok){
        return res.json().catch(function(){return {};}).then(function(e){
          throw {code:e.code||res.status, message:e.message||'Request failed'};
        });
      }
      return res.status===204?null:res.json();
    });
  }
  SE.request=request; SE.qs=qs; SE.USE_MOCK=USE_MOCK;

  /* ------------------------------------------------------------------ *
   * Demo data — realistic roster, organic figures (not lorem, not round)
   * ------------------------------------------------------------------ */
  var USERS=[
    {email:'admin@smartedutrack.in',    role:SE.ROLE.SUPER_ADMIN, name:'Santana Mondal'},
    {email:'u.choudhury@smartedutrack.in', role:SE.ROLE.TEACHER,  name:'Udayan Choudhury'}
  ];
  var DB={
    registrationRequests:[
      {id:31, full_name:'Ananya Bose',    phone:'9830101010', guardian_name:'Sujata Bose',   guardian_phone:'9830101000', address:'Kanyapur, Asansol', klass:'Class 10', session:'2026–27', requested_by:'Udayan Choudhury', created_at:'2026-08-19', status:'PENDING'},
      {id:32, full_name:'Ritwik Saha',    phone:'9830202020', guardian_name:'Debasish Saha', guardian_phone:'9830202000', address:'Hutton Road, Asansol', klass:'Class 12', session:'2026–27', requested_by:'Raj Bharti',       created_at:'2026-08-20', status:'PENDING'},
      {id:33, full_name:'Meherzad Irani', phone:'9830303030', guardian_name:'Farida Irani',  guardian_phone:'9830303000', address:'Burnpur, Asansol',    klass:'Class 9',  session:'2026–27', requested_by:'Rupa Konar',       created_at:'2026-08-21', status:'PENDING'},
      {id:34, full_name:'Sana Qureshi',   phone:'9830404040', guardian_name:'Imran Qureshi', guardian_phone:'9830404000', address:'Ushagram, Asansol',   klass:'Class 11', session:'2026–27', requested_by:'Udayan Choudhury', created_at:'2026-08-21', status:'PENDING'}
    ],
    students:[
      {id:1,student_code:'SE-2026-045',full_name:'Riya Sen',   phone:'9830011111',email:'',guardian_name:'Anil Sen',    guardian_phone:'9830011000',address:'Kanyapur, Asansol',  klass:'Class 10',session:'2026–27',status:'ACTIVE'},
      {id:2,student_code:'SE-2026-051',full_name:'Aman Gupta', phone:'9830022222',email:'',guardian_name:'Vinod Gupta',  guardian_phone:'9830022000',address:'Asansol Court area',  klass:'Class 9', session:'2026–27',status:'ACTIVE'},
      {id:3,student_code:'SE-2026-060',full_name:'Sneha Das',  phone:'9830033333',email:'',guardian_name:'Mala Das',     guardian_phone:'9830033000',address:'Burnpur, Asansol',    klass:'Class 12',session:'2026–27',status:'ACTIVE'},
      {id:4,student_code:'SE-2026-063',full_name:'Rahul Roy',  phone:'9830044444',email:'',guardian_name:'Pradip Roy',   guardian_phone:'9830044000',address:'Kanyapur, Asansol',  klass:'Class 11',session:'2026–27',status:'ACTIVE'},
      {id:5,student_code:'SE-2026-070',full_name:'Ishita Paul',phone:'9830055555',email:'',guardian_name:'Rina Paul',    guardian_phone:'9830055000',address:'Hutton Road, Asansol',klass:'Class 10',session:'2026–27',status:'WITHDRAWN'}
    ],
    /* Enrollment = a student attached to one teacher-subject authorisation for a
       session; it is what billing cycles hang off. ts_id links teacher_subjects
       (teacher+subject); teacher/subject are denormalised here for display. */
    enrollments:[
      {id:1201, student_id:2, student:'Aman Gupta', student_code:'SE-2026-051', ts_id:2, subject:'Mathematics', teacher:'Udayan Choudhury',   session:'2026–27', status:'ACTIVE',              created_at:'2026-07-05'},
      {id:1202, student_id:3, student:'Sneha Das',  student_code:'SE-2026-060', ts_id:4, subject:'Mathematics', teacher:'Swapnanil Majumdar', session:'2026–27', status:'ACTIVE',              created_at:'2026-07-06'},
      {id:1203, student_id:1, student:'Riya Sen',   student_code:'SE-2026-045', ts_id:1, subject:'Computer',    teacher:'Udayan Choudhury',   session:'2026–27', status:'ACTIVE',              created_at:'2026-06-28'},
      {id:1204, student_id:4, student:'Rahul Roy',  student_code:'SE-2026-063', ts_id:5, subject:'Physics',     teacher:'Swapnanil Majumdar', session:'2026–27', status:'PENDING_DEACTIVATION', created_at:'2026-05-12'},
      {id:1205, student_id:1, student:'Riya Sen',   student_code:'SE-2026-045', ts_id:4, subject:'Mathematics', teacher:'Swapnanil Majumdar', session:'2026–27', status:'INACTIVE',            created_at:'2026-04-02', reviewed_at:'2026-06-30'},
      {id:1206, student_id:3, student:'Sneha Das',  student_code:'SE-2026-060', ts_id:1, subject:'Computer',    teacher:'Udayan Choudhury',   session:'2026–27', status:'ACTIVE',              created_at:'2026-07-10'},
      {id:1207, student_id:4, student:'Rahul Roy',  student_code:'SE-2026-063', ts_id:2, subject:'Mathematics', teacher:'Udayan Choudhury',   session:'2026–27', status:'ACTIVE',              created_at:'2026-07-11'},
      {id:88,   student_id:4, student:'Rahul Roy',  student_code:'SE-2026-063', ts_id:1, subject:'Computer',    teacher:'Udayan Choudhury',   session:'2026–27', status:'PENDING', created_at:'2026-08-20', requested_by:'Udayan Choudhury'},
      {id:89,   student_id:3, student:'Sneha Das',  student_code:'SE-2026-060', ts_id:5, subject:'Physics',     teacher:'Swapnanil Majumdar', session:'2026–27', status:'PENDING', created_at:'2026-08-21', requested_by:'Swapnanil Majumdar'},
      {id:90,   student_id:2, student:'Aman Gupta', student_code:'SE-2026-051', ts_id:3, subject:'Biology',     teacher:'Arijit Chandra',     session:'2026–27', status:'PENDING', created_at:'2026-08-21', requested_by:'Arijit Chandra'}
    ],
    sessions:[
      {id:5,name:'2026–27',start_date:'2026-04-01',end_date:'2027-03-31',status:'ACTIVE'},
      {id:4,name:'2025–26',start_date:'2025-04-01',end_date:'2026-03-31',status:'CLOSED'},
      {id:3,name:'2024–25',start_date:'2024-04-01',end_date:'2025-03-31',status:'CLOSED'}
    ],
    classes:[
      {id:1,name:'Class 9',level:9,is_active:true},
      {id:2,name:'Class 10',level:10,is_active:true},
      {id:3,name:'Class 11',level:11,is_active:true},
      {id:4,name:'Class 12',level:12,is_active:true},
      {id:5,name:'Class 8',level:8,is_active:false}
    ],
    subjects:[
      {id:1,code:'MATH',name:'Mathematics',is_active:true},
      {id:2,code:'ENG',name:'English',is_active:true},
      {id:3,code:'COMP',name:'Computer',is_active:true},
      {id:4,code:'PHY',name:'Physics',is_active:true},
      {id:5,code:'BIO',name:'Biology',is_active:true},
      {id:6,code:'SANS',name:'Sanskrit',is_active:false}
    ],
    teachers:[
      {id:1,teacher_code:'TCH-001',full_name:'Udayan Choudhury',phone:'9830011122',email:'u.choudhury@smartedutrack.in',is_active:true},
      {id:2,teacher_code:'TCH-002',full_name:'Arijit Chandra',phone:'9830033344',email:'a.chandra@smartedutrack.in',is_active:true},
      {id:3,teacher_code:'TCH-003',full_name:'Swapnanil Majumdar',phone:'9830055566',email:'s.majumdar@smartedutrack.in',is_active:true},
      {id:4,teacher_code:'TCH-004',full_name:'Rupa Konar',phone:'9830077788',email:'r.konar@smartedutrack.in',is_active:true},
      {id:5,teacher_code:'TCH-005',full_name:'Raj Bharti',phone:'9830099900',email:'r.bharti@smartedutrack.in',is_active:false}
    ],
    teacherSubjects:[
      {id:1,teacher_id:1,teacher:'Udayan Choudhury',subject_id:3,subject:'Computer',is_active:true},
      {id:2,teacher_id:1,teacher:'Udayan Choudhury',subject_id:1,subject:'Mathematics',is_active:true},
      {id:3,teacher_id:2,teacher:'Arijit Chandra',subject_id:5,subject:'Biology',is_active:true},
      {id:4,teacher_id:3,teacher:'Swapnanil Majumdar',subject_id:1,subject:'Mathematics',is_active:true},
      {id:5,teacher_id:3,teacher:'Swapnanil Majumdar',subject_id:4,subject:'Physics',is_active:true},
      {id:6,teacher_id:4,teacher:'Rupa Konar',subject_id:2,subject:'English',is_active:false}
    ],
    /* attendance is one PRESENT/ABSENT row per enrollment per date; seeded in
       seedHistory() below for a couple of days this month. */
    attendance:[],
    /* Fee configuration: the monthly fee per class + subject. Billing reads these.
       first_month_billing decides whether a mid-month joiner pays full or half. */
    feeConfigs:[
      {id:1, class:'Class 9',  subject:'Mathematics', amount:900,  first_month_billing:'FULL', effective_from:'2026-04-01', is_active:true},
      {id:2, class:'Class 10', subject:'Computer',    amount:1100, first_month_billing:'HALF', effective_from:'2026-04-01', is_active:true},
      {id:3, class:'Class 11', subject:'Mathematics', amount:1050, first_month_billing:'FULL', effective_from:'2026-04-01', is_active:true},
      {id:4, class:'Class 11', subject:'Physics',     amount:1200, first_month_billing:'FULL', effective_from:'2026-04-01', is_active:true},
      {id:5, class:'Class 12', subject:'Mathematics', amount:1150, first_month_billing:'FULL', effective_from:'2026-04-01', is_active:true},
      {id:6, class:'Class 12', subject:'Computer',    amount:1300, first_month_billing:'HALF', effective_from:'2026-04-01', is_active:true},
      {id:7, class:'Class 9',  subject:'Computer',    amount:950,  first_month_billing:'FULL', effective_from:'2026-04-01', is_active:false}
    ],
    /* Billing cycles: current month (OPEN) + the prior two (CLOSED). Records,
       billed and collected totals are filled by seedHistory() so every finance
       screen reconciles. Months are relative to today, so the demo always has a
       live current cycle. */
    billingCycles:[
      {id:3, month:M0, label:monthLabel(M0), period_start:M0+'-01', period_end:monthEnd(M0), status:'OPEN',   generated_at:M0+'-01', records:0, billed:0, collected:0},
      {id:2, month:M1, label:monthLabel(M1), period_start:M1+'-01', period_end:monthEnd(M1), status:'CLOSED', generated_at:M1+'-01', records:0, billed:0, collected:0},
      {id:1, month:M2, label:monthLabel(M2), period_start:M2+'-01', period_end:monthEnd(M2), status:'CLOSED', generated_at:M2+'-01', records:0, billed:0, collected:0}
    ],
    feeRecords:[],           /* one row per enrollment per cycle; built by seedHistory() */
    payments:[],             /* built by seedHistory() */
    paymentAllocations:[],   /* built by seedHistory() */
    teacherPayouts:[]        /* one seeded by seedHistory() */
  };

  /* Build a self-consistent finance history: the six recurring enrollments billed
     across three months, with payments + allocations that reconcile to each
     cycle's collected total and to commissions/payouts. */
  (function seedHistory(){
    var RECUR=[1201,1202,1203,1204,1206,1207];
    function feeFor(eid){ var e=find(DB.enrollments,eid), s=find(DB.students,e.student_id);
      var c=DB.feeConfigs.filter(function(x){return x.is_active&&x.class===s.klass&&x.subject===e.subject;})[0];
      var ts=find(DB.teacherSubjects,e.ts_id);
      return {e:e, s:s, amt:c?c.amount:0, teacher_id:ts?ts.teacher_id:null}; }
    function genCycle(cycleId, month, allocMap){
      var billed=0, collected=0, byStudent={};
      RECUR.forEach(function(eid){ var f=feeFor(eid); billed+=f.amt;
        var alloc=(allocMap&&allocMap[eid]!=null)?allocMap[eid]:f.amt;
        var frid=nextId(DB.feeRecords);
        DB.feeRecords.push({id:frid,billing_cycle_id:cycleId,month:month,enrollment_id:eid,student_id:f.e.student_id,
          student:f.e.student,student_code:f.e.student_code,klass:f.s.klass,subject:f.e.subject,teacher:f.e.teacher,teacher_id:f.teacher_id,
          amount:f.amt,allocated:alloc,status:alloc>=f.amt?'PAID':'PENDING'});
        if(alloc>0){ collected+=alloc;
          if(!byStudent[f.e.student_id]) byStudent[f.e.student_id]={e:f.e,total:0,allocs:[]};
          byStudent[f.e.student_id].total+=alloc; byStudent[f.e.student_id].allocs.push({frid:frid,amount:alloc}); }
      });
      Object.keys(byStudent).forEach(function(sid){ var b=byStudent[sid], pid=nextId(DB.payments);
        DB.payments.push({id:pid,student_id:+sid,student:b.e.student,student_code:b.e.student_code,amount:b.total,
          method:(month===M0?'UPI':'CASH'),reference:(month===M0?'UPI-8842':''),paid_on:month+'-08',note:'',allocated:b.total});
        b.allocs.forEach(function(a){ DB.paymentAllocations.push({id:nextId(DB.paymentAllocations),payment_id:pid,fee_record_id:a.frid,amount:a.amount}); });
      });
      var c=find(DB.billingCycles,cycleId); if(c){ c.records=RECUR.length; c.billed=billed; c.collected=collected; }
    }
    genCycle(1, M2, null);                                 /* two months ago — fully paid */
    genCycle(2, M1, {1204:0});                             /* last month — Rahul/Physics unpaid */
    genCycle(3, M0, {1203:0,1204:0,1206:850,1207:0});      /* this month — 1206 part-paid, others pending */
    var uAcc=accruedByTeacher()[1]||0;                     /* prior payout to Udayan, within balance */
    DB.teacherPayouts.push({id:1,teacher:'Udayan Choudhury',teacher_code:'TCH-001',teacher_id:1,amount:Math.min(2000,uAcc),method:'BANK_TRANSFER',reference:'NEFT-5521',paid_on:M1+'-12',note:''});
    var day=Math.max(1,_now.getDate()-2), ATTN=M0+'-'+('0'+day).slice(-2);
    [[1201,'PRESENT'],[1203,'ABSENT'],[1206,'PRESENT'],[1207,'PRESENT']].forEach(function(p){ DB.attendance.push({enrollment_id:p[0],date:ATTN,status:p[1]}); });
  })();

  /* Rehydrate a persisted session DB so state survives page navigation. The fresh
     seed above becomes the default; a saved snapshot (same schema version) wins. */
  try{ var _saved=sessionStorage.getItem(DBKEY); if(_saved){ var _p=JSON.parse(_saved); if(_p&&_p.students&&_p.feeRecords&&_p.billingCycles) DB=_p; } }catch(e){}

  SE.api={
    USE_MOCK:USE_MOCK,
    auth:{
      login:function(body){
        if(!body||!body.email||!body.password)
          return Promise.reject({code:'AUTH_MISSING',message:'Enter your email and password.'});
        var u=USERS.filter(function(x){return x.email.toLowerCase()===String(body.email).toLowerCase();})[0];
        if(!u){                     /* demo fallback: infer role from the local-part */
          var lp=String(body.email).split('@')[0].toLowerCase();
          u={email:body.email, name:body.email, role:/admin|super|head|principal/.test(lp)?SE.ROLE.SUPER_ADMIN:SE.ROLE.TEACHER};
        }
        return delay({ token:'mock.'+btoa(u.email).replace(/=/g,'')+'.'+Date.now(),
                       role:u.role, user:{name:u.name, email:u.email} });
      }
    },
    dashboard:{
      /* Live admin KPIs computed from the current DB (no static figures). */
      adminKpis: function(){
        var open=DB.billingCycles.filter(function(c){return c.status==='OPEN';}).sort(function(a,b){return a.month<b.month?1:-1;})[0]
              || DB.billingCycles.slice().sort(function(a,b){return a.month<b.month?1:-1;})[0];
        var duesStudents={}; DB.feeRecords.forEach(function(r){ if(r.amount-(r.allocated||0)>0) duesStudents[r.student_id]=true; });
        var pres=0,tot=0; DB.attendance.forEach(function(a){ tot++; if(a.status==='PRESENT') pres++; });
        var collected=open?open.collected:0;
        return delay({
          activeStudents:    DB.students.filter(function(s){return s.status==='ACTIVE';}).length,
          activeTeachers:    DB.teachers.filter(function(t){return t.is_active;}).length,
          activeEnrollments: DB.enrollments.filter(function(e){return e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION';}).length,
          pendingRequests:   DB.registrationRequests.filter(function(r){return r.status==='PENDING';}).length,
          pendingEnrollments:DB.enrollments.filter(function(e){return e.status==='PENDING';}).length,
          dues:              Object.keys(duesStudents).length,
          currentCycle:      open?open.label:'—',
          billed:            open?open.billed:0,
          collected:         collected,
          commission:        Math.round(collected*SE.COMMISSION_RATE/100),
          attendanceRate:    tot?Math.round(pres/tot*100):0
        });
      },
      /* Live teacher summary, scoped to the signed-in teacher. */
      teacherToday: function(){
        var t=currentTeacher();
        var open=DB.billingCycles.filter(function(c){return c.status==='OPEN';}).sort(function(a,b){return a.month<b.month?1:-1;})[0];
        var live=DB.enrollments.filter(function(e){return t&&e.teacher===t.full_name&&(e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION');});
        var bySub={}, studentIds={};
        live.forEach(function(e){ studentIds[e.student_id]=true; if(!bySub[e.subject]) bySub[e.subject]={}; bySub[e.subject][e.student_id]=true; });
        var subjects=Object.keys(bySub);
        var sessions=subjects.map(function(s){ return {subject:s, count:Object.keys(bySub[s]).length}; });
        var month=open?open.month:null, col=0;
        DB.paymentAllocations.forEach(function(a){ var r=find(DB.feeRecords,a.fee_record_id); if(r&&t&&r.teacher_id===t.id&&(!month||r.month===month)) col+=a.amount; });
        var td=today(), enrIds={}; live.forEach(function(e){ enrIds[e.id]=true; });
        var marked=DB.attendance.some(function(a){ return enrIds[a.enrollment_id]&&a.date===td; });
        return delay({ subjects:subjects, students:Object.keys(studentIds).length, cycle:open?open.label:'—',
          commission:Math.round(col*SE.COMMISSION_RATE/100), marked:marked, sessions:sessions });
      }
    },
    registrationRequests:{
      list:   function(f){ f=f||{}; var a=DB.registrationRequests.slice();
                if(f.status) a=a.filter(function(r){return r.status===f.status;});
                if(f.mine){ var t=currentTeacher(); a=a.filter(function(r){return t&&r.requested_by===t.full_name;}); }
                a.sort(function(x,y){ return x.created_at<y.created_at?1:x.created_at>y.created_at?-1:0; }); return delay(a); },
      create: function(b){
        var t=currentTeacher();
        var row={id:nextId(DB.registrationRequests),full_name:String(b.full_name||'').trim(),phone:b.phone||'',
          guardian_name:b.guardian_name||'',guardian_phone:b.guardian_phone||'',address:b.address||'',
          klass:b.klass,session:b.session,requested_by:t?t.full_name:(b.requested_by||'A teacher'),created_at:today(),status:'PENDING'};
        DB.registrationRequests.unshift(row); return delay(row);
      },
      approve:function(id){
        var r=find(DB.registrationRequests,id);
        if(!r||r.status!=='PENDING') return Promise.reject({code:'STATE',message:'That request is no longer pending.'});
        r.status='APPROVED'; r.reviewed_at=today();
        var code='SE-'+new Date().getFullYear()+'-'+pad3(nextStudentSeq());
        DB.students.unshift({id:nextId(DB.students),student_code:code,full_name:r.full_name,phone:r.phone||'',email:r.email||'',
          guardian_name:r.guardian_name||'',guardian_phone:r.guardian_phone||'',address:r.address||'',klass:r.klass,session:r.session,status:'ACTIVE'});
        return delay({id:+id,status:'APPROVED',student_code:code});
      },
      reject: function(id){
        var r=find(DB.registrationRequests,id);
        if(!r||r.status!=='PENDING') return Promise.reject({code:'STATE',message:'That request is no longer pending.'});
        r.status='REJECTED'; r.reviewed_at=today();
        return delay({id:+id,status:'REJECTED'});
      }
    },
    students:{
      list:         function(f){ f=f||{}; var a=DB.students.slice(); if(f.status) a=a.filter(function(s){return s.status===f.status;}); return delay(a); },
      updateProfile:function(id,b){ var s=find(DB.students,id); if(s){['full_name','phone','email','guardian_name','guardian_phone','address'].forEach(function(k){ if(b[k]!=null) s[k]=b[k]; });} return delay(s); },
      withdraw:     function(id){ var s=find(DB.students,id); if(s) s.status='WITHDRAWN'; return delay({id:+id,status:'WITHDRAWN'}); },
      readmit:      function(id,b){ var s=find(DB.students,id); if(s){ s.status='ACTIVE'; if(b&&b.klass) s.klass=b.klass; if(b&&b.session) s.session=b.session; } return delay({id:+id,status:'ACTIVE'}); },
      activeClasses:function(){ return delay(DB.classes.filter(function(c){return c.is_active;}).map(function(c){return c.name;})); },
      activeSession:function(){ var a=DB.sessions.filter(function(s){return s.status==='ACTIVE';})[0]; return delay(a?a.name:null); }
    },
    enrollments:{
      list:    function(f){ f=f||{}; var a=DB.enrollments.slice(); if(f.status) a=a.filter(function(e){return e.status===f.status;});
                 a.sort(function(x,y){ return x.created_at<y.created_at?1:x.created_at>y.created_at?-1:0; }); return delay(a); },
      pending: function(){ return delay(DB.enrollments.filter(function(e){return e.status==='PENDING';})); },
      options: function(){ return delay({
        students:DB.students.filter(function(s){return s.status==='ACTIVE';}).map(function(s){return {id:s.id,label:s.full_name+' · '+s.student_code};}),
        authorizations:DB.teacherSubjects.filter(function(t){return t.is_active;}).map(function(t){return {id:t.id,label:t.teacher+' — '+t.subject,teacher:t.teacher,subject:t.subject};})
      }); },
      create:  function(b){
        var sid=+b.student_id, tsid=+b.ts_id;
        var s=find(DB.students,sid), ts=find(DB.teacherSubjects,tsid);
        if(!s||!ts) return Promise.reject({code:'INVALID',message:'Choose a student and a teacher-subject.'});
        /* One live enrollment per student+authorisation (ERD): block a duplicate that is
           still pending, active, or winding down. */
        var dup=DB.enrollments.some(function(e){ return e.student_id===sid&&e.ts_id===tsid&&(e.status==='PENDING'||e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION'); });
        if(dup) return Promise.reject({code:'DUPLICATE',message:s.full_name+' already has a live enrollment for that teacher-subject.'});
        var ses=DB.sessions.filter(function(x){return x.status==='ACTIVE';})[0];
        var row={id:nextId(DB.enrollments),student_id:sid,student:s.full_name,student_code:s.student_code,ts_id:tsid,subject:ts.subject,teacher:ts.teacher,session:ses?ses.name:'',status:'ACTIVE',created_at:today()};
        DB.enrollments.unshift(row); return delay(row);
      },
      approve: function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='PENDING') return Promise.reject({code:'STATE',message:'That request is no longer pending.'}); e.status='ACTIVE'; return delay({id:+id,status:'ACTIVE'}); },
      reject:  function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='PENDING') return Promise.reject({code:'STATE',message:'That request is no longer pending.'}); e.status='REJECTED'; e.reviewed_at=today(); return delay({id:+id,status:'REJECTED'}); },
      deactivate:         function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='ACTIVE') return Promise.reject({code:'STATE',message:'Only an active enrollment can be deactivated.'}); e.status='PENDING_DEACTIVATION'; return delay({id:+id,status:'PENDING_DEACTIVATION'}); },
      cancelDeactivation: function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='PENDING_DEACTIVATION') return Promise.reject({code:'STATE',message:'That enrollment is not winding down.'}); e.status='ACTIVE'; return delay({id:+id,status:'ACTIVE'}); },
      end:                function(id){ var e=find(DB.enrollments,id); if(!e||(e.status!=='PENDING_DEACTIVATION'&&e.status!=='ACTIVE')) return Promise.reject({code:'STATE',message:'That enrollment can’t be ended.'}); e.status='INACTIVE'; e.reviewed_at=today(); return delay({id:+id,status:'INACTIVE'}); },
      reactivate:         function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='INACTIVE') return Promise.reject({code:'STATE',message:'Only an inactive enrollment can be reactivated.'}); e.status='ACTIVE'; return delay({id:+id,status:'ACTIVE'}); },
      changeAssignment:   function(id,tsId){ var e=find(DB.enrollments,id), ts=find(DB.teacherSubjects,+tsId);
                 if(!e||!ts) return Promise.reject({code:'INVALID',message:'Pick a teacher-subject.'});
                 if(e.ts_id===ts.id) return Promise.reject({code:'NOCHANGE',message:'That’s already the assigned teacher-subject.'});
                 e.ts_id=ts.id; e.subject=ts.subject; e.teacher=ts.teacher; return delay(e); },
      request: function(body){ return delay(Object.assign({id:Date.now(),status:'PENDING'},body)); }
    },
    /* Teacher-scoped views. Everything is filtered to the signed-in teacher; a
       teacher can only request (never directly approve) — the admin decides. */
    teacher:{
      me:       function(){ var t=currentTeacher(); return delay(t?Object.assign({},t):null); },
      subjects: function(){ var t=currentTeacher(); if(!t) return delay([]);
                  return delay(DB.teacherSubjects.filter(function(x){return x.teacher_id===t.id&&x.is_active;})
                    .map(function(x){return {ts_id:x.id,subject:x.subject,subject_id:x.subject_id};})); },
      students: function(){
                  var t=currentTeacher(); var map={};
                  DB.enrollments.filter(function(e){return t&&e.teacher===t.full_name&&(e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION');})
                    .forEach(function(e){
                      if(!map[e.student_id]){ var s=find(DB.students,e.student_id)||{};
                        map[e.student_id]={student_id:e.student_id,student:e.student,student_code:e.student_code,
                          klass:s.klass||'',guardian_name:s.guardian_name||'',guardian_phone:s.guardian_phone||'',subjects:[]}; }
                      if(map[e.student_id].subjects.indexOf(e.subject)<0) map[e.student_id].subjects.push(e.subject);
                    });
                  return delay(Object.keys(map).map(function(k){return map[k];})
                    .sort(function(a,b){return a.student<b.student?-1:a.student>b.student?1:0;})); },
      enrollments: function(f){ f=f||{}; var t=currentTeacher();
                  var a=DB.enrollments.filter(function(e){return t&&e.teacher===t.full_name;});
                  if(f.status) a=a.filter(function(e){return e.status===f.status;});
                  a.sort(function(x,y){ return x.created_at<y.created_at?1:x.created_at>y.created_at?-1:0; }); return delay(a); },
      requestEnrollment: function(b){
                  var t=currentTeacher(), sid=+b.student_id, tsid=+b.ts_id;
                  var s=find(DB.students,sid), ts=find(DB.teacherSubjects,tsid);
                  if(!s||!ts) return Promise.reject({code:'INVALID',message:'Choose a student and a subject.'});
                  if(t&&ts.teacher_id!==t.id) return Promise.reject({code:'FORBIDDEN',message:'You can only request enrollments for your own subjects.'});
                  var dup=DB.enrollments.some(function(e){return e.student_id===sid&&e.ts_id===tsid&&(e.status==='PENDING'||e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION');});
                  if(dup) return Promise.reject({code:'DUPLICATE',message:s.full_name+' already has a live enrollment for that subject.'});
                  var ses=DB.sessions.filter(function(x){return x.status==='ACTIVE';})[0];
                  var row={id:nextId(DB.enrollments),student_id:sid,student:s.full_name,student_code:s.student_code,ts_id:tsid,subject:ts.subject,teacher:ts.teacher,session:ses?ses.name:'',status:'PENDING',created_at:today(),requested_by:t?t.full_name:'A teacher'};
                  DB.enrollments.unshift(row); return delay(row); },
      cancelRequest: function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='PENDING') return Promise.reject({code:'STATE',message:'That request can’t be cancelled.'}); e.status='REJECTED'; e.reviewed_at=today(); return delay({id:+id,status:'REJECTED'}); },
      requestDeactivation: function(id){ var e=find(DB.enrollments,id); if(!e||e.status!=='ACTIVE') return Promise.reject({code:'STATE',message:'Only an active enrollment can be ended.'}); e.status='PENDING_DEACTIVATION'; return delay({id:+id,status:'PENDING_DEACTIVATION'}); },
      /* Attendance — one row per active enrollment for the chosen date, carrying any
         mark already saved. Editable only within the current month (the lock). */
      attendanceRoster: function(f){ f=f||{}; var t=currentTeacher(), date=f.date;
        var live=DB.enrollments.filter(function(e){ return t&&e.teacher===t.full_name&&(e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION'); });
        if(f.ts_id) live=live.filter(function(e){ return e.ts_id===+f.ts_id; });
        return delay(live.map(function(e){
          var mark=DB.attendance.filter(function(a){ return a.enrollment_id===e.id&&a.date===date; })[0];
          return {enrollment_id:e.id, student:e.student, student_code:e.student_code, subject:e.subject, status:mark?mark.status:null};
        }).sort(function(a,b){ return a.student<b.student?-1:a.student>b.student?1:0; }));
      },
      attendanceSave: function(b){ b=b||{}; var date=b.date, marks=b.marks||[];
        if(String(date||'').slice(0,7)!==today().slice(0,7)) return Promise.reject({code:'LOCKED',message:'Attendance can only be recorded for the current month.'});
        marks.forEach(function(m){
          var row=DB.attendance.filter(function(a){ return a.enrollment_id===+m.enrollment_id&&a.date===date; })[0];
          if(row) row.status=m.status; else DB.attendance.push({enrollment_id:+m.enrollment_id,date:date,status:m.status});
        });
        var present=marks.filter(function(m){return m.status==='PRESENT';}).length;
        return delay({date:date, present:present, absent:marks.length-present, total:marks.length});
      },
      /* This teacher's own commission: earned (50% of collected for their subjects),
         paid out to them, balance, plus a per-month breakdown and their payouts. */
      commission: function(){
        var t=currentTeacher(); if(!t) return delay({rate:SE.COMMISSION_RATE, collected:0, commission:0, paid:0, balance:0, months:[], payouts:[]});
        var byMonth={}, collected=0;
        DB.paymentAllocations.forEach(function(a){ var r=find(DB.feeRecords,a.fee_record_id); if(!r||r.teacher_id!==t.id) return;
          collected+=a.amount;
          if(!byMonth[r.month]) byMonth[r.month]={month:r.month, collected:0, subjects:{}};
          byMonth[r.month].collected+=a.amount;
          byMonth[r.month].subjects[r.subject]=(byMonth[r.month].subjects[r.subject]||0)+a.amount;
        });
        var months=Object.keys(byMonth).sort().reverse().map(function(m){ var x=byMonth[m];
          return {month:m, collected:x.collected, commission:Math.round(x.collected*SE.COMMISSION_RATE/100),
            subjects:Object.keys(x.subjects).map(function(s){return {subject:s, collected:x.subjects[s]};}).sort(function(a,b){return b.collected-a.collected;})}; });
        var commission=Math.round(collected*SE.COMMISSION_RATE/100);
        var payouts=DB.teacherPayouts.filter(function(p){return p.teacher===t.full_name;}).slice().sort(function(x,y){return x.paid_on<y.paid_on?1:-1;});
        var paid=payouts.reduce(function(s,p){return s+p.amount;},0);
        return delay({rate:SE.COMMISSION_RATE, collected:collected, commission:commission, paid:paid, balance:commission-paid, months:months, payouts:payouts});
      }
    },
    sessions:{
      list:    function(){ return delay(DB.sessions.slice()); },
      create:  function(b){ var row={id:nextId(DB.sessions),name:b.name,start_date:b.start_date,end_date:b.end_date,status:'CLOSED'}; DB.sessions.unshift(row); return delay(row); },
      activate:function(id){ id=+id; DB.sessions.forEach(function(s){ if(s.id===id) s.status='ACTIVE'; else if(s.status==='ACTIVE') s.status='CLOSED'; }); return delay({id:id,status:'ACTIVE'}); },
      close:   function(id){ var s=find(DB.sessions,id); if(s) s.status='CLOSED'; return delay({id:+id,status:'CLOSED'}); }
    },
    classes:{
      list:     function(){ return delay(DB.classes.slice()); },
      create:   function(b){
        var name=String(b.name||'').trim(), level=+b.level;
        if(DB.classes.some(function(c){return c.name.toLowerCase()===name.toLowerCase();})) return Promise.reject({code:'DUPLICATE',message:'A class with that name already exists.'});
        if(DB.classes.some(function(c){return c.level===level;})) return Promise.reject({code:'DUPLICATE',message:'A class with level '+level+' already exists.'});
        var row={id:nextId(DB.classes),name:name,level:level,is_active:true}; DB.classes.unshift(row); return delay(row);
      },
      setActive:function(id,active){ var c=find(DB.classes,id); if(c) c.is_active=!!active; return delay({id:+id,is_active:!!active}); }
    },
    subjects:{
      list:     function(){ return delay(DB.subjects.slice()); },
      create:   function(b){
        var code=String(b.code||'').toUpperCase().trim(), name=String(b.name||'').trim();
        if(DB.subjects.some(function(s){return s.code===code;})) return Promise.reject({code:'DUPLICATE',message:'That subject code is already in use.'});
        if(DB.subjects.some(function(s){return s.name.toLowerCase()===name.toLowerCase();})) return Promise.reject({code:'DUPLICATE',message:'A subject with that name already exists.'});
        var row={id:nextId(DB.subjects),code:code,name:name,is_active:true}; DB.subjects.unshift(row); return delay(row);
      },
      setActive:function(id,active){ var s=find(DB.subjects,id); if(s) s.is_active=!!active; return delay({id:+id,is_active:!!active}); }
    },
    teachers:{
      list:     function(){ return delay(DB.teachers.slice()); },
      create:   function(b){
        var email=String(b.email||'').toLowerCase().trim();
        if(DB.teachers.some(function(t){return (t.email||'').toLowerCase()===email;})) return Promise.reject({code:'DUPLICATE',message:'That email is already used by another teacher.'});
        var n=DB.teachers.reduce(function(m,t){var k=parseInt((t.teacher_code||'').split('-')[1],10)||0;return Math.max(m,k);},0)+1;
        var row={id:nextId(DB.teachers),teacher_code:'TCH-'+pad3(n),full_name:b.full_name,phone:b.phone||'',email:b.email,is_active:true};
        DB.teachers.unshift(row); return delay(row);
      },
      setActive:function(id,active){ var t=find(DB.teachers,id); if(t) t.is_active=!!active; return delay({id:+id,is_active:!!active}); }
    },
    teacherSubjects:{
      list:    function(){ return delay(DB.teacherSubjects.slice()); },
      options: function(){ return delay({
        teachers:DB.teachers.filter(function(t){return t.is_active;}).map(function(t){return {id:t.id,name:t.full_name};}),
        subjects:DB.subjects.filter(function(s){return s.is_active;}).map(function(s){return {id:s.id,name:s.name};})
      }); },
      create:  function(b){
        var tid=+b.teacher_id, sid=+b.subject_id;
        /* One authorization row per Teacher+Subject (ERD §5.8). If a row already
           exists, reactivate it rather than creating a duplicate; reject only if
           it is already active. */
        var existing=DB.teacherSubjects.filter(function(x){return x.teacher_id===tid&&x.subject_id===sid;})[0];
        if(existing){
          if(existing.is_active) return Promise.reject({code:'DUPLICATE',message:'That teacher is already authorised for that subject.'});
          existing.is_active=true; return delay(existing);
        }
        var t=find(DB.teachers,tid), s=find(DB.subjects,sid);
        var row={id:nextId(DB.teacherSubjects),teacher_id:tid,teacher:t?t.full_name:'',subject_id:sid,subject:s?s.name:'',is_active:true};
        DB.teacherSubjects.unshift(row); return delay(row);
      },
      setActive:function(id,active){ var x=find(DB.teacherSubjects,id); if(x) x.is_active=!!active; return delay({id:+id,is_active:!!active}); }
    },
    /* ---------------- Finance ---------------- */
    feeConfigs:{
      list:    function(f){ f=f||{}; var a=DB.feeConfigs.slice();
                 if(f.active==='ACTIVE') a=a.filter(function(c){return c.is_active;});
                 else if(f.active==='INACTIVE') a=a.filter(function(c){return !c.is_active;});
                 a.sort(function(x,y){ var kx=x.class+'|'+x.subject, ky=y.class+'|'+y.subject; return kx<ky?-1:kx>ky?1:0; });
                 return delay(a); },
      options: function(){ return delay({
                 classes:DB.classes.filter(function(c){return c.is_active;}).map(function(c){return c.name;}),
                 subjects:DB.subjects.filter(function(s){return s.is_active;}).map(function(s){return s.name;})
               }); },
      create:  function(b){
                 var klass=String(b.class||'').trim(), subject=String(b.subject||'').trim(), amount=+b.amount;
                 if(!klass||!subject) return Promise.reject({code:'INVALID',message:'Choose a class and a subject.'});
                 if(!(amount>0)) return Promise.reject({code:'INVALID',message:'Enter a monthly fee greater than zero.'});
                 if(DB.feeConfigs.some(function(c){return c.is_active&&c.class===klass&&c.subject===subject;}))
                   return Promise.reject({code:'DUPLICATE',message:'An active fee for that class and subject already exists.'});
                 var row={id:nextId(DB.feeConfigs),class:klass,subject:subject,amount:amount,
                   first_month_billing:(b.first_month_billing==='HALF'?'HALF':'FULL'),effective_from:b.effective_from||today(),is_active:true};
                 DB.feeConfigs.unshift(row); return delay(row); },
      update:  function(id,b){
                 var c=find(DB.feeConfigs,id); if(!c) return Promise.reject({code:'NOTFOUND',message:'Fee not found.'});
                 if(b.amount!=null){ var amt=+b.amount; if(!(amt>0)) return Promise.reject({code:'INVALID',message:'Enter a monthly fee greater than zero.'}); c.amount=amt; }
                 if(b.first_month_billing) c.first_month_billing=(b.first_month_billing==='HALF'?'HALF':'FULL');
                 if(b.effective_from) c.effective_from=b.effective_from;
                 return delay(c); },
      setActive:function(id,active){
                 var c=find(DB.feeConfigs,id); if(!c) return Promise.reject({code:'NOTFOUND',message:'Fee not found.'});
                 if(active && DB.feeConfigs.some(function(x){return x.id!==c.id&&x.is_active&&x.class===c.class&&x.subject===c.subject;}))
                   return Promise.reject({code:'DUPLICATE',message:'Another active fee already covers that class and subject.'});
                 c.is_active=!!active; return delay({id:+id,is_active:!!active}); }
    },
    billingCycles:{
      list:     function(){ var a=DB.billingCycles.slice(); a.sort(function(x,y){ return x.month<y.month?1:x.month>y.month?-1:0; }); return delay(a); },
      generate: function(b){
                  var month=String((b&&b.month)||'').slice(0,7);
                  if(!/^\d{4}-\d{2}$/.test(month)) return Promise.reject({code:'INVALID',message:'Choose a month to generate.'});
                  if(DB.billingCycles.some(function(c){return c.month===month;})) return Promise.reject({code:'DUPLICATE',message:'A billing cycle for that month already exists.'});
                  var y=+month.slice(0,4), m=+month.slice(5,7);
                  var lastDay=new Date(y,m,0).getDate();
                  var start=month+'-01', end=month+'-'+(lastDay<10?'0'+lastDay:lastDay);
                  var live=DB.enrollments.filter(function(e){ return e.status==='ACTIVE'||e.status==='PENDING_DEACTIVATION'; });
                  var cycleId=nextId(DB.billingCycles), billed=0, made=0, skipped=0;
                  live.forEach(function(e){
                    var stu=find(DB.students,e.student_id);
                    var cfg=DB.feeConfigs.filter(function(c){ return c.is_active&&stu&&c.class===stu.klass&&c.subject===e.subject; })[0];
                    if(!cfg){ skipped++; return; }
                    var amt=cfg.amount, ts=find(DB.teacherSubjects,e.ts_id);
                    if(cfg.first_month_billing==='HALF' && String(e.created_at||'').slice(0,7)===month) amt=Math.round(cfg.amount/2);
                    DB.feeRecords.push({id:nextId(DB.feeRecords),billing_cycle_id:cycleId,month:month,enrollment_id:e.id,
                      student_id:e.student_id,student:e.student,student_code:e.student_code,klass:stu?stu.klass:'',subject:e.subject,teacher:e.teacher,teacher_id:ts?ts.teacher_id:null,amount:amt,allocated:0,status:'PENDING'});
                    billed+=amt; made++;
                  });
                  var label=new Date(y,m-1,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
                  var cycle={id:cycleId,month:month,label:label,period_start:start,period_end:end,status:'OPEN',generated_at:today(),records:made,billed:billed,collected:0};
                  DB.billingCycles.unshift(cycle);
                  return delay({cycle:cycle,records:made,skipped:skipped,billed:billed}); },
      close:    function(id){ var c=find(DB.billingCycles,id); if(!c) return Promise.reject({code:'NOTFOUND',message:'Cycle not found.'});
                  if(c.status!=='OPEN') return Promise.reject({code:'STATE',message:'Only an open cycle can be closed.'}); c.status='CLOSED'; return delay({id:+id,status:'CLOSED'}); }
    },
    payments:{
      list: function(f){ f=f||{}; var a=DB.payments.slice();
              if(f.q){ var q=String(f.q).toLowerCase(); a=a.filter(function(p){ return (p.student+' '+p.student_code+' '+(p.reference||'')).toLowerCase().indexOf(q)>=0; }); }
              a.sort(function(x,y){ return x.paid_on<y.paid_on?1:x.paid_on>y.paid_on?-1:(y.id-x.id); }); return delay(a); },
      /* Active students for the record-payment picker, each with their total due
         (0 if none — you can still record an advance, kept entirely as credit).
         Those who owe sort to the top. */
      students: function(){
              var due={};
              DB.feeRecords.forEach(function(r){ var o=r.amount-(r.allocated||0); if(o>0) due[r.student_id]=(due[r.student_id]||0)+o; });
              return delay(DB.students.filter(function(s){return s.status==='ACTIVE';}).map(function(s){
                return {student_id:s.id, student:s.full_name, student_code:s.student_code, due:due[s.id]||0};
              }).sort(function(a,b){ return (b.due-a.due) || (a.student<b.student?-1:a.student>b.student?1:0); })); },
      /* One student's still-owing fee records, oldest month first. */
      pendingRecords: function(sid){ sid=+sid;
              return delay(DB.feeRecords.filter(function(r){ return r.student_id===sid && (r.amount-(r.allocated||0))>0; })
                .map(function(r){ return {id:r.id,month:r.month,subject:r.subject,klass:r.klass,amount:r.amount,allocated:r.allocated||0,outstanding:r.amount-(r.allocated||0)}; })
                .sort(function(a,b){ return a.month<b.month?-1:a.month>b.month?1:(a.subject<b.subject?-1:1); })); },
      /* Record a payment and apply the admin's manual allocation across records.
         Any amount not allocated is kept as credit (an advance) on the payment. */
      record: function(b){
              b=b||{}; var sid=+b.student_id, amount=+b.amount, allocs=b.allocations||[];
              var stu=find(DB.students,sid);
              if(!stu) return Promise.reject({code:'INVALID',message:'Choose a student.'});
              if(!(amount>0)) return Promise.reject({code:'INVALID',message:'Enter a payment amount greater than zero.'});
              if(SE.PAYMENT_METHODS.indexOf(b.method)<0) return Promise.reject({code:'INVALID',message:'Choose a payment method.'});
              var sum=0, i, rec, amt;
              for(i=0;i<allocs.length;i++){
                rec=find(DB.feeRecords,allocs[i].fee_record_id); amt=+allocs[i].amount;
                if(!rec||rec.student_id!==sid) return Promise.reject({code:'INVALID',message:'An allocation points to the wrong fee record.'});
                if(!(amt>=0)) return Promise.reject({code:'INVALID',message:'Allocations can’t be negative.'});
                if(amt>rec.amount-(rec.allocated||0)) return Promise.reject({code:'OVER',message:'You allocated more than is owed on '+rec.subject+' ('+rec.month+').'});
                sum+=amt;
              }
              if(sum>amount) return Promise.reject({code:'OVER',message:'Allocations exceed the payment amount.'});
              var pid=nextId(DB.payments);
              var payment={id:pid,student_id:sid,student:stu.full_name,student_code:stu.student_code,amount:amount,method:b.method,reference:b.reference||'',paid_on:b.paid_on||today(),note:b.note||'',allocated:sum};
              DB.payments.unshift(payment);
              allocs.forEach(function(a){ var m=+a.amount; if(!(m>0)) return;
                var r=find(DB.feeRecords,a.fee_record_id);
                DB.paymentAllocations.push({id:nextId(DB.paymentAllocations),payment_id:pid,fee_record_id:r.id,amount:m});
                r.allocated=(r.allocated||0)+m; if(r.allocated>=r.amount) r.status='PAID';
                var cyc=find(DB.billingCycles,r.billing_cycle_id); if(cyc) cyc.collected=(cyc.collected||0)+m;
              });
              return delay({payment:payment, allocated:sum, credit:amount-sum}); }
    },
    dues:{
      summary:  function(){ var totalDue=0, records=0, students={};
                  DB.feeRecords.forEach(function(r){ var out=r.amount-(r.allocated||0); if(out>0){ totalDue+=out; records++; students[r.student_id]=true; } });
                  return delay({totalDue:totalDue, records:records, students:Object.keys(students).length}); },
      byStudent:function(f){ f=f||{}; var map={};
                  DB.feeRecords.forEach(function(r){ var out=r.amount-(r.allocated||0); if(out<=0) return;
                    if(!map[r.student_id]) map[r.student_id]={student_id:r.student_id,student:r.student,student_code:r.student_code,klass:r.klass,total:0,items:[]};
                    map[r.student_id].total+=out; map[r.student_id].items.push({month:r.month,subject:r.subject,outstanding:out}); });
                  var rows=Object.keys(map).map(function(k){return map[k];});
                  if(f.q){ var q=String(f.q).toLowerCase(); rows=rows.filter(function(s){ return (s.student+' '+s.student_code).toLowerCase().indexOf(q)>=0 || s.items.some(function(i){return i.subject.toLowerCase().indexOf(q)>=0;}); }); }
                  rows.sort(function(a,b){ return b.total-a.total; }); return delay(rows); }
    },
    commissions:{
      /* Distinct months that have collected money, for the report filter. */
      months: function(){ var ms={}; DB.paymentAllocations.forEach(function(a){ var r=find(DB.feeRecords,a.fee_record_id); if(r) ms[r.month]=true; });
                return delay(Object.keys(ms).sort().reverse()); },
      /* Per-teacher commission = COMMISSION_RATE% of what's been collected for
         their subjects (summed from payment allocations). */
      report: function(f){ f=f||{}; var byT={};
                DB.paymentAllocations.forEach(function(a){
                  var rec=find(DB.feeRecords,a.fee_record_id); if(!rec||rec.teacher_id==null) return;
                  if(f.month && rec.month!==f.month) return;
                  var tid=rec.teacher_id;
                  if(!byT[tid]){ byT[tid]={teacher_id:tid, collected:0, subjects:{}}; }
                  byT[tid].collected+=a.amount;
                  byT[tid].subjects[rec.subject]=(byT[tid].subjects[rec.subject]||0)+a.amount;
                });
                var rows=Object.keys(byT).map(function(tid){
                  var t=byT[tid], tr=find(DB.teachers,tid);
                  t.teacher=tr?tr.full_name:'—'; t.teacher_code=tr?tr.teacher_code:'';
                  t.commission=Math.round(t.collected*SE.COMMISSION_RATE/100);
                  t.subjects=Object.keys(t.subjects).map(function(s){return {subject:s, collected:byT[tid].subjects[s]};}).sort(function(a,b){return b.collected-a.collected;});
                  return t;
                }).sort(function(a,b){ return b.commission-a.commission; });
                var totalCollected=rows.reduce(function(s,t){return s+t.collected;},0);
                var totalCommission=rows.reduce(function(s,t){return s+t.commission;},0);
                return delay({rows:rows, rate:SE.COMMISSION_RATE, totalCollected:totalCollected, totalCommission:totalCommission, teachers:rows.length}); }
    },
    payouts:{
      summary: function(){ var acc=accruedByTeacher(), paidM=paidByTeacher(), accrued=0, paid=0, payable=0, owing=0;
                 Object.keys(acc).forEach(function(n){ accrued+=acc[n]; var due=acc[n]-(paidM[n]||0); if(due>0){ payable+=due; owing++; } });
                 DB.teacherPayouts.forEach(function(p){ paid+=p.amount; });
                 return delay({accrued:accrued, paid:paid, payable:payable, owing:owing}); },
      /* Teachers with an unpaid balance, for the record-payout picker. */
      payable: function(){ var acc=accruedByTeacher(), paidM=paidByTeacher();
                 return delay(Object.keys(acc).map(function(tid){
                   var tr=find(DB.teachers,tid);
                   return {teacher_id:+tid, teacher:tr?tr.full_name:'—', teacher_code:tr?tr.teacher_code:'', accrued:acc[tid], paid:paidM[tid]||0, payable:acc[tid]-(paidM[tid]||0)};
                 }).filter(function(t){return t.payable>0;}).sort(function(a,b){return b.payable-a.payable;})); },
      list:    function(f){ f=f||{}; var a=DB.teacherPayouts.slice();
                 if(f.q){ var q=String(f.q).toLowerCase(); a=a.filter(function(p){ return (p.teacher+' '+p.teacher_code+' '+(p.reference||'')).toLowerCase().indexOf(q)>=0; }); }
                 a.sort(function(x,y){ return x.paid_on<y.paid_on?1:x.paid_on>y.paid_on?-1:(y.id-x.id); }); return delay(a); },
      record:  function(b){ b=b||{}; var amount=+b.amount;
                 var tr=DB.teachers.filter(function(x){return x.teacher_code===b.teacher_code;})[0];
                 if(!tr) return Promise.reject({code:'INVALID',message:'Choose a teacher.'});
                 if(!(amount>0)) return Promise.reject({code:'INVALID',message:'Enter a payout amount greater than zero.'});
                 if(SE.PAYMENT_METHODS.indexOf(b.method)<0) return Promise.reject({code:'INVALID',message:'Choose a payout method.'});
                 var payable=(accruedByTeacher()[tr.id]||0)-(paidByTeacher()[tr.id]||0);
                 if(amount>payable) return Promise.reject({code:'OVER',message:'That’s more than '+tr.full_name+'’s unpaid balance of '+SE.money(payable)+'.'});
                 var row={id:nextId(DB.teacherPayouts),teacher:tr.full_name,teacher_code:tr.teacher_code,teacher_id:tr.id,amount:amount,method:b.method,reference:b.reference||'',paid_on:b.paid_on||today(),note:b.note||''};
                 DB.teacherPayouts.unshift(row); return delay(row); }
    },
    /* Consolidated read-only overview for the Reports screen — everything derived
       live from the current DB so it always ties out with the operational screens. */
    reports:{
      overview: function(){
        var byStatus={PENDING:0,ACTIVE:0,PENDING_DEACTIVATION:0,INACTIVE:0,REJECTED:0};
        DB.enrollments.forEach(function(e){ byStatus[e.status]=(byStatus[e.status]||0)+1; });
        var cycles=DB.billingCycles.slice().sort(function(a,b){return a.month<b.month?1:-1;})
          .map(function(c){ return {label:c.label, month:c.month, status:c.status, billed:c.billed, collected:c.collected, records:c.records}; });
        var totalBilled=cycles.reduce(function(s,c){return s+c.billed;},0);
        var totalCollected=cycles.reduce(function(s,c){return s+c.collected;},0);
        var dueMap={}, dueTotal=0;
        DB.feeRecords.forEach(function(r){ var o=r.amount-(r.allocated||0); if(o>0){ dueTotal+=o;
          if(!dueMap[r.student_id]) dueMap[r.student_id]={student:r.student, student_code:r.student_code, total:0};
          dueMap[r.student_id].total+=o; } });
        var topDebtors=Object.keys(dueMap).map(function(k){return dueMap[k];}).sort(function(a,b){return b.total-a.total;}).slice(0,6);
        var acc=accruedByTeacher(), paidM=paidByTeacher();
        var teachers=Object.keys(acc).map(function(tid){ var tr=find(DB.teachers,tid);
          return {teacher:tr?tr.full_name:'—', teacher_code:tr?tr.teacher_code:'', commission:acc[tid], paid:paidM[tid]||0, payable:acc[tid]-(paidM[tid]||0)}; })
          .sort(function(a,b){return b.commission-a.commission;});
        var totalCommission=teachers.reduce(function(s,t){return s+t.commission;},0);
        return delay({
          kpis:{ activeStudents:DB.students.filter(function(s){return s.status==='ACTIVE';}).length,
                 activeEnrollments:byStatus.ACTIVE+byStatus.PENDING_DEACTIVATION,
                 totalCollected:totalCollected, totalBilled:totalBilled,
                 collectionRate:totalBilled?Math.round(totalCollected/totalBilled*100):0,
                 dueTotal:dueTotal, totalCommission:totalCommission },
          enrollmentsByStatus:byStatus, cycles:cycles, topDebtors:topDebtors, teachers:teachers });
      }
    }
    /* …more resources land in later phases. */
  };
})();
