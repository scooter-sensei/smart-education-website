import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { CountUp } from '@/components/ui/CountUp'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { money } from '@/lib/constants'
import type { ApiError } from '@/lib/types'

/** True at mount when motion should be skipped (reduced-motion or a hidden/headless
    tab where rAF is throttled) — components then render at their settled value. */
function useInstant() {
  const [instant] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden,
  )
  return instant
}

const BENTO = 'rounded-[24px] p-[22px] border border-edge bg-surf shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-28px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]'

// Task row entrance + directional slide-off. `exit` is a function of the action
// direction (from AnimatePresence's `custom`): approve slides right, reject left.
const taskVariants = {
  hidden: { opacity: 0, height: 0 },
  show: { opacity: 1, height: 'auto' as const, transition: { type: 'spring' as const, stiffness: 320, damping: 30 } },
  exit: (dir: 'approve' | 'reject') => ({
    opacity: 0,
    x: dir === 'reject' ? '-85%' : '85%',
    scale: 0.97,
    transition: { duration: 0.34, ease: [0.23, 1, 0.32, 1] as const },
  }),
}

type Task = {
  key: string
  kind: 'registration' | 'enrollment'
  id: number
  title: string
  sub: string
}

export function DashboardPage() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const instant = useInstant()

  const kpis = useQuery({ queryKey: ['dashboard', 'adminKpis'], queryFn: () => api.dashboard.adminKpis() })
  const overview = useQuery({ queryKey: ['reports', 'overview'], queryFn: () => api.reports.overview() })
  const reqs = useQuery({ queryKey: ['registrationRequests', 'PENDING'], queryFn: () => api.registrationRequests.list({ status: 'PENDING' }) })
  const enrs = useQuery({ queryKey: ['enrollments', 'pending'], queryFn: () => api.enrollments.pending() })

  const firstName = (session?.user?.name || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // combined task feed, held locally so approve/reject can animate a removal.
  // lastDir drives the exit direction (approve → slides right, reject → slides
  // left) via AnimatePresence's `custom`, which is re-read at exit time.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [lastDir, setLastDir] = useState<'approve' | 'reject'>('approve')
  useEffect(() => {
    if (!reqs.data || !enrs.data) return
    const t: Task[] = [
      ...reqs.data.map((r) => ({ key: `r${r.id}`, kind: 'registration' as const, id: r.id, title: r.full_name, sub: `${r.klass} · sign-up by ${r.requested_by}` })),
      ...enrs.data.map((e) => ({ key: `e${e.id}`, kind: 'enrollment' as const, id: e.id, title: e.student, sub: `${e.subject} · enrol by ${e.requested_by || 'a teacher'}` })),
    ]
    setTasks(t)
  }, [reqs.data, enrs.data])

  const act = useMutation({
    mutationFn: ({ task, approve }: { task: Task; approve: boolean }) => {
      if (task.kind === 'registration')
        return approve ? api.registrationRequests.approve(task.id) : api.registrationRequests.reject(task.id)
      return approve ? api.enrollments.approve(task.id) : api.enrollments.reject(task.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (_err: ApiError, v) => {
      // restore the row on failure
      setTasks((cur) => (cur ? [v.task, ...cur] : [v.task]))
    },
  })
  function handle(task: Task, approve: boolean) {
    setLastDir(approve ? 'approve' : 'reject')
    setTasks((cur) => (cur ? cur.filter((t) => t.key !== task.key) : cur))
    act.mutate({ task, approve })
  }

  const k = kpis.data
  const o = overview.data
  // current-cycle rate, so the ring agrees with its own caption (collected of billed)
  const rate = k && k.billed > 0 ? Math.round((k.collected / k.billed) * 100) : 0

  // collections bars from the cycles (oldest → newest for a left-to-right timeline)
  const bars = useMemo(() => {
    const cycles = (o?.cycles ?? []).slice(0, 3).reverse()
    const max = Math.max(1, ...cycles.map((c) => c.collected))
    return cycles.map((c, i) => ({
      label: c.label.split(' ')[0].slice(0, 3),
      value: c.collected,
      ratio: c.collected / max,
      current: i === cycles.length - 1,
    }))
  }, [o])

  const topDebtors = (o?.topDebtors ?? []).slice(0, 3)

  return (
    <div className="bento-page font-general flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4 auto-rows-min">
        {/* Greeting */}
        <motion.section
          initial={instant ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className={cn(BENTO, 'sm:col-span-2 lg:col-span-2 flex flex-col justify-between min-h-[168px]')}
        >
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-secondary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-lime-2 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-2" />
            </span>
            {today}
          </div>
          <h1 className="font-display font-semibold text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.06] tracking-[-0.02em] mt-4">
            {part},{' '}
            <mark className="bg-lime text-lime-ink px-[0.22em] py-[0.02em] rounded-[9px] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              {firstName}
            </mark>
          </h1>
          <p className="text-[14px] text-secondary mt-3">
            {k ? (
              <>
                {k.currentCycle} · {k.pendingRequests + k.pendingEnrollments} awaiting you · {k.dues} owe fees
              </>
            ) : (
              'Loading your centre…'
            )}
          </p>
        </motion.section>

        {/* Ring / collection rate (always-dark focal card) */}
        <motion.section
          initial={instant ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }}
          className="relative overflow-hidden rounded-[24px] p-[22px] bg-ink text-white lg:row-span-2 flex flex-col shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]"
        >
          <div aria-hidden className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, var(--lime), transparent 65%)' }} />
          <p className="relative text-[12.5px] font-semibold uppercase tracking-[0.08em] text-white/60">Collection rate</p>
          <div className="relative flex-1 grid place-items-center py-4">
            <Donut pct={rate} instant={instant} ready={!!k} />
          </div>
          <p className="relative text-[13.5px] text-white/70 tnum">
            {k ? (
              <>
                {money(k.collected)} of {money(k.billed)} · {k.currentCycle}
              </>
            ) : (
              '—'
            )}
          </p>
        </motion.section>

        {/* Outstanding dues (lime CTA, theme-aware) */}
        <motion.section
          initial={instant ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
          className="rounded-[24px] p-[22px] lg:row-span-2 flex flex-col bg-lime text-lime-ink dark:bg-[#1a220f] dark:text-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-lime-ink/70 dark:text-lime/80">Outstanding dues</p>
            <span className="w-8 h-8 rounded-full grid place-items-center bg-lime-ink/12 dark:bg-lime/15 text-lime-ink dark:text-lime">
              <Icon name="alert" size={16} />
            </span>
          </div>
          <p className="font-display font-bold text-[clamp(2.2rem,4vw,3rem)] leading-none tracking-[-0.02em] mt-3 tnum text-lime-ink dark:text-lime">
            {o ? <CountUp value={o.kpis.dueTotal} format={(n) => money(Math.round(n))} /> : '—'}
          </p>
          <p className="text-[13px] font-medium text-lime-ink/70 dark:text-white/60 mt-1">
            {k ? `${k.dues} student${k.dues === 1 ? '' : 's'} owe you` : ''}
          </p>

          <div className="mt-4 flex flex-col divide-y divide-lime-ink/12 dark:divide-lime/12">
            {topDebtors.map((d) => (
              <div key={d.student_code} className="flex items-center justify-between py-2 text-[13.5px]">
                <span className="truncate font-medium">{d.student}</span>
                <b className="tnum font-[650]">{money(d.total)}</b>
              </div>
            ))}
            {!o && <Skeleton rows={2} className="py-2" />}
          </div>

          <Link
            to="/admin/dues"
            className="mt-auto pt-4 inline-flex items-center justify-between gap-2 text-[14.5px] font-semibold group"
          >
            Collect now
            <span className="w-8 h-8 rounded-full grid place-items-center bg-lime-ink/12 dark:bg-lime/15 transition-transform group-hover:translate-x-0.5">
              <Icon name="arrowRight" size={16} />
            </span>
          </Link>
        </motion.section>

        {/* Collections bar chart */}
        <motion.section
          initial={instant ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.08 }}
          className={cn(BENTO, 'sm:col-span-2 lg:col-span-2')}
        >
          <div className="flex items-baseline justify-between">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-secondary">Collections</p>
            <p className="text-[12.5px] text-secondary">last 3 cycles</p>
          </div>
          {o ? (
            <div className="mt-6 flex items-end justify-around gap-5 h-[150px]">
              {bars.map((b, i) => (
                <div key={i} className="group flex-1 max-w-[88px] flex flex-col items-center gap-2.5 h-full justify-end">
                  <span className={cn('tnum tabular-nums', b.current ? 'text-[14px] font-bold text-label' : 'text-[13px] font-semibold text-secondary')}>
                    {money(b.value)}
                  </span>
                  {/* ghost track gives every bar a full-height reference frame */}
                  <div className="relative w-full flex-1 flex items-end">
                    <div aria-hidden className="absolute inset-0 rounded-[12px] bg-fill/60" />
                    <motion.div
                      className={cn(
                        'relative w-full rounded-[12px] origin-bottom overflow-hidden transition-[filter] duration-200 group-hover:brightness-105',
                        b.current ? 'bg-lime' : 'bg-bar-past',
                      )}
                      style={{ height: '100%' }}
                      initial={instant ? { scaleY: b.ratio } : { scaleY: 0 }}
                      animate={{ scaleY: b.ratio }}
                      transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.12 + i * 0.08 }}
                    >
                      {/* top sheen for a little depth */}
                      <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                    </motion.div>
                  </div>
                  <span className={cn('text-[12px] font-semibold uppercase tracking-[0.05em]', b.current ? 'text-label' : 'text-secondary')}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 h-[150px] flex items-center">
              <Skeleton rows={1} className="w-full" />
            </div>
          )}
        </motion.section>

        {/* Glance stats */}
        <motion.section
          initial={instant ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.12 }}
          className={cn(BENTO, 'sm:col-span-2 lg:col-span-2 !p-0 overflow-hidden')}
        >
          <div className="grid grid-cols-3 divide-x divide-edge">
            <GlanceStat label="Students" value={k?.activeStudents} icon="student" />
            <GlanceStat label="Teachers" value={k?.activeTeachers} icon="teachers" />
            <GlanceStat label="Enrolments" value={k?.activeEnrollments} icon="usercheck" />
          </div>
        </motion.section>

        {/* Needs your eye — task feed */}
        <motion.section
          initial={instant ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.14 }}
          className={cn(BENTO, 'sm:col-span-2 lg:col-span-4')}
        >
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-[650] tracking-[-0.01em]">Needs your eye</p>
            {tasks && (
              <span className="text-[12px] font-semibold text-secondary bg-fill px-2.5 py-[3px] rounded-full tnum">
                {tasks.length}
              </span>
            )}
          </div>

          <div className="mt-3">
            {!tasks ? (
              <Skeleton rows={3} />
            ) : tasks.length === 0 ? (
              <div className="flex items-center gap-3 py-6 text-secondary">
                <span className="w-9 h-9 rounded-full bg-tint-green text-green grid place-items-center flex-none">
                  <Icon name="tick" size={18} />
                </span>
                <p className="text-[14px]">You’re all caught up — no approvals waiting.</p>
              </div>
            ) : (
              <motion.div layout className="flex flex-col divide-y divide-edge">
                <AnimatePresence initial={false} mode="popLayout" custom={lastDir}>
                  {tasks.map((t) => (
                    <motion.div
                      key={t.key}
                      layout
                      custom={lastDir}
                      variants={taskVariants}
                      initial={instant ? false : 'hidden'}
                      animate="show"
                      exit="exit"
                      className="flex items-center gap-3 py-3"
                    >
                      <span className={cn('w-9 h-9 rounded-[11px] grid place-items-center flex-none text-white', t.kind === 'registration' ? 'bg-indigo' : 'bg-teal')}>
                        <Icon name={t.kind === 'registration' ? 'userplus' : 'usercheck'} size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-[590] tracking-[-0.01em] truncate">{t.title}</p>
                        <p className="text-[13px] text-secondary mt-0.5 truncate">{t.sub}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        <button
                          type="button"
                          onClick={() => handle(t, true)}
                          aria-label={`Approve ${t.title}`}
                          className="w-9 h-9 rounded-full grid place-items-center bg-lime text-lime-ink transition active:scale-95 hover:brightness-105"
                        >
                          <Icon name="tick" size={17} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handle(t, false)}
                          aria-label={`Reject ${t.title}`}
                          className="w-9 h-9 rounded-full grid place-items-center bg-fill text-secondary transition active:scale-95 hover:bg-fill-2"
                        >
                          <Icon name="x" size={17} strokeWidth={2.2} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

/* ---- Donut gauge (SVG stroke-dashoffset) ---- */
function Donut({ pct, instant, ready }: { pct: number; instant: boolean; ready: boolean }) {
  const size = 150
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const target = c * (1 - Math.min(1, Math.max(0, pct / 100)))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--lime)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: instant ? target : c }}
          animate={{ strokeDashoffset: ready ? target : c }}
          transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display font-bold text-[34px] leading-none tnum">
            {ready ? <CountUp value={pct} format={(n) => `${Math.round(n)}%`} /> : '—'}
          </div>
          <div className="text-[11px] text-white/55 mt-1">collected</div>
        </div>
      </div>
    </div>
  )
}

function GlanceStat({ label, value, icon }: { label: string; value?: number; icon: 'student' | 'teachers' | 'usercheck' }) {
  return (
    <div className="p-[22px] flex flex-col gap-1.5">
      <span className="w-8 h-8 rounded-[9px] grid place-items-center bg-lime/15 text-[color:var(--lime-2)]">
        <Icon name={icon} size={17} />
      </span>
      <div className="font-display font-bold text-[30px] leading-none tnum mt-1">
        {value == null ? '—' : <CountUp value={value} />}
      </div>
      <div className="text-[12.5px] font-semibold text-secondary">{label}</div>
    </div>
  )
}
