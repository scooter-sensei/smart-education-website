import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input, Select } from '@/components/ui/Field'
import { Kpi, KpiStrip, Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { Chip } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Skeleton } from '@/components/ui/states'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate, money } from '@/lib/constants'
import { useDebounced } from '@/lib/useDebounced'
import type { ApiError } from '@/lib/types'

const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' }
const todayISO = () => new Date().toISOString().slice(0, 10)

export function PayoutsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const [teacherCode, setTeacherCode] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  const [paidOn, setPaidOn] = useState(todayISO())
  const [errors, setErrors] = useState<{ teacher?: string; amount?: string }>({})
  const [q, setQ] = useState('')
  const qDebounced = useDebounced(q)

  const summary = useQuery({ queryKey: ['payouts', 'summary'], queryFn: () => api.payouts.summary() })
  const payable = useQuery({ queryKey: ['payouts', 'payable'], queryFn: () => api.payouts.payable() })
  const list = useQuery({ queryKey: ['payouts', 'list', qDebounced], queryFn: () => api.payouts.list(qDebounced ? { q: qDebounced } : {}) })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payouts'] })
  }

  const recordMut = useMutation({
    mutationFn: () =>
      api.payouts.record({ teacher_code: teacherCode, amount, method, reference: reference.trim(), paid_on: paidOn }),
    onSuccess: (row) => {
      setTeacherCode('')
      setAmount('')
      setMethod('BANK_TRANSFER')
      setReference('')
      setPaidOn(todayISO())
      invalidate()
      toast(`Paid ${money(row.amount)} to ${row.teacher}.`, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t record the payout.', 'red'),
  })

  function onTeacherChange(code: string) {
    setTeacherCode(code)
    if (errors.teacher) setErrors((s) => ({ ...s, teacher: undefined }))
    const t = payable.data?.find((x) => x.teacher_code === code)
    if (t) setAmount(String(t.payable))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!teacherCode) next.teacher = 'Choose a teacher.'
    if (!amount) next.amount = 'Enter the amount.'
    else if (!(+amount > 0)) next.amount = 'Enter an amount greater than zero.'
    setErrors(next)
    if (Object.keys(next).length) return
    recordMut.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teacher Payouts"
        subtitle="Pay teachers the commission they’ve accrued. A payout can’t exceed a teacher’s unpaid balance — what they’ve earned from collected fees, less what’s already been paid."
      />

      {summary.isPending || !summary.data ? (
        <Skeleton rows={1} />
      ) : (
        <KpiStrip cols={3}>
          <Kpi label="Commission accrued" value={money(summary.data.accrued)} />
          <Kpi label="Paid out" value={money(summary.data.paid)} />
          <Kpi
            label="Payable now"
            value={money(summary.data.payable)}
            foot={`${summary.data.owing} ${summary.data.owing === 1 ? 'teacher' : 'teachers'}`}
          />
        </KpiStrip>
      )}

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">Record a payout</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Pick a teacher with a balance owing; the amount prefills to their full balance. You can pay less to make a
          part payment.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={3}>
            <Field label="Teacher" error={errors.teacher}>
              <Select value={teacherCode} onChange={(e) => onTeacherChange(e.target.value)} invalid={!!errors.teacher}>
                <option value="">{payable.isPending ? 'Loading…' : payable.data?.length ? 'Select a teacher' : 'Nothing to pay out'}</option>
                {payable.data?.map((t) => (
                  <option key={t.teacher_code} value={t.teacher_code}>
                    {t.teacher} · {t.teacher_code} · owes {money(t.payable)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (₹)" error={errors.amount}>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (errors.amount) setErrors((s) => ({ ...s, amount: undefined }))
                }}
                placeholder="e.g. 475"
                invalid={!!errors.amount}
              />
            </Field>
            <Field label="Method">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </Select>
            </Field>
            <Field label={<>Reference <span className="font-normal text-tertiary">· optional</span></>}>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="NEFT / UPI / cheque no." autoComplete="off" />
            </Field>
            <Field label="Paid on">
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={recordMut.isPending}>
              Record payout
            </Button>
          </div>
        </form>
      </CardPad>

      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teacher, code or reference" wrapClassName="w-full" />

      <Panel title="Recent payouts" count={list.isPending ? undefined : list.data?.length}>
        <Async query={list} isEmpty={(d) => d.length === 0} empty={{ title: 'No payouts yet', sub: 'Recorded payouts appear here. Use the form above to pay a teacher’s balance.' }}>
          {(payouts) => (
            <div className="divide-y divide-separator">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-start gap-3 px-[18px] py-3">
                  <Avatar name={p.teacher} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                      {p.teacher} · <b className="font-[650] text-green">{money(p.amount)}</b>
                    </p>
                    <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Code>{p.teacher_code}</Code>
                      <span>· {fmtDate(p.paid_on)}{p.reference ? ` · ref ${p.reference}` : ''}</span>
                    </p>
                  </div>
                  <Chip tone="gray">{METHOD_LABEL[p.method] || p.method}</Chip>
                </div>
              ))}
            </div>
          )}
        </Async>
      </Panel>
    </div>
  )
}
