import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/Card'
import { Kpi, KpiStrip, Panel } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Chip } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Skeleton, Stagger, StaggerItem } from '@/components/ui/states'
import { api } from '@/lib/api'
import { COMMISSION_RATE, money } from '@/lib/constants'

function monthLabel(m: string) {
  try {
    return new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  } catch {
    return m
  }
}

export function CommissionsPage() {
  const [month, setMonth] = useState('')
  const months = useQuery({ queryKey: ['commissions', 'months'], queryFn: () => api.commissions.months() })
  const report = useQuery({ queryKey: ['commissions', 'report', month || 'all'], queryFn: () => api.commissions.report(month ? { month } : {}) })

  const monthOptions = [
    { value: '', label: 'All' },
    ...(months.data ?? []).map((m) => ({ value: m, label: monthLabel(m) })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commission Reports"
        subtitle={`Each teacher earns ${COMMISSION_RATE}% of the fees collected for their subjects. This shows what has accrued from payments received — the basis for teacher payouts.`}
      />

      {report.isPending || !report.data ? (
        <Skeleton rows={1} />
      ) : (
        <KpiStrip cols={3}>
          <Kpi label="Commission accrued" value={money(report.data.totalCommission)} foot={`at ${report.data.rate}% of collected`} />
          <Kpi label="Collected" value={money(report.data.totalCollected)} />
          <Kpi label="Teachers earning" value={report.data.teachers} />
        </KpiStrip>
      )}

      {monthOptions.length > 1 && (
        <SegmentedControl value={month} onChange={setMonth} options={monthOptions} className="self-start max-w-full overflow-x-auto no-scrollbar" />
      )}

      <Panel title="By teacher" count={report.isPending ? undefined : report.data?.rows.length}>
        <Async query={report} isEmpty={(d) => d.rows.length === 0} empty={{ title: 'No commission yet', sub: 'Commission accrues as payments are collected for teachers’ subjects.' }}>
          {(r) => (
            <Stagger className="divide-y divide-separator">
              {r.rows.map((t) => (
                <StaggerItem key={t.teacher_id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={t.teacher} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                        {t.teacher} · <b className="font-[650] text-green">{money(t.commission)}</b>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Code>{t.teacher_code}</Code>
                        <span>· commission at {r.rate}%</span>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5 tnum">
                        Collected {money(t.collected)} — {t.subjects.map((s) => `${s.subject} ${money(s.collected)}`).join(' · ')}
                      </p>
                    </div>
                    <Chip tone="green">{r.rate}%</Chip>
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
