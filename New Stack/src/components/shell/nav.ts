import { ROLE, type Role } from '@/lib/constants'
import type { IconName } from '@/components/ui/Icon'

export interface NavItem {
  label: string
  to: string
  icon: IconName
}
export interface NavGroup {
  group: string
  items: NavItem[]
}

export const NAV: Record<Role, NavGroup[]> = {
  [ROLE.SUPER_ADMIN]: [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', to: '/admin/dashboard', icon: 'grid' },
        { label: 'Reports', to: '/admin/reports', icon: 'report' },
      ],
    },
    {
      group: 'Academics',
      items: [
        { label: 'Academic Sessions', to: '/admin/sessions', icon: 'calendar' },
        { label: 'Classes', to: '/admin/classes', icon: 'layers' },
        { label: 'Subjects', to: '/admin/subjects', icon: 'book' },
        { label: 'Teacher – Subject Auth', to: '/admin/teacher-subjects', icon: 'link' },
      ],
    },
    {
      group: 'People',
      items: [
        { label: 'Teacher Accounts', to: '/admin/teachers', icon: 'teachers' },
        { label: 'Registration Requests', to: '/admin/registration-requests', icon: 'inbox' },
        { label: 'Students', to: '/admin/students', icon: 'student' },
        { label: 'Enrollments', to: '/admin/enrollments', icon: 'usercheck' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { label: 'Fee Configuration', to: '/admin/fee-configuration', icon: 'wallet' },
        { label: 'Billing Cycles', to: '/admin/billing-cycles', icon: 'billing' },
        { label: 'Payments', to: '/admin/payments', icon: 'rupee' },
        { label: 'Dues', to: '/admin/dues', icon: 'alert' },
        { label: 'Commission Reports', to: '/admin/commissions', icon: 'percent' },
        { label: 'Teacher Payouts', to: '/admin/payouts', icon: 'coins' },
      ],
    },
  ],
  [ROLE.TEACHER]: [
    {
      group: 'Overview',
      items: [{ label: 'Dashboard', to: '/teacher/dashboard', icon: 'grid' }],
    },
    {
      group: 'Teaching',
      items: [
        { label: 'Attendance', to: '/teacher/attendance', icon: 'check' },
        { label: 'My Students', to: '/teacher/students', icon: 'student' },
        { label: 'My Enrollments', to: '/teacher/enrollments', icon: 'usercheck' },
        { label: 'Register a Student', to: '/teacher/register-student', icon: 'userplus' },
      ],
    },
    {
      group: 'Earnings',
      items: [{ label: 'My Commission', to: '/teacher/commission', icon: 'percent' }],
    },
  ],
}
