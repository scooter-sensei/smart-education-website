import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/Card'
import { Kpi, KpiStrip, Panel } from '@/components/ui/Panel'
import { Async, Skeleton, Stagger, StaggerItem } from '@/components/ui/states'
import { Avatar, Code } from '@/components/ui/bits'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { COMMISSION_RATE, humanize, money, type Tone } from '@/lib/constants'

const STATUS_ORDER = ['ACTIVE', 'PENDING', 'PENDING_DEACTIVATION', 'INACTIVE', 'REJECTED']
const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  PENDING_DEACTIVATION: 'amber',
  INACTIVE: 'gray',
  REJECTED: 'red',
}

export function ReportsPage() {
  const query = useQuery({ queryKey: ['reports', 'overview'], queryFn: () => api.reports.overview() })
  const o = query.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        subtitle="A live snapshot of the centre — collections, dues, commission and enrollments, all derived from the same records as the operational screens, so the numbers always tie out."
      />

      {query.isPending || !o ? (
        <Skeleton rows={2} />
      ) : (
        <KpiStrip cols={4}>
          <Kpi label="Collected · all cycles" value={money(o.kpis.totalCollected)} foot={`${o.kpis.collectionRate}% of ${money(o.kpis.totalBilled)} billed`} footTone="pos" />
          <Kpi label="Outstanding dues" value={money(o.kpis.dueTotal)} foot="still owed" footTone="warn" />
          <Kpi label="Commission accrued" value={money(o.kpis.totalCommission)} foot={`at ${COMMISSION_RATE}% of collected`} />
          <Kpi label="Active enrollments" value={o.kpis.activeEnrollments} foot={`${o.kpis.activeStudents} active students`} />
        </KpiStrip>
      )}

      <Panel title="Enrollments by status">
        <div className="flex flex-wrap gap-2 px-[18px] py-4">
          {o ? (
            STATUS_ORDER.filter((s) => o.enrollmentsByStatus[s]).length ? (
              STATUS_ORDER.filter((s) => o.enrollmentsByStatus[s]).map((s) => (
                <span key={s} className={cn('pill', `pill-${STATUS_TONE[s] || 'gray'}`)}>
                  {humanize(s)} · {o.enrollmentsByStatus[s]}
                </span>
              ))
            ) : (
              <span className="text-[13.5px] text-secondary">No enrollments yet.</span>
            )
          ) : (
            <Skeleton rows={1} className="w-full" />
          )}
        </div>
      </Panel>

      <Panel title="Collections by cycle" count={o?.cycles.length}>
        <Async query={query} isEmpty={(d) => d.cycles.length === 0} empty={{ title: 'No cycles yet', sub: 'Generate a billing cycle to see collections here.' }}>
          {(data) => (
            <Stagger className="divide-y divide-separator">
              {data.cycles.map((c) => {
                const pct = c.billed > 0 ? Math.round((c.collected / c.billed) * 100) : 0
                return (
                  <StaggerItem key={c.month}>
                    <div className="flex items-center gap-3 px-[18px] py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{c.label}</p>
                        <p className="text-[13.5px] text-secondary mt-0.5 tnum">
                          {c.records} record{c.records === 1 ? '' : 's'} ·{' '}
                          <b className="text-label font-[650]">{money(c.collected)}</b> of {money(c.billed)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        <span className={cn('pill', c.status === 'OPEN' ? 'pill-green' : 'pill-gray')}>
                          {c.status === 'OPEN' ? 'Open' : 'Closed'}
                        </span>
                        <Code>{pct}%</Code>
                      </div>
                    </div>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}
        </Async>
      </Panel>

      <Panel title="Commission by teacher" count={o?.teachers.length}>
        <Async query={query} isEmpty={(d) => d.teachers.length === 0} empty={{ title: 'No commission yet', sub: 'It accrues as fees are collected for teachers’ subjects.' }}>
          {(data) => (
            <Stagger className="divide-y divide-separator">
              {data.teachers.map((t) => (
                <StaggerItem key={t.teacher_code}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={t.teacher} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                        {t.teacher} · <b className="font-[650] text-green">{money(t.commission)}</b>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap tnum">
                        <Code>{t.teacher_code}</Code>
                        <span>· paid {money(t.paid)} · payable {money(t.payable)}</span>
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Async>
      </Panel>

      <Panel title="Top dues" count={o?.topDebtors.length}>
        <Async query={query} isEmpty={(d) => d.topDebtors.length === 0} empty={{ icon: 'check', title: 'Nothing outstanding', sub: 'Every generated fee has been paid.' }}>
          {(data) => (
            <Stagger className="divide-y divide-separator">
              {data.topDebtors.map((d) => (
                <StaggerItem key={d.student_code}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={d.student} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                        {d.student} · <b className="font-[650] text-red">{money(d.total)}</b>
                      </p>
                      <p className="mt-1">
                        <Code>{d.student_code}</Code>
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Async>
      </Panel>
    </div>
  )
}
