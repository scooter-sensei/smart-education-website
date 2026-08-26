/* SmartEduTrack — shared status vocabulary, roles and formatters.
   One source of truth so a status renders identically on every screen, and
   always as a labelled pill (never colour alone — SRS §9.5). */
(function(){
  'use strict';
  var SE=window.SE=window.SE||{};

  SE.ROLE={ SUPER_ADMIN:'SUPER_ADMIN', TEACHER:'TEACHER' };
  SE.ROLE_LABEL={ SUPER_ADMIN:'Super Admin', TEACHER:'Teacher' };

  SE.STATUS={
    session:    ['ACTIVE','CLOSED'],
    admission:  ['ACTIVE','WITHDRAWN','COMPLETED'],
    enrollment: ['PENDING','ACTIVE','PENDING_DEACTIVATION','INACTIVE','REJECTED'],
    attendance: ['PRESENT','ABSENT'],
    fee:        ['PENDING','PAID'],
    request:    ['PENDING','APPROVED','REJECTED']
  };
  SE.PAYMENT_METHODS=['CASH','BANK_TRANSFER','UPI','CHEQUE'];
  SE.COMMISSION_RATE=50;         /* fixed in v1.0 (BRS §9) */
  SE.BILLING_FIRST_MONTH=['FULL','HALF'];

  /* Tone per (kind,value). PENDING is amber for a workflow that awaits action,
     but red for a fee record (an unpaid due) — so tone is keyed by kind. */
  var TONE={
    session:    { ACTIVE:'green', CLOSED:'gray' },
    admission:  { ACTIVE:'green', WITHDRAWN:'gray', COMPLETED:'blue' },
    enrollment: { PENDING:'amber', ACTIVE:'green', PENDING_DEACTIVATION:'amber', INACTIVE:'gray', REJECTED:'red' },
    attendance: { PRESENT:'green', ABSENT:'red' },
    fee:        { PENDING:'red', PAID:'green' },
    request:    { PENDING:'amber', APPROVED:'green', REJECTED:'red' },
    role:       { SUPER_ADMIN:'blue', TEACHER:'blue' }
  };
  function humanize(v){
    return String(v).toLowerCase().replace(/_/g,' ').replace(/^\w/,function(c){return c.toUpperCase();});
  }
  SE.statusChip=function(kind,value){
    return { value:value, label:humanize(value), tone:(TONE[kind]&&TONE[kind][value])||'gray' };
  };
  /* Build the pill element — text label carries the meaning, tone reinforces it. */
  SE.statusPill=function(kind,value){
    var c=SE.statusChip(kind,value);
    var el=document.createElement('span');
    el.className='pill pill-'+c.tone;
    el.textContent=c.label;
    el.setAttribute('data-status',value);
    return el;
  };

  SE.money=function(n){
    return '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
  };
  SE.fmtDate=function(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
    catch(e){ return String(iso); }
  };
})();
