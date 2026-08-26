/* SmartEduTrack — data layer. Every screen talks to the backend ONLY through
   `api.*`. Today each method is the MOCK implementation: it resolves ERD-shaped
   rows from the in-memory DB (mockDb.ts) after a short delay, persisting writes to
   sessionStorage. Faithful TypeScript port of the static app's SE.api.

   Backend seam: to wire a real API, swap each method body for a call to
   request(path, opts) below (auth header + JSON handling, throws {code,message}).
   USE_MOCK / BASE are provided for that swap. */
import { COMMISSION_RATE, money, PAYMENT_METHODS, ROLE, type Role } from './constants'
import {
  accruedByTeacher,
  currentTeacher,
  DB,
  findById,
  nextId,
  nextStudentSeq,
  pad3,
  paidByTeacher,
  persist,
  today,
} from './mockDb'
import { readSession } from './session'
import type {
  AcademicSession,
  AdminKpis,
  AttendanceRosterRow,
  BillingCycle,
  CommissionReport,
  DuesByStudentRow,
  DuesSummary,
  Enrollment,
  EnrollmentOptions,
  FeeConfig,
  Klass,
  LoginResult,
  PayableTeacher,
  Payment,
  PaymentStudentRow,
  PayoutsSummary,
  PendingRecordRow,
  RegistrationRequest,
  ReportsOverview,
  Student,
  Subject,
  Teacher,
  TeacherCommission,
  TeacherPayout,
  TeacherStudentRow,
  TeacherSubject,
  TeacherToday,
} from './types'

export const USE_MOCK = true
const BASE = '/api/v1'
const LATENCY = 280 // gives loading states something real to show

/* Every method ends in delay(result); mutations happen synchronously before it,
   so persisting here captures all writes (a harmless no-op on reads). */
function delay<T>(v: T): Promise<T> {
  persist()
  return new Promise((res) => setTimeout(() => res(v), LATENCY))
}
function reject(code: string, message: string): Promise<never> {
  return Promise.reject({ code, message })
}

/* Real HTTP call to the backend — the seam the server wires into. Unused while
   USE_MOCK is true, kept so the swap is a one-line change per method. */
