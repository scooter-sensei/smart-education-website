import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate, money } from '@/lib/constants'
import type { ApiError, BillingCycle } from '@/lib/types'

const thisMonth = () => new Date().toISOString().slice(0, 7)

export function BillingCyclesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()

  const [month, setMonth] = useState(thisMonth())
  const [error, setError] = useState<string>()
  const query = useQuery({ queryKey: ['billingCycles'], queryFn: () => api.billingCycles.list() })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['billingCycles'] })

  const generateMut = useMutation({
    mutationFn: () => api.billingCycles.generate({ month }),
    onSuccess: (res) => {
      invalidate()
      const msg = `${res.cycle.label} generated — ${res.records} record${res.records === 1 ? '' : 's'}, ${money(res.billed)} billed${res.skipped ? ` · ${res.skipped} skipped (no fee configured)` : ''}.`
      toast(msg, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t generate the cycle.', 'red'),
  })
  const closeMut = useMutation({
    mutationFn: (id: number) => api.billingCycles.close(id),
    onSuccess: (_r, _id) => {
      invalidate()
      toast('Cycle closed.')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t close — try again.', 'red'),
  })

  function onGenerate(e: FormEvent) {
    e.preventDefault()
    if (!month) {
      setError('Choose a month to generate.')
      return
    }
    generateMut.mutate()
  }
  async function onClose(c: BillingCycle) {
    const ok = await confirm({
      title: `Close ${c.label}?`,
      body: 'The cycle is locked — no further changes to its fee records. Payments already recorded stay. You can’t reopen it here.',
      confirmLabel: 'Close cycle',
    })
    if (ok) closeMut.mutate(c.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing Cycles"
        subtitle="Generate a month’s fees for every active enrollment in one step. Each cycle creates a pending fee record per enrollment, priced from Fee Configuration. Close a cycle to lock it once the month is settled."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">Generate a cycle</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Pick a month and generate. Enrollments without a matching active fee are skipped and reported, so you can fix
          the fee and regenerate. A month can only be generated once.
        </p>
        <form onSubmit={onGenerate} noValidate>
          <div className="grid gap-3 sm:grid-cols-2 items-end">
            <Field label="Month" error={error}>
              <Input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value)
                  if (error) setError(undefined)
                }}
                invalid={!!error}
              />
            </Field>
            <div className="flex sm:justify-end">
              <Button type="submit" disabled={generateMut.isPending}>
                Generate cycle
              </Button>
            </div>
          </div>
        </form>
      </CardPad>

      <Panel title="Cycles" count={query.data?.length}>
        <Async query={query} isEmpty={(d) => d.length === 0} empty={{ title: 'No billing cycles yet', sub: 'Generate your first cycle above to bill the current month’s enrollments.' }}>
          {(cycles) => (
            <Stagger className="divide-y divide-separator">
              {cycles.map((c) => {
                const pct = c.billed > 0 ? Math.round((c.collected / c.billed) * 100) : 0
                return (
                  <StaggerItem key={c.id}>
                    <div className="flex items-start gap-3 px-[18px] py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{c.label}</p>
                        <p className="text-[13.5px] text-secondary mt-0.5">
                          {c.records} fee record{c.records === 1 ? '' : 's'} ·{' '}
                          <b className="text-label font-[650]">{money(c.collected)}</b> collected of {money(c.billed)} ({pct}%)
                        </p>
                        <div className="mt-2 h-1.5 rounded-full bg-fill overflow-hidden max-w-[280px]">
                          <motion.div
                            className="h-full rounded-full bg-green origin-left"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: pct / 100 }}
                            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                          />
                        </div>
                        <p className="text-[13.5px] text-secondary mt-1.5">
                          Generated {fmtDate(c.generated_at)} · {fmtDate(c.period_start)} – {fmtDate(c.period_end)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        <span className={`pill ${c.status === 'OPEN' ? 'pill-green' : 'pill-gray'}`}>
                          {c.status === 'OPEN' ? 'Open' : 'Closed'}
                        </span>
                        {c.status === 'OPEN' && (
                          <Button variant="gray" size="xs" onClick={() => onClose(c)}>
                            Close cycle
                          </Button>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}
        </Async>
      </Panel>
    </div>
  )
}
