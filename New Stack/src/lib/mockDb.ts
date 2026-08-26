/* The mock database — realistic roster and organic figures, with a self-consistent
   finance history so every screen reconciles. Persisted to sessionStorage so state
   (payments, generated cycles, approvals…) survives navigation within a session.
   Faithful port of the static app's in-memory DB. */
import { COMMISSION_RATE } from './constants'
import { readSession } from './session'
import type {
  AcademicSession,
  AttendanceRow,
  BillingCycle,
  Enrollment,
  FeeConfig,
  FeeRecord,
  Klass,
  Payment,
  PaymentAllocation,
  RegistrationRequest,
  Student,
  Subject,
  Teacher,
  TeacherPayout,
  TeacherSubject,
} from './types'

export const DBKEY = 'se-db-v2'

/* Current + prior two months (YYYY-MM), so seeded data always lands in "this
   month" regardless of when the demo runs. */
const ym = (d: Date) => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
const _now = new Date()
export const M0 = ym(_now)
export const M1 = ym(new Date(_now.getFullYear(), _now.getMonth() - 1, 1))
export const M2 = ym(new Date(_now.getFullYear(), _now.getMonth() - 2, 1))
export function monthLabel(m: string): string {
  try {
    return new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return m
  }
}
export function monthEnd(m: string): string {
  const y = +m.slice(0, 4)
  const mo = +m.slice(5, 7)
  const d = new Date(y, mo, 0).getDate()
  return m + '-' + (d < 10 ? '0' + d : d)
}

export interface Db {
  registrationRequests: RegistrationRequest[]
  students: Student[]
  enrollments: Enrollment[]
  sessions: AcademicSession[]
  classes: Klass[]
  subjects: Subject[]
  teachers: Teacher[]
  teacherSubjects: TeacherSubject[]
  attendance: AttendanceRow[]
  feeConfigs: FeeConfig[]
  billingCycles: BillingCycle[]
  feeRecords: FeeRecord[]
  payments: Payment[]
  paymentAllocations: PaymentAllocation[]
  teacherPayouts: TeacherPayout[]
}

export const USERS = [
  { email: 'admin@smartedutrack.in', role: 'SUPER_ADMIN' as const, name: 'Santana Mondal' },
  { email: 'u.choudhury@smartedutrack.in', role: 'TEACHER' as const, name: 'Udayan Choudhury' },
]

