import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { buttonClasses } from '@/components/ui/Button'
import { CountUp } from '@/components/ui/CountUp'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/StatusPill'
import { Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { COMMISSION_RATE, money } from '@/lib/constants'

function useInstant() {
  const [instant] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden,
  )
  return instant
}

const BENTO = 'rounded-[24px] p-[22px] border border-edge bg-surf shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-28px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]'

export function TeacherDashboardPage() {
  const { session } = useAuth()
  const instant = useInstant()
  const today = useQuery({ queryKey: ['dashboard', 'teacherToday'], queryFn: () => api.dashboard.teacherToday() })
  const t = today.data

  const firstName = (session?.user?.name || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const enter = (delay: number) => ({
    initial: instant ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring' as const, stiffness: 300, damping: 26, delay },
  })

  return (
    <div className="font-general flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4 auto-rows-min">
        {/* Greeting */}
        <motion.section {...enter(0)} className={cn(BENTO, 'sm:col-span-2 lg:col-span-2 flex flex-col justify-between min-h-[168px]')}>
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-secondary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-lime-2 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-2" />
            </span>
            {dateStr}
          </div>
          <h1 className="font-display font-semibold text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.06] tracking-[-0.02em] mt-4">
            {part},{' '}
            <mark className="bg-lime text-lime-ink px-[0.22em] py-[0.02em] rounded-[9px] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              {firstName}
            </mark>
          </h1>
          <p className="text-[14px] text-secondary mt-3">{t ? `${t.subjects.join(' · ') || 'No subjects yet'} · ${t.cycle}` : 'Loading your summary…'}</p>
        </motion.section>

        {/* My students */}
        <motion.section {...enter(0.06)} className={cn(BENTO, 'flex flex-col gap-1.5')}>
          <span className="w-8 h-8 rounded-[9px] grid place-items-center bg-lime/15 text-[color:var(--lime-2)]">
            <Icon name="student" size={17} />
          </span>
          <div className="font-display font-bold text-[30px] leading-none tnum mt-1">
            {t ? <CountUp value={t.students} /> : '—'}
          </div>
          <div className="text-[12.5px] font-semibold text-secondary">My students</div>
        </motion.section>

        {/* Commission (lime accent) */}
        <motion.section {...enter(0.1)} className="rounded-[24px] p-[22px] bg-lime text-lime-ink dark:bg-[#1a220f] dark:text-white flex flex-col gap-1.5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)]">
          <span className="w-8 h-8 rounded-[9px] grid place-items-center bg-lime-ink/12 dark:bg-lime/15 text-lime-ink dark:text-lime">
            <Icon name="percent" size={17} />
          </span>
          <div className="font-display font-bold text-[30px] leading-none tnum mt-1 text-lime-ink dark:text-lime">
            {t ? <CountUp value={t.commission} format={(n) => money(Math.round(n))} /> : '—'}
          </div>
          <div className="text-[12.5px] font-semibold text-lime-ink/70 dark:text-white/60">Commission · at {COMMISSION_RATE}%</div>
        </motion.section>

        {/* Your subjects */}
        <motion.section {...enter(0.14)} className={cn(BENTO, 'sm:col-span-2 lg:col-span-4')}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-[650] tracking-[-0.01em]">Your subjects</p>
            {t &&
              (t.marked ? (
                <Chip tone="green">Attendance marked today</Chip>
              ) : (
                <Chip tone="amber">Attendance not marked</Chip>
              ))}
          </div>

          <div className="mt-3">
            {!t ? (
              <Skeleton rows={2} />
            ) : t.sessions.length === 0 ? (
              <div className="flex items-center gap-3 py-6 text-secondary">
                <span className="w-9 h-9 rounded-full bg-tint-green text-green grid place-items-center flex-none">
                  <Icon name="tick" size={18} />
                </span>
                <p className="text-[14px]">When you’re authorised for a subject and students are enrolled with you, they appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-edge">
                {t.sessions.map((s) => (
                  <div key={s.subject} className="flex items-center gap-3 py-3">
                    <span className="w-9 h-9 rounded-[11px] grid place-items-center flex-none bg-fill text-secondary">
                      <Icon name="book" size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-[590] tracking-[-0.01em]">{s.subject}</p>
                      <p className="text-[13px] text-secondary mt-0.5">
                        {s.count} student{s.count === 1 ? '' : 's'} enrolled
                      </p>
                    </div>
                    <Link to="/teacher/attendance" className={buttonClasses('tinted', 'xs')}>
                      Take attendance
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <p className="text-[13px] text-secondary leading-relaxed px-1">
        You only ever see your own students and figures. Use the sidebar for attendance, your students, enrollments,
        registering a student, and your commission.
      </p>
    </div>
  )
}