export function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const auth = readSession()
  return fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(auth?.token ? { Authorization: 'Bearer ' + auth.token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then((res) => {
    if (!res.ok) {
      return res
        .json()
        .catch(() => ({}))
        .then((e) => {
          throw { code: e.code || res.status, message: e.message || 'Request failed' }
        })
    }
    return res.status === 204 ? (null as T) : (res.json() as Promise<T>)
  })
}

const USERS = [
  { email: 'admin@smartedutrack.in', role: ROLE.SUPER_ADMIN, name: 'Santana Mondal' },
  { email: 'u.choudhury@smartedutrack.in', role: ROLE.TEACHER, name: 'Udayan Choudhury' },
]

const byCreatedDesc = (x: { created_at: string }, y: { created_at: string }) =>
  x.created_at < y.created_at ? 1 : x.created_at > y.created_at ? -1 : 0
const byName = <T extends { student?: string; full_name?: string }>(a: T, b: T) => {
  const an = a.student ?? a.full_name ?? ''
  const bn = b.student ?? b.full_name ?? ''
  return an < bn ? -1 : an > bn ? 1 : 0
}

export const api = {
  USE_MOCK,

  auth: {
    login(body: { email?: string; password?: string }): Promise<LoginResult> {
      if (!body || !body.email || !body.password)
        return reject('AUTH_MISSING', 'Enter your email and password.')
      const email = body.email
      const found = USERS.find((x) => x.email.toLowerCase() === email.toLowerCase())
      let acct: { email: string; name: string; role: Role }
      if (found) acct = found
      else {
        // demo fallback: infer role from the local-part
        const lp = email.split('@')[0].toLowerCase()
        const role: Role = /admin|super|head|principal/.test(lp) ? ROLE.SUPER_ADMIN : ROLE.TEACHER
        acct = { email, name: email, role }
      }
      return delay({
        token: 'mock.' + btoa(acct.email).replace(/=/g, '') + '.' + Date.now(),
        role: acct.role,
        user: { name: acct.name, email: acct.email },
      })
    },
  },

  dashboard: {
    adminKpis(): Promise<AdminKpis> {
      const open =
        DB.billingCycles.filter((c) => c.status === 'OPEN').sort((a, b) => (a.month < b.month ? 1 : -1))[0] ||
        DB.billingCycles.slice().sort((a, b) => (a.month < b.month ? 1 : -1))[0]
      const duesStudents: Record<number, boolean> = {}
      DB.feeRecords.forEach((r) => {
        if (r.amount - (r.allocated || 0) > 0) duesStudents[r.student_id] = true
      })
      let pres = 0
      let tot = 0
      DB.attendance.forEach((a) => {
        tot++
        if (a.status === 'PRESENT') pres++
      })
      const collected = open ? open.collected : 0
      return delay({
        activeStudents: DB.students.filter((s) => s.status === 'ACTIVE').length,
        activeTeachers: DB.teachers.filter((t) => t.is_active).length,
        activeEnrollments: DB.enrollments.filter(
          (e) => e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION',
        ).length,
        pendingRequests: DB.registrationRequests.filter((r) => r.status === 'PENDING').length,
        pendingEnrollments: DB.enrollments.filter((e) => e.status === 'PENDING').length,
        dues: Object.keys(duesStudents).length,
        currentCycle: open ? open.label : '—',
        billed: open ? open.billed : 0,
        collected,
        commission: Math.round((collected * COMMISSION_RATE) / 100),
        attendanceRate: tot ? Math.round((pres / tot) * 100) : 0,
      })
    },
    teacherToday(): Promise<TeacherToday> {
      const t = currentTeacher()
      const open = DB.billingCycles
        .filter((c) => c.status === 'OPEN')
        .sort((a, b) => (a.month < b.month ? 1 : -1))[0]
      const live = DB.enrollments.filter(
        (e) => t && e.teacher === t.full_name && (e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION'),
      )
      const bySub: Record<string, Record<number, boolean>> = {}
      const studentIds: Record<number, boolean> = {}
      live.forEach((e) => {
        studentIds[e.student_id] = true
        if (!bySub[e.subject]) bySub[e.subject] = {}
        bySub[e.subject][e.student_id] = true
      })
      const subjects = Object.keys(bySub)
      const sessions = subjects.map((s) => ({ subject: s, count: Object.keys(bySub[s]).length }))
      const month = open ? open.month : null
      let col = 0
      DB.paymentAllocations.forEach((a) => {
        const r = findById(DB.feeRecords, a.fee_record_id)
        if (r && t && r.teacher_id === t.id && (!month || r.month === month)) col += a.amount
      })
      const td = today()
      const enrIds: Record<number, boolean> = {}
      live.forEach((e) => (enrIds[e.id] = true))
      const marked = DB.attendance.some((a) => enrIds[a.enrollment_id] && a.date === td)
      return delay({
        subjects,
        students: Object.keys(studentIds).length,
        cycle: open ? open.label : '—',
        commission: Math.round((col * COMMISSION_RATE) / 100),
        marked,
        sessions,
      })
    },
  },

  registrationRequests: {
    list(f: { status?: string; mine?: boolean } = {}): Promise<RegistrationRequest[]> {
      let a = DB.registrationRequests.slice()
      if (f.status) a = a.filter((r) => r.status === f.status)
      if (f.mine) {
        const t = currentTeacher()
        a = a.filter((r) => t && r.requested_by === t.full_name)
      }
      a.sort(byCreatedDesc)
      return delay(a)
    },
    create(b: Partial<RegistrationRequest>): Promise<RegistrationRequest> {
      const t = currentTeacher()
      const row: RegistrationRequest = {
        id: nextId(DB.registrationRequests),
        full_name: String(b.full_name || '').trim(),
        phone: b.phone || '',
        guardian_name: b.guardian_name || '',
        guardian_phone: b.guardian_phone || '',
        address: b.address || '',
        klass: b.klass || '',
        session: b.session || '',
        requested_by: t ? t.full_name : b.requested_by || 'A teacher',
        created_at: today(),
        status: 'PENDING',
      }
      DB.registrationRequests.unshift(row)
      return delay(row)
    },
    approve(id: number): Promise<{ id: number; status: string; student_code: string }> {
      const r = findById(DB.registrationRequests, id)
      if (!r || r.status !== 'PENDING') return reject('STATE', 'That request is no longer pending.')
      r.status = 'APPROVED'
      r.reviewed_at = today()
      const code = 'SE-' + new Date().getFullYear() + '-' + pad3(nextStudentSeq())
      DB.students.unshift({
        id: nextId(DB.students), student_code: code, full_name: r.full_name, phone: r.phone || '',
        email: r.email || '', guardian_name: r.guardian_name || '', guardian_phone: r.guardian_phone || '',
        address: r.address || '', klass: r.klass, session: r.session, status: 'ACTIVE',
      })
      return delay({ id: +id, status: 'APPROVED', student_code: code })
    },
    reject(id: number): Promise<{ id: number; status: string }> {
      const r = findById(DB.registrationRequests, id)
      if (!r || r.status !== 'PENDING') return reject('STATE', 'That request is no longer pending.')
      r.status = 'REJECTED'
      r.reviewed_at = today()
      return delay({ id: +id, status: 'REJECTED' })
    },
  },

  students: {
    list(f: { status?: string } = {}): Promise<Student[]> {
      let a = DB.students.slice()
      if (f.status) a = a.filter((s) => s.status === f.status)
      return delay(a)
    },
    updateProfile(id: number, b: Partial<Student>): Promise<Student | undefined> {
      const s = findById(DB.students, id)
      if (s) {
        ;(['full_name', 'phone', 'email', 'guardian_name', 'guardian_phone', 'address'] as const).forEach((k) => {
          if (b[k] != null) (s[k] as string) = b[k] as string
        })
      }
      return delay(s)
    },
    withdraw(id: number): Promise<{ id: number; status: string }> {
      const s = findById(DB.students, id)
      if (s) s.status = 'WITHDRAWN'
      return delay({ id: +id, status: 'WITHDRAWN' })
    },
    readmit(id: number, b?: { klass?: string; session?: string }): Promise<{ id: number; status: string }> {
      const s = findById(DB.students, id)
      if (s) {
        s.status = 'ACTIVE'
        if (b && b.klass) s.klass = b.klass
        if (b && b.session) s.session = b.session
      }
      return delay({ id: +id, status: 'ACTIVE' })
    },
    activeClasses(): Promise<string[]> {
      return delay(DB.classes.filter((c) => c.is_active).map((c) => c.name))
    },
    activeSession(): Promise<string | null> {
      const a = DB.sessions.find((s) => s.status === 'ACTIVE')
      return delay(a ? a.name : null)
    },
  },

  enrollments: {
    list(f: { status?: string } = {}): Promise<Enrollment[]> {
      let a = DB.enrollments.slice()
      if (f.status) a = a.filter((e) => e.status === f.status)
      a.sort(byCreatedDesc)
      return delay(a)
    },
    pending(): Promise<Enrollment[]> {
      return delay(DB.enrollments.filter((e) => e.status === 'PENDING'))
    },
    options(): Promise<EnrollmentOptions> {
      return delay({
        students: DB.students
          .filter((s) => s.status === 'ACTIVE')
          .map((s) => ({ id: s.id, label: s.full_name + ' · ' + s.student_code })),
        authorizations: DB.teacherSubjects
          .filter((t) => t.is_active)
          .map((t) => ({ id: t.id, label: t.teacher + ' — ' + t.subject, teacher: t.teacher, subject: t.subject })),
      })
    },
    create(b: { student_id: number | string; ts_id: number | string }): Promise<Enrollment> {
      const sid = +b.student_id
      const tsid = +b.ts_id
      const s = findById(DB.students, sid)
      const ts = findById(DB.teacherSubjects, tsid)
      if (!s || !ts) return reject('INVALID', 'Choose a student and a teacher-subject.')
      const dup = DB.enrollments.some(
        (e) =>
          e.student_id === sid &&
          e.ts_id === tsid &&
          (e.status === 'PENDING' || e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION'),
      )
      if (dup) return reject('DUPLICATE', s.full_name + ' already has a live enrollment for that teacher-subject.')
      const ses = DB.sessions.find((x) => x.status === 'ACTIVE')
      const row: Enrollment = {
        id: nextId(DB.enrollments), student_id: sid, student: s.full_name, student_code: s.student_code,
        ts_id: tsid, subject: ts.subject, teacher: ts.teacher, session: ses ? ses.name : '',
        status: 'ACTIVE', created_at: today(),
      }
      DB.enrollments.unshift(row)
      return delay(row)
    },
    approve(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'PENDING') return reject('STATE', 'That request is no longer pending.')
      e.status = 'ACTIVE'
      return delay({ id: +id, status: 'ACTIVE' })
    },
    reject(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'PENDING') return reject('STATE', 'That request is no longer pending.')
      e.status = 'REJECTED'
      e.reviewed_at = today()
      return delay({ id: +id, status: 'REJECTED' })
    },
    deactivate(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'ACTIVE') return reject('STATE', 'Only an active enrollment can be deactivated.')
      e.status = 'PENDING_DEACTIVATION'
      return delay({ id: +id, status: 'PENDING_DEACTIVATION' })
    },
    cancelDeactivation(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'PENDING_DEACTIVATION') return reject('STATE', 'That enrollment is not winding down.')
      e.status = 'ACTIVE'
      return delay({ id: +id, status: 'ACTIVE' })
    },
    end(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || (e.status !== 'PENDING_DEACTIVATION' && e.status !== 'ACTIVE'))
        return reject('STATE', 'That enrollment can’t be ended.')
      e.status = 'INACTIVE'
      e.reviewed_at = today()
      return delay({ id: +id, status: 'INACTIVE' })
    },
    reactivate(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'INACTIVE') return reject('STATE', 'Only an inactive enrollment can be reactivated.')
      e.status = 'ACTIVE'
      return delay({ id: +id, status: 'ACTIVE' })
    },
    changeAssignment(id: number, tsId: number | string): Promise<Enrollment> {
      const e = findById(DB.enrollments, id)
      const ts = findById(DB.teacherSubjects, +tsId)
      if (!e || !ts) return reject('INVALID', 'Pick a teacher-subject.')
      if (e.ts_id === ts.id) return reject('NOCHANGE', 'That’s already the assigned teacher-subject.')
      e.ts_id = ts.id
      e.subject = ts.subject
      e.teacher = ts.teacher
      return delay(e)
    },
  },

  teacher: {
    me(): Promise<Teacher | null> {
      const t = currentTeacher()
      return delay(t ? { ...t } : null)
    },
    subjects(): Promise<{ ts_id: number; subject: string; subject_id: number }[]> {
      const t = currentTeacher()
      if (!t) return delay([])
      return delay(
        DB.teacherSubjects
          .filter((x) => x.teacher_id === t.id && x.is_active)
          .map((x) => ({ ts_id: x.id, subject: x.subject, subject_id: x.subject_id })),
      )
    },
    students(): Promise<TeacherStudentRow[]> {
      const t = currentTeacher()
      const map: Record<number, TeacherStudentRow> = {}
      DB.enrollments
        .filter((e) => t && e.teacher === t.full_name && (e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION'))
        .forEach((e) => {
          if (!map[e.student_id]) {
            const s = findById(DB.students, e.student_id) || ({} as Student)
            map[e.student_id] = {
              student_id: e.student_id, student: e.student, student_code: e.student_code,
              klass: s.klass || '', guardian_name: s.guardian_name || '', guardian_phone: s.guardian_phone || '',
              subjects: [],
            }
          }
          if (map[e.student_id].subjects.indexOf(e.subject) < 0) map[e.student_id].subjects.push(e.subject)
        })
      return delay(Object.values(map).sort(byName))
    },
    enrollments(f: { status?: string } = {}): Promise<Enrollment[]> {
      const t = currentTeacher()
      let a = DB.enrollments.filter((e) => t && e.teacher === t.full_name)
      if (f.status) a = a.filter((e) => e.status === f.status)
      a.sort(byCreatedDesc)
      return delay(a)
    },
    requestEnrollment(b: { student_id: number | string; ts_id: number | string }): Promise<Enrollment> {
      const t = currentTeacher()
      const sid = +b.student_id
      const tsid = +b.ts_id
      const s = findById(DB.students, sid)
      const ts = findById(DB.teacherSubjects, tsid)
      if (!s || !ts) return reject('INVALID', 'Choose a student and a subject.')
      if (t && ts.teacher_id !== t.id)
        return reject('FORBIDDEN', 'You can only request enrollments for your own subjects.')
      const dup = DB.enrollments.some(
        (e) =>
          e.student_id === sid &&
          e.ts_id === tsid &&
          (e.status === 'PENDING' || e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION'),
      )
      if (dup) return reject('DUPLICATE', s.full_name + ' already has a live enrollment for that subject.')
      const ses = DB.sessions.find((x) => x.status === 'ACTIVE')
      const row: Enrollment = {
        id: nextId(DB.enrollments), student_id: sid, student: s.full_name, student_code: s.student_code,
        ts_id: tsid, subject: ts.subject, teacher: ts.teacher, session: ses ? ses.name : '',
        status: 'PENDING', created_at: today(), requested_by: t ? t.full_name : 'A teacher',
      }
      DB.enrollments.unshift(row)
      return delay(row)
    },
    cancelRequest(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'PENDING') return reject('STATE', 'That request can’t be cancelled.')
      e.status = 'REJECTED'
      e.reviewed_at = today()
      return delay({ id: +id, status: 'REJECTED' })
    },
    requestDeactivation(id: number): Promise<{ id: number; status: string }> {
      const e = findById(DB.enrollments, id)
      if (!e || e.status !== 'ACTIVE') return reject('STATE', 'Only an active enrollment can be ended.')
      e.status = 'PENDING_DEACTIVATION'
      return delay({ id: +id, status: 'PENDING_DEACTIVATION' })
    },
    attendanceRoster(f: { date: string; ts_id?: number | string }): Promise<AttendanceRosterRow[]> {
      const t = currentTeacher()
      const date = f.date
      let live = DB.enrollments.filter(
        (e) => t && e.teacher === t.full_name && (e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION'),
      )
      if (f.ts_id) live = live.filter((e) => e.ts_id === +f.ts_id!)
      return delay(
        live
          .map((e) => {
            const mark = DB.attendance.find((a) => a.enrollment_id === e.id && a.date === date)
            return {
              enrollment_id: e.id, student: e.student, student_code: e.student_code, subject: e.subject,
              status: mark ? mark.status : null,
            }
          })
          .sort((a, b) => (a.student < b.student ? -1 : a.student > b.student ? 1 : 0)),
      )
    },
    attendanceSave(b: {
      date: string
      marks: { enrollment_id: number; status: 'PRESENT' | 'ABSENT' }[]
    }): Promise<{ date: string; present: number; absent: number; total: number }> {
      const date = b.date
      const marks = b.marks || []
      if (String(date || '').slice(0, 7) !== today().slice(0, 7))
        return reject('LOCKED', 'Attendance can only be recorded for the current month.')
      marks.forEach((m) => {
        const row = DB.attendance.find((a) => a.enrollment_id === +m.enrollment_id && a.date === date)
        if (row) row.status = m.status
        else DB.attendance.push({ enrollment_id: +m.enrollment_id, date, status: m.status })
      })
      const present = marks.filter((m) => m.status === 'PRESENT').length
      return delay({ date, present, absent: marks.length - present, total: marks.length })
    },
    commission(): Promise<TeacherCommission> {
      const t = currentTeacher()
      if (!t)
        return delay({ rate: COMMISSION_RATE, collected: 0, commission: 0, paid: 0, balance: 0, months: [], payouts: [] })
      const byMonth: Record<string, { month: string; collected: number; subjects: Record<string, number> }> = {}
      let collected = 0
      DB.paymentAllocations.forEach((a) => {
        const r = findById(DB.feeRecords, a.fee_record_id)
        if (!r || r.teacher_id !== t.id) return
        collected += a.amount
        if (!byMonth[r.month]) byMonth[r.month] = { month: r.month, collected: 0, subjects: {} }
        byMonth[r.month].collected += a.amount
        byMonth[r.month].subjects[r.subject] = (byMonth[r.month].subjects[r.subject] || 0) + a.amount
      })
      const months = Object.keys(byMonth)
        .sort()
        .reverse()
        .map((m) => {
          const x = byMonth[m]
          return {
            month: m,
            collected: x.collected,
            commission: Math.round((x.collected * COMMISSION_RATE) / 100),
            subjects: Object.keys(x.subjects)
              .map((s) => ({ subject: s, collected: x.subjects[s] }))
              .sort((a, b) => b.collected - a.collected),
          }
        })
      const commission = Math.round((collected * COMMISSION_RATE) / 100)
      const payouts = DB.teacherPayouts
        .filter((p) => p.teacher === t.full_name)
        .slice()
        .sort((x, y) => (x.paid_on < y.paid_on ? 1 : -1))
      const paid = payouts.reduce((s, p) => s + p.amount, 0)
      return delay({ rate: COMMISSION_RATE, collected, commission, paid, balance: commission - paid, months, payouts })
    },
  },

  sessions: {
    list(): Promise<AcademicSession[]> {
      return delay(DB.sessions.slice())
    },
    create(b: { name: string; start_date: string; end_date: string }): Promise<AcademicSession> {
      const row: AcademicSession = {
        id: nextId(DB.sessions), name: b.name, start_date: b.start_date, end_date: b.end_date, status: 'CLOSED',
      }
      DB.sessions.unshift(row)
      return delay(row)
    },
    activate(id: number): Promise<{ id: number; status: string }> {
      id = +id
      DB.sessions.forEach((s) => {
        if (s.id === id) s.status = 'ACTIVE'
        else if (s.status === 'ACTIVE') s.status = 'CLOSED'
      })
      return delay({ id, status: 'ACTIVE' })
    },
    close(id: number): Promise<{ id: number; status: string }> {
      const s = findById(DB.sessions, id)
      if (s) s.status = 'CLOSED'
      return delay({ id: +id, status: 'CLOSED' })
    },
  },

  classes: {
    list(): Promise<Klass[]> {
      return delay(DB.classes.slice())
    },
    create(b: { name: string; level: number | string }): Promise<Klass> {
      const name = String(b.name || '').trim()
      const level = +b.level
      if (DB.classes.some((c) => c.name.toLowerCase() === name.toLowerCase()))
        return reject('DUPLICATE', 'A class with that name already exists.')
      if (DB.classes.some((c) => c.level === level))
        return reject('DUPLICATE', 'A class with level ' + level + ' already exists.')
      const row: Klass = { id: nextId(DB.classes), name, level, is_active: true }
      DB.classes.unshift(row)
      return delay(row)
    },
    setActive(id: number, active: boolean): Promise<{ id: number; is_active: boolean }> {
      const c = findById(DB.classes, id)
      if (c) c.is_active = !!active
      return delay({ id: +id, is_active: !!active })
    },
  },

  subjects: {
    list(): Promise<Subject[]> {
      return delay(DB.subjects.slice())
    },
    create(b: { code: string; name: string }): Promise<Subject> {
      const code = String(b.code || '').toUpperCase().trim()
      const name = String(b.name || '').trim()
      if (DB.subjects.some((s) => s.code === code)) return reject('DUPLICATE', 'That subject code is already in use.')
      if (DB.subjects.some((s) => s.name.toLowerCase() === name.toLowerCase()))
        return reject('DUPLICATE', 'A subject with that name already exists.')
      const row: Subject = { id: nextId(DB.subjects), code, name, is_active: true }
      DB.subjects.unshift(row)
      return delay(row)
    },
    setActive(id: number, active: boolean): Promise<{ id: number; is_active: boolean }> {
      const s = findById(DB.subjects, id)
      if (s) s.is_active = !!active
      return delay({ id: +id, is_active: !!active })
    },
  },

  teachers: {
    list(): Promise<Teacher[]> {
      return delay(DB.teachers.slice())
    },
    create(b: { full_name: string; phone?: string; email: string }): Promise<Teacher> {
      const email = String(b.email || '').toLowerCase().trim()
      if (DB.teachers.some((t) => (t.email || '').toLowerCase() === email))
        return reject('DUPLICATE', 'That email is already used by another teacher.')
      const n =
        DB.teachers.reduce((m, t) => {
          const k = parseInt((t.teacher_code || '').split('-')[1], 10) || 0
          return Math.max(m, k)
        }, 0) + 1
      const row: Teacher = {
        id: nextId(DB.teachers), teacher_code: 'TCH-' + pad3(n), full_name: b.full_name, phone: b.phone || '',
        email: b.email, is_active: true,
      }
      DB.teachers.unshift(row)
      return delay(row)
    },
    setActive(id: number, active: boolean): Promise<{ id: number; is_active: boolean }> {
      const t = findById(DB.teachers, id)
      if (t) t.is_active = !!active
      return delay({ id: +id, is_active: !!active })
    },
  },

  teacherSubjects: {
    list(): Promise<TeacherSubject[]> {
      return delay(DB.teacherSubjects.slice())
    },
    options(): Promise<{ teachers: { id: number; name: string }[]; subjects: { id: number; name: string }[] }> {
      return delay({
        teachers: DB.teachers.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.full_name })),
        subjects: DB.subjects.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name })),
      })
    },
    create(b: { teacher_id: number | string; subject_id: number | string }): Promise<TeacherSubject> {
      const tid = +b.teacher_id
      const sid = +b.subject_id
      const existing = DB.teacherSubjects.find((x) => x.teacher_id === tid && x.subject_id === sid)
      if (existing) {
        if (existing.is_active) return reject('DUPLICATE', 'That teacher is already authorised for that subject.')
        existing.is_active = true
        return delay(existing)
      }
      const t = findById(DB.teachers, tid)
      const s = findById(DB.subjects, sid)
      const row: TeacherSubject = {
        id: nextId(DB.teacherSubjects), teacher_id: tid, teacher: t ? t.full_name : '', subject_id: sid,
        subject: s ? s.name : '', is_active: true,
      }
      DB.teacherSubjects.unshift(row)
      return delay(row)
    },
    setActive(id: number, active: boolean): Promise<{ id: number; is_active: boolean }> {
      const x = findById(DB.teacherSubjects, id)
      if (x) x.is_active = !!active
      return delay({ id: +id, is_active: !!active })
    },
  },

  feeConfigs: {
    list(f: { active?: 'ACTIVE' | 'INACTIVE' } = {}): Promise<FeeConfig[]> {
      let a = DB.feeConfigs.slice()
      if (f.active === 'ACTIVE') a = a.filter((c) => c.is_active)
      else if (f.active === 'INACTIVE') a = a.filter((c) => !c.is_active)
      a.sort((x, y) => {
        const kx = x.class + '|' + x.subject
        const ky = y.class + '|' + y.subject
        return kx < ky ? -1 : kx > ky ? 1 : 0
      })
      return delay(a)
    },
    options(): Promise<{ classes: string[]; subjects: string[] }> {
      return delay({
        classes: DB.classes.filter((c) => c.is_active).map((c) => c.name),
        subjects: DB.subjects.filter((s) => s.is_active).map((s) => s.name),
      })
    },
    create(b: {
      class: string
      subject: string
      amount: number | string
      first_month_billing?: string
      effective_from?: string
    }): Promise<FeeConfig> {
      const klass = String(b.class || '').trim()
      const subject = String(b.subject || '').trim()
      const amount = +b.amount
      if (!klass || !subject) return reject('INVALID', 'Choose a class and a subject.')
      if (!(amount > 0)) return reject('INVALID', 'Enter a monthly fee greater than zero.')
      if (DB.feeConfigs.some((c) => c.is_active && c.class === klass && c.subject === subject))
        return reject('DUPLICATE', 'An active fee for that class and subject already exists.')
      const row: FeeConfig = {
        id: nextId(DB.feeConfigs), class: klass, subject, amount,
        first_month_billing: b.first_month_billing === 'HALF' ? 'HALF' : 'FULL',
        effective_from: b.effective_from || today(), is_active: true,
      }
      DB.feeConfigs.unshift(row)
      return delay(row)
    },
    update(id: number, b: { amount?: number | string; first_month_billing?: string; effective_from?: string }): Promise<FeeConfig> {
      const c = findById(DB.feeConfigs, id)
      if (!c) return reject('NOTFOUND', 'Fee not found.')
      if (b.amount != null) {
        const amt = +b.amount
        if (!(amt > 0)) return reject('INVALID', 'Enter a monthly fee greater than zero.')
        c.amount = amt
      }
      if (b.first_month_billing) c.first_month_billing = b.first_month_billing === 'HALF' ? 'HALF' : 'FULL'
      if (b.effective_from) c.effective_from = b.effective_from
      return delay(c)
    },
    setActive(id: number, active: boolean): Promise<{ id: number; is_active: boolean }> {
      const c = findById(DB.feeConfigs, id)
      if (!c) return reject('NOTFOUND', 'Fee not found.')
      if (active && DB.feeConfigs.some((x) => x.id !== c.id && x.is_active && x.class === c.class && x.subject === c.subject))
        return reject('DUPLICATE', 'Another active fee already covers that class and subject.')
      c.is_active = !!active
      return delay({ id: +id, is_active: !!active })
    },
  },

  billingCycles: {
    list(): Promise<BillingCycle[]> {
      const a = DB.billingCycles.slice()
      a.sort((x, y) => (x.month < y.month ? 1 : x.month > y.month ? -1 : 0))
      return delay(a)
    },
    generate(b: { month: string }): Promise<{ cycle: BillingCycle; records: number; skipped: number; billed: number }> {
      const month = String((b && b.month) || '').slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(month)) return reject('INVALID', 'Choose a month to generate.')
      if (DB.billingCycles.some((c) => c.month === month))
        return reject('DUPLICATE', 'A billing cycle for that month already exists.')
      const y = +month.slice(0, 4)
      const m = +month.slice(5, 7)
      const lastDay = new Date(y, m, 0).getDate()
      const start = month + '-01'
      const end = month + '-' + (lastDay < 10 ? '0' + lastDay : lastDay)
      const live = DB.enrollments.filter((e) => e.status === 'ACTIVE' || e.status === 'PENDING_DEACTIVATION')
      const cycleId = nextId(DB.billingCycles)
      let billed = 0
      let made = 0
      let skipped = 0
      live.forEach((e) => {
        const stu = findById(DB.students, e.student_id)
        const cfg = DB.feeConfigs.find((c) => c.is_active && stu && c.class === stu.klass && c.subject === e.subject)
        if (!cfg) {
          skipped++
          return
        }
        let amt = cfg.amount
        const ts = findById(DB.teacherSubjects, e.ts_id)
        if (cfg.first_month_billing === 'HALF' && String(e.created_at || '').slice(0, 7) === month)
          amt = Math.round(cfg.amount / 2)
        DB.feeRecords.push({
          id: nextId(DB.feeRecords), billing_cycle_id: cycleId, month, enrollment_id: e.id, student_id: e.student_id,
          student: e.student, student_code: e.student_code, klass: stu ? stu.klass : '', subject: e.subject,
          teacher: e.teacher, teacher_id: ts ? ts.teacher_id : null, amount: amt, allocated: 0, status: 'PENDING',
        })
        billed += amt
        made++
      })
      const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      const cycle: BillingCycle = {
        id: cycleId, month, label, period_start: start, period_end: end, status: 'OPEN',
        generated_at: today(), records: made, billed, collected: 0,
      }
      DB.billingCycles.unshift(cycle)
      return delay({ cycle, records: made, skipped, billed })
    },
    close(id: number): Promise<{ id: number; status: string }> {
      const c = findById(DB.billingCycles, id)
      if (!c) return reject('NOTFOUND', 'Cycle not found.')
      if (c.status !== 'OPEN') return reject('STATE', 'Only an open cycle can be closed.')
      c.status = 'CLOSED'
      return delay({ id: +id, status: 'CLOSED' })
    },
  },

  payments: {
    list(f: { q?: string } = {}): Promise<Payment[]> {
      let a = DB.payments.slice()
      if (f.q) {
        const q = String(f.q).toLowerCase()
        a = a.filter((p) => (p.student + ' ' + p.student_code + ' ' + (p.reference || '')).toLowerCase().indexOf(q) >= 0)
      }
      a.sort((x, y) => (x.paid_on < y.paid_on ? 1 : x.paid_on > y.paid_on ? -1 : y.id - x.id))
      return delay(a)
    },
    students(): Promise<PaymentStudentRow[]> {
      const due: Record<number, number> = {}
      DB.feeRecords.forEach((r) => {
        const o = r.amount - (r.allocated || 0)
        if (o > 0) due[r.student_id] = (due[r.student_id] || 0) + o
      })
      return delay(
        DB.students
          .filter((s) => s.status === 'ACTIVE')
          .map((s) => ({ student_id: s.id, student: s.full_name, student_code: s.student_code, due: due[s.id] || 0 }))
          .sort((a, b) => b.due - a.due || (a.student < b.student ? -1 : a.student > b.student ? 1 : 0)),
      )
    },
    pendingRecords(sid: number | string): Promise<PendingRecordRow[]> {
      sid = +sid
      return delay(
        DB.feeRecords
          .filter((r) => r.student_id === sid && r.amount - (r.allocated || 0) > 0)
          .map((r) => ({
            id: r.id, month: r.month, subject: r.subject, klass: r.klass, amount: r.amount,
            allocated: r.allocated || 0, outstanding: r.amount - (r.allocated || 0),
          }))
          .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.subject < b.subject ? -1 : 1)),
      )
    },
    record(b: {
      student_id: number | string
      amount: number | string
      method: string
      reference?: string
      paid_on?: string
      note?: string
      allocations?: { fee_record_id: number; amount: number | string }[]
    }): Promise<{ payment: Payment; allocated: number; credit: number }> {
      const sid = +b.student_id
      const amount = +b.amount
      const allocs = b.allocations || []
      const stu = findById(DB.students, sid)
      if (!stu) return reject('INVALID', 'Choose a student.')
      if (!(amount > 0)) return reject('INVALID', 'Enter a payment amount greater than zero.')
      if ((PAYMENT_METHODS as readonly string[]).indexOf(b.method) < 0)
        return reject('INVALID', 'Choose a payment method.')
      let sum = 0
      for (let i = 0; i < allocs.length; i++) {
        const rec = findById(DB.feeRecords, allocs[i].fee_record_id)
        const amt = +allocs[i].amount
        if (!rec || rec.student_id !== sid) return reject('INVALID', 'An allocation points to the wrong fee record.')
        if (!(amt >= 0)) return reject('INVALID', 'Allocations can’t be negative.')
        if (amt > rec.amount - (rec.allocated || 0))
          return reject('OVER', 'You allocated more than is owed on ' + rec.subject + ' (' + rec.month + ').')
        sum += amt
      }
      if (sum > amount) return reject('OVER', 'Allocations exceed the payment amount.')
      const pid = nextId(DB.payments)
      const payment: Payment = {
        id: pid, student_id: sid, student: stu.full_name, student_code: stu.student_code, amount, method: b.method,
        reference: b.reference || '', paid_on: b.paid_on || today(), note: b.note || '', allocated: sum,
      }
      DB.payments.unshift(payment)
      allocs.forEach((a) => {
        const m = +a.amount
        if (!(m > 0)) return
        const r = findById(DB.feeRecords, a.fee_record_id)!
        DB.paymentAllocations.push({ id: nextId(DB.paymentAllocations), payment_id: pid, fee_record_id: r.id, amount: m })
        r.allocated = (r.allocated || 0) + m
        if (r.allocated >= r.amount) r.status = 'PAID'
        const cyc = findById(DB.billingCycles, r.billing_cycle_id)
        if (cyc) cyc.collected = (cyc.collected || 0) + m
      })
      return delay({ payment, allocated: sum, credit: amount - sum })
    },
  },

  dues: {
    summary(): Promise<DuesSummary> {
      let totalDue = 0
      let records = 0
      const students: Record<number, boolean> = {}
      DB.feeRecords.forEach((r) => {
        const out = r.amount - (r.allocated || 0)
        if (out > 0) {
          totalDue += out
          records++
          students[r.student_id] = true
        }
      })
      return delay({ totalDue, records, students: Object.keys(students).length })
    },
    byStudent(f: { q?: string } = {}): Promise<DuesByStudentRow[]> {
      const map: Record<number, DuesByStudentRow> = {}
      DB.feeRecords.forEach((r) => {
        const out = r.amount - (r.allocated || 0)
        if (out <= 0) return
        if (!map[r.student_id])
          map[r.student_id] = {
            student_id: r.student_id, student: r.student, student_code: r.student_code, klass: r.klass, total: 0, items: [],
          }
        map[r.student_id].total += out
        map[r.student_id].items.push({ month: r.month, subject: r.subject, outstanding: out })
      })
      let rows = Object.values(map)
      if (f.q) {
        const q = String(f.q).toLowerCase()
        rows = rows.filter(
          (s) =>
            (s.student + ' ' + s.student_code).toLowerCase().indexOf(q) >= 0 ||
            s.items.some((i) => i.subject.toLowerCase().indexOf(q) >= 0),
        )
      }
      rows.sort((a, b) => b.total - a.total)
      return delay(rows)
    },
  },

  commissions: {
    months(): Promise<string[]> {
      const ms: Record<string, boolean> = {}
      DB.paymentAllocations.forEach((a) => {
        const r = findById(DB.feeRecords, a.fee_record_id)
        if (r) ms[r.month] = true
      })
      return delay(Object.keys(ms).sort().reverse())
    },
    report(f: { month?: string } = {}): Promise<CommissionReport> {
      const byT: Record<number, { teacher_id: number; collected: number; subjects: Record<string, number> }> = {}
      DB.paymentAllocations.forEach((a) => {
        const rec = findById(DB.feeRecords, a.fee_record_id)
        if (!rec || rec.teacher_id == null) return
        if (f.month && rec.month !== f.month) return
        const tid = rec.teacher_id
        if (!byT[tid]) byT[tid] = { teacher_id: tid, collected: 0, subjects: {} }
        byT[tid].collected += a.amount
        byT[tid].subjects[rec.subject] = (byT[tid].subjects[rec.subject] || 0) + a.amount
      })
      const rows = Object.keys(byT)
        .map((tid) => {
          const t = byT[+tid]
          const tr = findById(DB.teachers, +tid)
          return {
            teacher_id: t.teacher_id,
            teacher: tr ? tr.full_name : '—',
            teacher_code: tr ? tr.teacher_code : '',
            collected: t.collected,
            commission: Math.round((t.collected * COMMISSION_RATE) / 100),
            subjects: Object.keys(t.subjects)
              .map((s) => ({ subject: s, collected: t.subjects[s] }))
              .sort((a, b) => b.collected - a.collected),
          }
        })
        .sort((a, b) => b.commission - a.commission)
      const totalCollected = rows.reduce((s, t) => s + t.collected, 0)
      const totalCommission = rows.reduce((s, t) => s + t.commission, 0)
      return delay({ rows, rate: COMMISSION_RATE, totalCollected, totalCommission, teachers: rows.length })
    },
  },

  payouts: {
    summary(): Promise<PayoutsSummary> {
      const acc = accruedByTeacher()
      const paidM = paidByTeacher()
      let accrued = 0
      let paid = 0
      let payable = 0
      let owing = 0
      Object.keys(acc).forEach((n) => {
        accrued += acc[+n]
        const dueAmt = acc[+n] - (paidM[+n] || 0)
        if (dueAmt > 0) {
          payable += dueAmt
          owing++
        }
      })
      DB.teacherPayouts.forEach((p) => (paid += p.amount))
      return delay({ accrued, paid, payable, owing })
    },
    payable(): Promise<PayableTeacher[]> {
      const acc = accruedByTeacher()
      const paidM = paidByTeacher()
      return delay(
        Object.keys(acc)
          .map((tid) => {
            const tr = findById(DB.teachers, +tid)
            return {
              teacher_id: +tid, teacher: tr ? tr.full_name : '—', teacher_code: tr ? tr.teacher_code : '',
              accrued: acc[+tid], paid: paidM[+tid] || 0, payable: acc[+tid] - (paidM[+tid] || 0),
            }
          })
          .filter((t) => t.payable > 0)
          .sort((a, b) => b.payable - a.payable),
      )
    },
    list(f: { q?: string } = {}): Promise<TeacherPayout[]> {
      let a = DB.teacherPayouts.slice()
      if (f.q) {
        const q = String(f.q).toLowerCase()
        a = a.filter((p) => (p.teacher + ' ' + p.teacher_code + ' ' + (p.reference || '')).toLowerCase().indexOf(q) >= 0)
      }
      a.sort((x, y) => (x.paid_on < y.paid_on ? 1 : x.paid_on > y.paid_on ? -1 : y.id - x.id))
      return delay(a)
    },
    record(b: {
      teacher_code: string
      amount: number | string
      method: string
      reference?: string
      paid_on?: string
      note?: string
    }): Promise<TeacherPayout> {
      const amount = +b.amount
      const tr = DB.teachers.find((x) => x.teacher_code === b.teacher_code)
      if (!tr) return reject('INVALID', 'Choose a teacher.')
      if (!(amount > 0)) return reject('INVALID', 'Enter a payout amount greater than zero.')
      if ((PAYMENT_METHODS as readonly string[]).indexOf(b.method) < 0)
        return reject('INVALID', 'Choose a payout method.')
      const payable = (accruedByTeacher()[tr.id] || 0) - (paidByTeacher()[tr.id] || 0)
      if (amount > payable)
        return reject('OVER', 'That’s more than ' + tr.full_name + '’s unpaid balance of ' + money(payable) + '.')
      const row: TeacherPayout = {
        id: nextId(DB.teacherPayouts), teacher: tr.full_name, teacher_code: tr.teacher_code, teacher_id: tr.id,
        amount, method: b.method, reference: b.reference || '', paid_on: b.paid_on || today(), note: b.note || '',
      }
      DB.teacherPayouts.unshift(row)
      return delay(row)
    },
  },

  reports: {
    overview(): Promise<ReportsOverview> {
      const byStatus: Record<string, number> = {
        PENDING: 0, ACTIVE: 0, PENDING_DEACTIVATION: 0, INACTIVE: 0, REJECTED: 0,
      }
      DB.enrollments.forEach((e) => (byStatus[e.status] = (byStatus[e.status] || 0) + 1))
      const cycles = DB.billingCycles
        .slice()
        .sort((a, b) => (a.month < b.month ? 1 : -1))
        .map((c) => ({
          label: c.label, month: c.month, status: c.status, billed: c.billed, collected: c.collected, records: c.records,
        }))
      const totalBilled = cycles.reduce((s, c) => s + c.billed, 0)
      const totalCollected = cycles.reduce((s, c) => s + c.collected, 0)
      const dueMap: Record<number, { student: string; student_code: string; total: number }> = {}
      let dueTotal = 0
      DB.feeRecords.forEach((r) => {
        const o = r.amount - (r.allocated || 0)
        if (o > 0) {
          dueTotal += o
          if (!dueMap[r.student_id]) dueMap[r.student_id] = { student: r.student, student_code: r.student_code, total: 0 }
          dueMap[r.student_id].total += o
        }
      })
      const topDebtors = Object.values(dueMap).sort((a, b) => b.total - a.total).slice(0, 6)
      const acc = accruedByTeacher()
      const paidM = paidByTeacher()
      const teachers = Object.keys(acc)
        .map((tid) => {
          const tr = findById(DB.teachers, +tid)
          return {
            teacher: tr ? tr.full_name : '—', teacher_code: tr ? tr.teacher_code : '',
            commission: acc[+tid], paid: paidM[+tid] || 0, payable: acc[+tid] - (paidM[+tid] || 0),
          }
        })
        .sort((a, b) => b.commission - a.commission)
      const totalCommission = teachers.reduce((s, t) => s + t.commission, 0)
      return delay({
        kpis: {
          activeStudents: DB.students.filter((s) => s.status === 'ACTIVE').length,
          activeEnrollments: byStatus.ACTIVE + byStatus.PENDING_DEACTIVATION,
          totalCollected, totalBilled,
          collectionRate: totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0,
          dueTotal, totalCommission,
        },
        enrollmentsByStatus: byStatus, cycles, topDebtors, teachers,
      })
    },
  },
}

export type Api = typeof api