function seed(): Db {
  const db: Db = {
    registrationRequests: [
      { id: 31, full_name: 'Ananya Bose', phone: '9830101010', guardian_name: 'Sujata Bose', guardian_phone: '9830101000', address: 'Kanyapur, Asansol', klass: 'Class 10', session: '2026–27', requested_by: 'Udayan Choudhury', created_at: '2026-08-19', status: 'PENDING' },
      { id: 32, full_name: 'Ritwik Saha', phone: '9830202020', guardian_name: 'Debasish Saha', guardian_phone: '9830202000', address: 'Hutton Road, Asansol', klass: 'Class 12', session: '2026–27', requested_by: 'Raj Bharti', created_at: '2026-08-20', status: 'PENDING' },
      { id: 33, full_name: 'Meherzad Irani', phone: '9830303030', guardian_name: 'Farida Irani', guardian_phone: '9830303000', address: 'Burnpur, Asansol', klass: 'Class 9', session: '2026–27', requested_by: 'Rupa Konar', created_at: '2026-08-21', status: 'PENDING' },
      { id: 34, full_name: 'Sana Qureshi', phone: '9830404040', guardian_name: 'Imran Qureshi', guardian_phone: '9830404000', address: 'Ushagram, Asansol', klass: 'Class 11', session: '2026–27', requested_by: 'Udayan Choudhury', created_at: '2026-08-21', status: 'PENDING' },
    ],
    students: [
      { id: 1, student_code: 'SE-2026-045', full_name: 'Riya Sen', phone: '9830011111', email: '', guardian_name: 'Anil Sen', guardian_phone: '9830011000', address: 'Kanyapur, Asansol', klass: 'Class 10', session: '2026–27', status: 'ACTIVE' },
      { id: 2, student_code: 'SE-2026-051', full_name: 'Aman Gupta', phone: '9830022222', email: '', guardian_name: 'Vinod Gupta', guardian_phone: '9830022000', address: 'Asansol Court area', klass: 'Class 9', session: '2026–27', status: 'ACTIVE' },
      { id: 3, student_code: 'SE-2026-060', full_name: 'Sneha Das', phone: '9830033333', email: '', guardian_name: 'Mala Das', guardian_phone: '9830033000', address: 'Burnpur, Asansol', klass: 'Class 12', session: '2026–27', status: 'ACTIVE' },
      { id: 4, student_code: 'SE-2026-063', full_name: 'Rahul Roy', phone: '9830044444', email: '', guardian_name: 'Pradip Roy', guardian_phone: '9830044000', address: 'Kanyapur, Asansol', klass: 'Class 11', session: '2026–27', status: 'ACTIVE' },
      { id: 5, student_code: 'SE-2026-070', full_name: 'Ishita Paul', phone: '9830055555', email: '', guardian_name: 'Rina Paul', guardian_phone: '9830055000', address: 'Hutton Road, Asansol', klass: 'Class 10', session: '2026–27', status: 'WITHDRAWN' },
    ],
    enrollments: [
      { id: 1201, student_id: 2, student: 'Aman Gupta', student_code: 'SE-2026-051', ts_id: 2, subject: 'Mathematics', teacher: 'Udayan Choudhury', session: '2026–27', status: 'ACTIVE', created_at: '2026-07-05' },
      { id: 1202, student_id: 3, student: 'Sneha Das', student_code: 'SE-2026-060', ts_id: 4, subject: 'Mathematics', teacher: 'Swapnanil Majumdar', session: '2026–27', status: 'ACTIVE', created_at: '2026-07-06' },
      { id: 1203, student_id: 1, student: 'Riya Sen', student_code: 'SE-2026-045', ts_id: 1, subject: 'Computer', teacher: 'Udayan Choudhury', session: '2026–27', status: 'ACTIVE', created_at: '2026-06-28' },
      { id: 1204, student_id: 4, student: 'Rahul Roy', student_code: 'SE-2026-063', ts_id: 5, subject: 'Physics', teacher: 'Swapnanil Majumdar', session: '2026–27', status: 'PENDING_DEACTIVATION', created_at: '2026-05-12' },
      { id: 1205, student_id: 1, student: 'Riya Sen', student_code: 'SE-2026-045', ts_id: 4, subject: 'Mathematics', teacher: 'Swapnanil Majumdar', session: '2026–27', status: 'INACTIVE', created_at: '2026-04-02', reviewed_at: '2026-06-30' },
      { id: 1206, student_id: 3, student: 'Sneha Das', student_code: 'SE-2026-060', ts_id: 1, subject: 'Computer', teacher: 'Udayan Choudhury', session: '2026–27', status: 'ACTIVE', created_at: '2026-07-10' },
      { id: 1207, student_id: 4, student: 'Rahul Roy', student_code: 'SE-2026-063', ts_id: 2, subject: 'Mathematics', teacher: 'Udayan Choudhury', session: '2026–27', status: 'ACTIVE', created_at: '2026-07-11' },
      { id: 88, student_id: 4, student: 'Rahul Roy', student_code: 'SE-2026-063', ts_id: 1, subject: 'Computer', teacher: 'Udayan Choudhury', session: '2026–27', status: 'PENDING', created_at: '2026-08-20', requested_by: 'Udayan Choudhury' },
      { id: 89, student_id: 3, student: 'Sneha Das', student_code: 'SE-2026-060', ts_id: 5, subject: 'Physics', teacher: 'Swapnanil Majumdar', session: '2026–27', status: 'PENDING', created_at: '2026-08-21', requested_by: 'Swapnanil Majumdar' },
      { id: 90, student_id: 2, student: 'Aman Gupta', student_code: 'SE-2026-051', ts_id: 3, subject: 'Biology', teacher: 'Arijit Chandra', session: '2026–27', status: 'PENDING', created_at: '2026-08-21', requested_by: 'Arijit Chandra' },
    ],
    sessions: [
      { id: 5, name: '2026–27', start_date: '2026-04-01', end_date: '2027-03-31', status: 'ACTIVE' },
      { id: 4, name: '2025–26', start_date: '2025-04-01', end_date: '2026-03-31', status: 'CLOSED' },
      { id: 3, name: '2024–25', start_date: '2024-04-01', end_date: '2025-03-31', status: 'CLOSED' },
    ],
    classes: [
      { id: 1, name: 'Class 9', level: 9, is_active: true },
      { id: 2, name: 'Class 10', level: 10, is_active: true },
      { id: 3, name: 'Class 11', level: 11, is_active: true },
      { id: 4, name: 'Class 12', level: 12, is_active: true },
      { id: 5, name: 'Class 8', level: 8, is_active: false },
    ],
    subjects: [
      { id: 1, code: 'MATH', name: 'Mathematics', is_active: true },
      { id: 2, code: 'ENG', name: 'English', is_active: true },
      { id: 3, code: 'COMP', name: 'Computer', is_active: true },
      { id: 4, code: 'PHY', name: 'Physics', is_active: true },
      { id: 5, code: 'BIO', name: 'Biology', is_active: true },
      { id: 6, code: 'SANS', name: 'Sanskrit', is_active: false },
    ],
    teachers: [
      { id: 1, teacher_code: 'TCH-001', full_name: 'Udayan Choudhury', phone: '9830011122', email: 'u.choudhury@smartedutrack.in', is_active: true },
      { id: 2, teacher_code: 'TCH-002', full_name: 'Arijit Chandra', phone: '9830033344', email: 'a.chandra@smartedutrack.in', is_active: true },
      { id: 3, teacher_code: 'TCH-003', full_name: 'Swapnanil Majumdar', phone: '9830055566', email: 's.majumdar@smartedutrack.in', is_active: true },
      { id: 4, teacher_code: 'TCH-004', full_name: 'Rupa Konar', phone: '9830077788', email: 'r.konar@smartedutrack.in', is_active: true },
      { id: 5, teacher_code: 'TCH-005', full_name: 'Raj Bharti', phone: '9830099900', email: 'r.bharti@smartedutrack.in', is_active: false },
    ],
    teacherSubjects: [
      { id: 1, teacher_id: 1, teacher: 'Udayan Choudhury', subject_id: 3, subject: 'Computer', is_active: true },
      { id: 2, teacher_id: 1, teacher: 'Udayan Choudhury', subject_id: 1, subject: 'Mathematics', is_active: true },
      { id: 3, teacher_id: 2, teacher: 'Arijit Chandra', subject_id: 5, subject: 'Biology', is_active: true },
      { id: 4, teacher_id: 3, teacher: 'Swapnanil Majumdar', subject_id: 1, subject: 'Mathematics', is_active: true },
      { id: 5, teacher_id: 3, teacher: 'Swapnanil Majumdar', subject_id: 4, subject: 'Physics', is_active: true },
      { id: 6, teacher_id: 4, teacher: 'Rupa Konar', subject_id: 2, subject: 'English', is_active: false },
    ],
    attendance: [],
    feeConfigs: [
      { id: 1, class: 'Class 9', subject: 'Mathematics', amount: 900, first_month_billing: 'FULL', effective_from: '2026-04-01', is_active: true },
      { id: 2, class: 'Class 10', subject: 'Computer', amount: 1100, first_month_billing: 'HALF', effective_from: '2026-04-01', is_active: true },
      { id: 3, class: 'Class 11', subject: 'Mathematics', amount: 1050, first_month_billing: 'FULL', effective_from: '2026-04-01', is_active: true },
      { id: 4, class: 'Class 11', subject: 'Physics', amount: 1200, first_month_billing: 'FULL', effective_from: '2026-04-01', is_active: true },
      { id: 5, class: 'Class 12', subject: 'Mathematics', amount: 1150, first_month_billing: 'FULL', effective_from: '2026-04-01', is_active: true },
      { id: 6, class: 'Class 12', subject: 'Computer', amount: 1300, first_month_billing: 'HALF', effective_from: '2026-04-01', is_active: true },
      { id: 7, class: 'Class 9', subject: 'Computer', amount: 950, first_month_billing: 'FULL', effective_from: '2026-04-01', is_active: false },
    ],
    billingCycles: [
      { id: 3, month: M0, label: monthLabel(M0), period_start: M0 + '-01', period_end: monthEnd(M0), status: 'OPEN', generated_at: M0 + '-01', records: 0, billed: 0, collected: 0 },
      { id: 2, month: M1, label: monthLabel(M1), period_start: M1 + '-01', period_end: monthEnd(M1), status: 'CLOSED', generated_at: M1 + '-01', records: 0, billed: 0, collected: 0 },
      { id: 1, month: M2, label: monthLabel(M2), period_start: M2 + '-01', period_end: monthEnd(M2), status: 'CLOSED', generated_at: M2 + '-01', records: 0, billed: 0, collected: 0 },
    ],
    feeRecords: [],
    payments: [],
    paymentAllocations: [],
    teacherPayouts: [],
  }

  /* Build a self-consistent finance history: the six recurring enrollments billed
     across three months, with payments + allocations that reconcile to each
     cycle's collected total and to commissions/payouts. */
  const RECUR = [1201, 1202, 1203, 1204, 1206, 1207]
  const findE = (id: number) => db.enrollments.find((x) => x.id === id)!
  const findS = (id: number) => db.students.find((x) => x.id === id)!
  const findTs = (id: number) => db.teacherSubjects.find((x) => x.id === id)
  const nextId = (arr: { id: number }[]) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1

  function feeFor(eid: number) {
    const e = findE(eid)
    const s = findS(e.student_id)
    const c = db.feeConfigs.find((x) => x.is_active && x.class === s.klass && x.subject === e.subject)
    const ts = findTs(e.ts_id)
    return { e, s, amt: c ? c.amount : 0, teacher_id: ts ? ts.teacher_id : null }
  }
  function genCycle(cycleId: number, month: string, allocMap: Record<number, number> | null) {
    let billed = 0
    let collected = 0
    const byStudent: Record<number, { e: Enrollment; total: number; allocs: { frid: number; amount: number }[] }> = {}
    RECUR.forEach((eid) => {
      const f = feeFor(eid)
      billed += f.amt
      const alloc = allocMap && allocMap[eid] != null ? allocMap[eid] : f.amt
      const frid = nextId(db.feeRecords)
      db.feeRecords.push({
        id: frid, billing_cycle_id: cycleId, month, enrollment_id: eid, student_id: f.e.student_id,
        student: f.e.student, student_code: f.e.student_code, klass: f.s.klass, subject: f.e.subject,
        teacher: f.e.teacher, teacher_id: f.teacher_id, amount: f.amt, allocated: alloc,
        status: alloc >= f.amt ? 'PAID' : 'PENDING',
      })
      if (alloc > 0) {
        collected += alloc
        if (!byStudent[f.e.student_id]) byStudent[f.e.student_id] = { e: f.e, total: 0, allocs: [] }
        byStudent[f.e.student_id].total += alloc
        byStudent[f.e.student_id].allocs.push({ frid, amount: alloc })
      }
    })
    Object.keys(byStudent).forEach((sid) => {
      const b = byStudent[+sid]
      const pid = nextId(db.payments)
      db.payments.push({
        id: pid, student_id: +sid, student: b.e.student, student_code: b.e.student_code, amount: b.total,
        method: month === M0 ? 'UPI' : 'CASH', reference: month === M0 ? 'UPI-8842' : '',
        paid_on: month + '-08', note: '', allocated: b.total,
      })
      b.allocs.forEach((a) => {
        db.paymentAllocations.push({ id: nextId(db.paymentAllocations), payment_id: pid, fee_record_id: a.frid, amount: a.amount })
      })
    })
    const c = db.billingCycles.find((x) => x.id === cycleId)
    if (c) {
      c.records = RECUR.length
      c.billed = billed
      c.collected = collected
    }
  }
  genCycle(1, M2, null) // two months ago — fully paid
  genCycle(2, M1, { 1204: 0 }) // last month — Rahul/Physics unpaid
  genCycle(3, M0, { 1203: 0, 1204: 0, 1206: 850, 1207: 0 }) // this month — 1206 part-paid, others pending

  // prior payout to Udayan, within balance
  const uAcc =
    Math.round(
      db.paymentAllocations.reduce((sum, a) => {
        const r = db.feeRecords.find((x) => x.id === a.fee_record_id)
        return r && r.teacher_id === 1 ? sum + a.amount : sum
      }, 0) * COMMISSION_RATE / 100,
    ) || 0
  db.teacherPayouts.push({
    id: 1, teacher: 'Udayan Choudhury', teacher_code: 'TCH-001', teacher_id: 1,
    amount: Math.min(2000, uAcc), method: 'BANK_TRANSFER', reference: 'NEFT-5521', paid_on: M1 + '-12', note: '',
  })
  const day = Math.max(1, _now.getDate() - 2)
  const ATTN = M0 + '-' + ('0' + day).slice(-2)
  ;([[1201, 'PRESENT'], [1203, 'ABSENT'], [1206, 'PRESENT'], [1207, 'PRESENT']] as const).forEach((p) => {
    db.attendance.push({ enrollment_id: p[0], date: ATTN, status: p[1] })
  })

  return db
}

