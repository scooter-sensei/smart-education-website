/* Domain types — ERD-shaped rows plus the derived response shapes the API
   returns. Mirrors the mock DB in mockDb.ts and the SE.api surface. */

export type EnrollmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PENDING_DEACTIVATION'
  | 'INACTIVE'
  | 'REJECTED'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type StudentStatus = 'ACTIVE' | 'WITHDRAWN' | 'COMPLETED'
export type SessionStatus = 'ACTIVE' | 'CLOSED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT'
export type FeeStatus = 'PENDING' | 'PAID'
export type CycleStatus = 'OPEN' | 'CLOSED'
export type FirstMonthBilling = 'FULL' | 'HALF'

export interface RegistrationRequest {
  id: number
  full_name: string
  phone: string
  guardian_name: string
  guardian_phone: string
  address: string
  klass: string
  session: string
  requested_by: string
  created_at: string
  status: RequestStatus
  reviewed_at?: string
  email?: string
}

export interface Student {
  id: number
  student_code: string
  full_name: string
  phone: string
  email: string
  guardian_name: string
  guardian_phone: string
  address: string
  klass: string
  session: string
  status: StudentStatus
}

export interface Enrollment {
  id: number
  student_id: number
  student: string
  student_code: string
  ts_id: number
  subject: string
  teacher: string
  session: string
  status: EnrollmentStatus
  created_at: string
  reviewed_at?: string
  requested_by?: string
}

export interface AcademicSession {
  id: number
  name: string
  start_date: string
  end_date: string
  status: SessionStatus
}

export interface Klass {
  id: number
  name: string
  level: number
  is_active: boolean
}

export interface Subject {
  id: number
  code: string
  name: string
  is_active: boolean
}

export interface Teacher {
  id: number
  teacher_code: string
  full_name: string
  phone: string
  email: string
  is_active: boolean
}

export interface TeacherSubject {
  id: number
  teacher_id: number
  teacher: string
  subject_id: number
  subject: string
  is_active: boolean
}

export interface AttendanceRow {
  enrollment_id: number
  date: string
  status: AttendanceStatus
}

export interface FeeConfig {
  id: number
  class: string
  subject: string
  amount: number
  first_month_billing: FirstMonthBilling
  effective_from: string
  is_active: boolean
}

export interface BillingCycle {
  id: number
  month: string
  label: string
  period_start: string
  period_end: string
  status: CycleStatus
  generated_at: string
  records: number
  billed: number
  collected: number
}

export interface FeeRecord {
  id: number
  billing_cycle_id: number
  month: string
  enrollment_id: number
  student_id: number
  student: string
  student_code: string
  klass: string
  subject: string
  teacher: string
  teacher_id: number | null
  amount: number
  allocated: number
  status: FeeStatus
}

export interface Payment {
  id: number
  student_id: number
  student: string
  student_code: string
  amount: number
  method: string
  reference: string
  paid_on: string
  note: string
  allocated: number
}

export interface PaymentAllocation {
  id: number
  payment_id: number
  fee_record_id: number
  amount: number
}

export interface TeacherPayout {
  id: number
  teacher: string
  teacher_code: string
  teacher_id: number
  amount: number
  method: string
  reference: string
  paid_on: string
  note: string
}

/* -------- Auth -------- */
export interface AuthUser {
  name: string
  email: string
}
export interface LoginResult {
  token: string
  role: import('./constants').Role
  user: AuthUser
}

/* -------- Derived response shapes -------- */
export interface AdminKpis {
  activeStudents: number
  activeTeachers: number
  activeEnrollments: number
  pendingRequests: number
  pendingEnrollments: number
  dues: number
  currentCycle: string
  billed: number
  collected: number
  commission: number
  attendanceRate: number
}

export interface TeacherToday {
  subjects: string[]
  students: number
  cycle: string
  commission: number
  marked: boolean
  sessions: { subject: string; count: number }[]
}

export interface EnrollmentOptions {
  students: { id: number; label: string }[]
  authorizations: { id: number; label: string; teacher: string; subject: string }[]
}

export interface AttendanceRosterRow {
  enrollment_id: number
  student: string
  student_code: string
  subject: string
  status: AttendanceStatus | null
}

export interface TeacherStudentRow {
  student_id: number
  student: string
  student_code: string
  klass: string
  guardian_name: string
  guardian_phone: string
  subjects: string[]
}

export interface CommissionMonth {
  month: string
  collected: number
  commission: number
  subjects: { subject: string; collected: number }[]
}
export interface TeacherCommission {
  rate: number
  collected: number
  commission: number
  paid: number
  balance: number
  months: CommissionMonth[]
  payouts: TeacherPayout[]
}

export interface DuesSummary {
  totalDue: number
  records: number
  students: number
}
export interface DuesByStudentRow {
  student_id: number
  student: string
  student_code: string
  klass: string
  total: number
  items: { month: string; subject: string; outstanding: number }[]
}

export interface CommissionReportRow {
  teacher_id: number
  teacher: string
  teacher_code: string
  collected: number
  commission: number
  subjects: { subject: string; collected: number }[]
}
export interface CommissionReport {
  rows: CommissionReportRow[]
  rate: number
  totalCollected: number
  totalCommission: number
  teachers: number
}

export interface PayoutsSummary {
  accrued: number
  paid: number
  payable: number
  owing: number
}
export interface PayableTeacher {
  teacher_id: number
  teacher: string
  teacher_code: string
  accrued: number
  paid: number
  payable: number
}

export interface PaymentStudentRow {
  student_id: number
  student: string
  student_code: string
  due: number
}
export interface PendingRecordRow {
  id: number
  month: string
  subject: string
  klass: string
  amount: number
  allocated: number
  outstanding: number
}

export interface ReportsOverview {
  kpis: {
    activeStudents: number
    activeEnrollments: number
    totalCollected: number
    totalBilled: number
    collectionRate: number
    dueTotal: number
    totalCommission: number
  }
  enrollmentsByStatus: Record<string, number>
  cycles: {
    label: string
    month: string
    status: CycleStatus
    billed: number
    collected: number
    records: number
  }[]
  topDebtors: { student: string; student_code: string; total: number }[]
  teachers: {
    teacher: string
    teacher_code: string
    commission: number
    paid: number
    payable: number
  }[]
}

/** The shape a rejected API call throws. */
export interface ApiError {
  code: string | number
  message: string
}
