import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, homeFor, useAuth } from '@/auth/AuthContext'
import { Protected } from '@/auth/Protected'
import { AppShell } from '@/components/shell/AppShell'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { ToastProvider } from '@/components/ui/Toast'
import { ROLE } from '@/lib/constants'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/theme/ThemeContext'

// Login is eager (unauthenticated first paint should be instant). Every screen
// behind auth is a lazy chunk, loaded on demand — the shell's own Suspense
// boundary keeps the sidebar up while a page chunk streams in.
import { LoginPage } from '@/pages/LoginPage'

const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const ClassesPage = lazy(() => import('@/pages/admin/ClassesPage').then((m) => ({ default: m.ClassesPage })))
const SubjectsPage = lazy(() => import('@/pages/admin/SubjectsPage').then((m) => ({ default: m.SubjectsPage })))
const SessionsPage = lazy(() => import('@/pages/admin/SessionsPage').then((m) => ({ default: m.SessionsPage })))
const TeachersPage = lazy(() => import('@/pages/admin/TeachersPage').then((m) => ({ default: m.TeachersPage })))
const TeacherSubjectsPage = lazy(() => import('@/pages/admin/TeacherSubjectsPage').then((m) => ({ default: m.TeacherSubjectsPage })))
const RegistrationRequestsPage = lazy(() => import('@/pages/admin/RegistrationRequestsPage').then((m) => ({ default: m.RegistrationRequestsPage })))
const StudentsPage = lazy(() => import('@/pages/admin/StudentsPage').then((m) => ({ default: m.StudentsPage })))
const EnrollmentsPage = lazy(() => import('@/pages/admin/EnrollmentsPage').then((m) => ({ default: m.EnrollmentsPage })))
const FeeConfigurationPage = lazy(() => import('@/pages/admin/FeeConfigurationPage').then((m) => ({ default: m.FeeConfigurationPage })))
const BillingCyclesPage = lazy(() => import('@/pages/admin/BillingCyclesPage').then((m) => ({ default: m.BillingCyclesPage })))
const PaymentsPage = lazy(() => import('@/pages/admin/PaymentsPage').then((m) => ({ default: m.PaymentsPage })))
const DuesPage = lazy(() => import('@/pages/admin/DuesPage').then((m) => ({ default: m.DuesPage })))
const CommissionsPage = lazy(() => import('@/pages/admin/CommissionsPage').then((m) => ({ default: m.CommissionsPage })))
const PayoutsPage = lazy(() => import('@/pages/admin/PayoutsPage').then((m) => ({ default: m.PayoutsPage })))
const TeacherDashboardPage = lazy(() => import('@/pages/teacher/TeacherDashboardPage').then((m) => ({ default: m.TeacherDashboardPage })))
const AttendancePage = lazy(() => import('@/pages/teacher/AttendancePage').then((m) => ({ default: m.AttendancePage })))
const MyStudentsPage = lazy(() => import('@/pages/teacher/MyStudentsPage').then((m) => ({ default: m.MyStudentsPage })))
const MyEnrollmentsPage = lazy(() => import('@/pages/teacher/MyEnrollmentsPage').then((m) => ({ default: m.MyEnrollmentsPage })))
const RegisterStudentPage = lazy(() => import('@/pages/teacher/RegisterStudentPage').then((m) => ({ default: m.RegisterStudentPage })))
const MyCommissionPage = lazy(() => import('@/pages/teacher/MyCommissionPage').then((m) => ({ default: m.MyCommissionPage })))

function IndexRedirect() {
  const { isAuthed, role } = useAuth()
  return <Navigate to={isAuthed ? homeFor(role) : '/login'} replace />
}

function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <p className="font-display text-[64px] font-bold leading-none">404</p>
        <p className="text-secondary mt-2">This page doesn’t exist.</p>
        <a href="/" className="inline-block mt-4 text-blue font-semibold">
          Back to SmartEduTrack
        </a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {/* Respect the OS reduced-motion setting across all Framer animations
                  (CSS media queries don't reach Framer's WAAPI/rAF animations). */}
              <MotionConfig reducedMotion="user">
              <BrowserRouter>
                <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
                <Routes>
                  <Route path="/" element={<IndexRedirect />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Authenticated app */}
                  <Route element={<Protected />}>
                    <Route element={<AppShell />}>
                      {/* Super Admin */}
                      <Route element={<Protected role={ROLE.SUPER_ADMIN} />}>
                        <Route path="/admin/dashboard" element={<DashboardPage />} />
                        <Route path="/admin/reports" element={<ReportsPage />} />
                        <Route path="/admin/sessions" element={<SessionsPage />} />
                        <Route path="/admin/classes" element={<ClassesPage />} />
                        <Route path="/admin/subjects" element={<SubjectsPage />} />
                        <Route path="/admin/teacher-subjects" element={<TeacherSubjectsPage />} />
                        <Route path="/admin/teachers" element={<TeachersPage />} />
                        <Route path="/admin/registration-requests" element={<RegistrationRequestsPage />} />
                        <Route path="/admin/students" element={<StudentsPage />} />
                        <Route path="/admin/enrollments" element={<EnrollmentsPage />} />
                        <Route path="/admin/fee-configuration" element={<FeeConfigurationPage />} />
                        <Route path="/admin/billing-cycles" element={<BillingCyclesPage />} />
                        <Route path="/admin/payments" element={<PaymentsPage />} />
                        <Route path="/admin/dues" element={<DuesPage />} />
                        <Route path="/admin/commissions" element={<CommissionsPage />} />
                        <Route path="/admin/payouts" element={<PayoutsPage />} />
                      </Route>

                      {/* Teacher */}
                      <Route element={<Protected role={ROLE.TEACHER} />}>
                        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
                        <Route path="/teacher/attendance" element={<AttendancePage />} />
                        <Route path="/teacher/students" element={<MyStudentsPage />} />
                        <Route path="/teacher/enrollments" element={<MyEnrollmentsPage />} />
                        <Route path="/teacher/register-student" element={<RegisterStudentPage />} />
                        <Route path="/teacher/commission" element={<MyCommissionPage />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
              </MotionConfig>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