/* The live DB — seeded, then a saved snapshot (same schema version) wins so state
   survives navigation. `let` so a reset can swap it. */
export let DB: Db = seed()
try {
  const saved = sessionStorage.getItem(DBKEY)
  if (saved) {
    const p = JSON.parse(saved)
    if (p && p.students && p.feeRecords && p.billingCycles) DB = p
  }
} catch {
  /* ignore */
}

export function persist(): void {
  try {
    sessionStorage.setItem(DBKEY, JSON.stringify(DB))
  } catch {
    /* ignore */
  }
}

/* Shared row helpers used by the API layer. */
export const nextId = (arr: { id: number }[]) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1
export const findById = <T extends { id: number }>(arr: T[], id: number | string): T | undefined =>
  arr.find((x) => x.id === +id)
export const pad3 = (n: number | string) => {
  let s = String(n)
  while (s.length < 3) s = '0' + s
  return s
}
export const today = () => new Date().toISOString().slice(0, 10)
export function nextStudentSeq(): number {
  let mx = 0
  DB.students.forEach((s) => {
    const m = /SE-\d{4}-(\d+)/.exec(s.student_code)
    if (m) mx = Math.max(mx, +m[1])
  })
  return mx + 1
}

/** Which teacher is signed in — matches the session email, falling back to the
    first active teacher so the demo always has data. */
export function currentTeacher(): Teacher | undefined {
  const email = (readSession()?.user?.email || '').toLowerCase()
  return (
    DB.teachers.find((x) => (x.email || '').toLowerCase() === email) ||
    DB.teachers.find((x) => x.is_active)
  )
}

/** Commission accrued per teacher_id = COMMISSION_RATE% of what's been collected
    for their subjects. */
export function accruedByTeacher(): Record<number, number> {
  const raw: Record<number, number> = {}
  DB.paymentAllocations.forEach((a) => {
    const r = findById(DB.feeRecords, a.fee_record_id)
    if (r && r.teacher_id != null) raw[r.teacher_id] = (raw[r.teacher_id] || 0) + a.amount
  })
  const out: Record<number, number> = {}
  Object.keys(raw).forEach((tid) => {
    out[+tid] = Math.round((raw[+tid] * COMMISSION_RATE) / 100)
  })
  return out
}
/** Payouts already made, per teacher_id. */
export function paidByTeacher(): Record<number, number> {
  const out: Record<number, number> = {}
  DB.teacherPayouts.forEach((p) => {
    if (p.teacher_id != null) out[p.teacher_id] = (out[p.teacher_id] || 0) + p.amount
  })
  return out
}
