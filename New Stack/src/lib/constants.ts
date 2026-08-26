/* Shared status vocabulary, roles and formatters — one source of truth so a
   status renders identically everywhere, always as a labelled pill (never colour
   alone). Ported from the static app's constants.js. */

export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TEACHER: 'TEACHER',
} as const
export type Role = (typeof ROLE)[keyof typeof ROLE]

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  TEACHER: 'Teacher',
}

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray'

/** Status kinds and the values each may take. */
export const STATUS = {
  session: ['ACTIVE', 'CLOSED'],
  admission: ['ACTIVE', 'WITHDRAWN', 'COMPLETED'],
  enrollment: ['PENDING', 'ACTIVE', 'PENDING_DEACTIVATION', 'INACTIVE', 'REJECTED'],
  attendance: ['PRESENT', 'ABSENT'],
  fee: ['PENDING', 'PAID'],
  request: ['PENDING', 'APPROVED', 'REJECTED'],
} as const
export type StatusKind = keyof typeof STATUS

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const COMMISSION_RATE = 50 // fixed in v1.0 (BRS §9)
export const BILLING_FIRST_MONTH = ['FULL', 'HALF'] as const

/* Tone per (kind, value). PENDING is amber for a workflow awaiting action, but
   red for a fee record (an unpaid due) — so tone is keyed by kind. */
const TONE: Record<string, Record<string, Tone>> = {
  session: { ACTIVE: 'green', CLOSED: 'gray' },
  admission: { ACTIVE: 'green', WITHDRAWN: 'gray', COMPLETED: 'blue' },
  enrollment: {
    PENDING: 'amber',
    ACTIVE: 'green',
    PENDING_DEACTIVATION: 'amber',
    INACTIVE: 'gray',
    REJECTED: 'red',
  },
  attendance: { PRESENT: 'green', ABSENT: 'red' },
  fee: { PENDING: 'red', PAID: 'green' },
  request: { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' },
  role: { SUPER_ADMIN: 'blue', TEACHER: 'blue' },
}

export function humanize(v: string): string {
  return String(v)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

export interface StatusChip {
  value: string
  label: string
  tone: Tone
}

export function statusChip(kind: string, value: string): StatusChip {
  return {
    value,
    label: humanize(value),
    tone: (TONE[kind] && TONE[kind][value]) || 'gray',
  }
}

/** ₹ with Indian digit grouping. */
export function money(n: number | null | undefined): string {
  return (
    '₹' +
    Number(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  )
}

/** "5 Aug 2026" — the app's standard human date. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(iso)
  }
}
