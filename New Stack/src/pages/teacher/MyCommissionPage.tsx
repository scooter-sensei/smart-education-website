import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/Card'
import { Kpi, KpiStrip, Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/StatusPill'
import { Async, Skeleton, Stagger, StaggerItem } from '@/components/ui/states'
import { api } from '@/lib/api'
import { COMMISSION_RATE, fmtDate, money } from '@/lib/constants'

const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' }
function monthLabel(m: string) {
  try {
    return new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  } catch {
    return m
  }
}

export function MyCommissionPage() {
  const query = useQuery({ queryKey: ['teacher', 'commission'], queryFn: () => api.teacher.commission() })
  const c = query.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Commission"
        subtitle={`You earn ${COMMISSION_RATE}% of the fees collected for your subjects. Commission accrues as students pay — here’s what you’ve earned, what’s been paid out, and what’s still due.`}
      />

      {query.isPending || !c ? (
        <Skeleton rows={1} />
      ) : (
        <KpiStrip cols={3}>
          <Kpi label="Commission earned" value={money(c.commission)} foot={`at ${c.rate}% of collected`} />
          <Kpi label="Paid out" value={money(c.paid)} />
          <Kpi label="Balance due" value={money(c.balance)} foot={c.balance > 0 ? 'owed to you' : 'settled'} footTone={c.balance > 0 ? 'warn' : 'pos'} />
        </KpiStrip>
      )}

      <Panel title="By month" count={c ? c.months.length : undefined}>
        <Async query={query} isEmpty={(d) => d.months.length === 0} empty={{ title: 'No commission yet', sub: 'As students pay fees for your subjects, your monthly commission shows up here.' }}>
          {(data) => (
            <Stagger className="divide-y divide-separator">
              {data.months.map((m) => (
                <StaggerItem key={m.month}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                        {monthLabel(m.month)} · <b className="font-[650] text-green">{money(m.commission)}</b>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5 tnum">
                        Collected {money(m.collected)} — {m.subjects.map((s) => `${s.subject} ${money(s.collected)}`).join(' · ')}
                      </p>
                    </div>
                    <Chip tone="green">{data.rate}%</Chip>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Async>
      </Panel>

      <Panel title="Payouts received" count={c ? c.payouts.length : undefined}>
        <Async query={query} isEmpty={(d) => d.payouts.length === 0} empty={{ title: 'No payouts yet', sub: 'When the centre pays your commission, each payout is listed here.' }}>
          {(data) => (
            <div className="divide-y divide-separator">
              {data.payouts.map((p) => (
                <div key={p.id} className="flex items-start gap-3 px-[18px] py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[16.5px] font-[590] tracking-[-0.01em] tnum">
                      <b className="font-[650]">{money(p.amount)}</b>
                    </p>
                    <p className="text-[13.5px] text-secondary mt-0.5">
                      {METHOD_LABEL[p.method] || p.method} · {fmtDate(p.paid_on)}
                      {p.reference ? ` · ref ${p.reference}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Async>
      </Panel>
    </div>
  )
}
