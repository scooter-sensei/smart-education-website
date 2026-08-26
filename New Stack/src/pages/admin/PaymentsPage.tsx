import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input, Select } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { Chip } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async } from '@/components/ui/states'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate, money } from '@/lib/constants'
import { useDebounced } from '@/lib/useDebounced'
import type { ApiError, PendingRecordRow } from '@/lib/types'

const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' }
const todayISO = () => new Date().toISOString().slice(0, 10)
function monthLabel(m: string) {
  try {
    return new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  } catch {
    return m
  }
}

export function PaymentsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')
  const [paidOn, setPaidOn] = useState(todayISO())
  const [allocs, setAllocs] = useState<Record<number, string>>({})
  const [errors, setErrors] = useState<{ student?: string; amount?: string }>({})
  const [q, setQ] = useState('')
  const qDebounced = useDebounced(q)

  const [searchParams] = useSearchParams()
  const students = useQuery({ queryKey: ['payments', 'students'], queryFn: () => api.payments.students() })

  // deep link from Dues: /admin/payments?student=<id> preselects the student once loaded
  useEffect(() => {
    const pre = searchParams.get('student')
    if (!pre || studentId || !students.data) return
    if (students.data.some((s) => String(s.student_id) === pre)) setStudentId(pre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.data])
  const pending = useQuery({
    queryKey: ['payments', 'pending', studentId],
    queryFn: () => api.payments.pendingRecords(studentId),
    enabled: !!studentId,
  })
  const list = useQuery({
    queryKey: ['payments', 'list', qDebounced],
    queryFn: () => api.payments.list(qDebounced ? { q: qDebounced } : {}),
  })

  // when a student's dues load, seed allocation inputs and prefill amount with the total due
  useEffect(() => {
    if (!studentId || !pending.data) return
    const seed: Record<number, string> = {}
    pending.data.forEach((r) => (seed[r.id] = '0'))
    setAllocs(seed)
    const totalDue = pending.data.reduce((s, r) => s + r.outstanding, 0)
    setAmount((a) => (a ? a : totalDue ? String(totalDue) : a))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, pending.data])

  const records = pending.data ?? []
  const amountNum = +amount || 0
  const allocSum = useMemo(
    () => records.reduce((s, r) => s + Math.min(+allocs[r.id] || 0, r.outstanding), 0),
    [records, allocs],
  )
  const over = allocSum > amountNum
  const credit = amountNum - allocSum

  function setAlloc(rec: PendingRecordRow, raw: string) {
    let v = +raw || 0
    if (v < 0) v = 0
    if (v > rec.outstanding) v = rec.outstanding
    setAllocs((s) => ({ ...s, [rec.id]: raw === '' ? '' : String(v) }))
  }
  function autoAllocate() {
    let remaining = amountNum
    const next: Record<number, string> = {}
    records.forEach((r) => {
      const give = Math.max(0, Math.min(r.outstanding, remaining))
      next[r.id] = String(give)
      remaining -= give
    })
    setAllocs(next)
  }

  const recordMut = useMutation({
    mutationFn: () => {
      const allocations = records
        .map((r) => ({ fee_record_id: r.id, amount: +allocs[r.id] || 0 }))
        .filter((a) => a.amount > 0)
      return api.payments.record({
        student_id: studentId,
        amount: amountNum,
        method,
        reference: reference.trim(),
        paid_on: paidOn,
        allocations,
      })
    },
    onSuccess: (res) => {
      // reset the form
      setStudentId('')
      setAmount('')
      setMethod('CASH')
      setReference('')
      setPaidOn(todayISO())
      setAllocs({})
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['billingCycles'] })
      toast(
        `Payment recorded — ${money(res.payment.amount)} from ${res.payment.student}${res.credit > 0 ? ` · ${money(res.credit)} credit` : ''}.`,
        'green',
      )
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t record the payment.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!studentId) next.student = 'Choose a student.'
    if (!amount) next.amount = 'Enter the amount paid.'
    else if (!(amountNum > 0)) next.amount = 'Enter an amount greater than zero.'
    setErrors(next)
    if (Object.keys(next).length) return
    if (over) {
      toast('Allocations exceed the payment amount — adjust and try again.', 'red')
      return
    }
    recordMut.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        subtitle="Record a payment and allocate it across the student’s outstanding fees. Whatever you don’t allocate is kept as credit — an advance against future months. Allocating a fee in full marks it paid."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">Record a payment</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Pick a student who owes fees, enter the amount and method, then choose how it settles their dues.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={3}>
            <Field label="Student" error={errors.student}>
              <Select
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value)
                  if (errors.student) setErrors((s) => ({ ...s, student: undefined }))
                }}
                invalid={!!errors.student}
              >
                <option value="">{students.isPending ? 'Loading…' : students.data?.length ? 'Select a student' : 'No active students'}</option>
                {students.data?.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student} · {s.student_code} · {s.due > 0 ? `owes ${money(s.due)}` : 'no dues'}
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
                placeholder="e.g. 2250"
                invalid={!!errors.amount}
              />
            </Field>
            <Field label="Method">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
              </Select>
            </Field>
            <Field label={<>Reference <span className="font-normal text-tertiary">· optional</span></>}>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI / cheque / txn no." autoComplete="off" />
            </Field>
            <Field label="Paid on">
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
          </FormGrid>

          <AnimatePresence initial={false}>
            {studentId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-[18px] pt-4 border-t border-separator">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-[14px] font-[650] tracking-[-0.01em]">Allocate to dues</h3>
                    {records.length > 0 && (
                      <Button variant="gray" size="xs" onClick={autoAllocate} type="button">
                        Auto-allocate
                      </Button>
                    )}
                  </div>

                  {pending.isPending ? (
                    <p className="text-[13px] text-secondary px-0.5">Loading dues…</p>
                  ) : records.length === 0 ? (
                    <p className="text-[13px] text-secondary px-0.5">
                      No current dues for this student — the full amount is recorded as credit (an advance).
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {records.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3 bg-fill rounded-[11px] px-3.5 py-2.5">
                          <div className="min-w-0">
                            <b className="text-[14px] font-[590]">
                              {monthLabel(r.month)} · {r.subject}
                            </b>
                            <span className="block text-[12.5px] text-secondary mt-px tnum">
                              {r.klass} · outstanding {money(r.outstanding)}
                            </span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            max={r.outstanding}
                            inputMode="numeric"
                            aria-label={`Allocate to ${r.subject}`}
                            value={allocs[r.id] ?? '0'}
                            onChange={(e) => setAlloc(r, e.target.value)}
                            className="w-[132px] flex-none min-h-[40px] px-3 text-right tnum bg-card rounded-[10px] border border-separator focus:outline-none focus:border-blue text-[15px]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={`mt-3 text-[13.5px] tnum ${over ? 'text-red' : 'text-secondary'}`}>
                    {over ? (
                      <>
                        Allocated <b className="text-red font-[650]">{money(allocSum)}</b> — that’s {money(allocSum - amountNum)} more than the payment of {money(amountNum)}.
                      </>
                    ) : (
                      <>
                        Allocated <b className="text-label font-[650]">{money(allocSum)}</b> of {money(amountNum)}
                        {credit > 0 ? (
                          <span className="text-green font-semibold"> · {money(credit)} kept as credit</span>
                        ) : (
                          ' · fully allocated'
                        )}
                      </>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4">
            <Button type="submit" disabled={recordMut.isPending}>
              Record payment
            </Button>
          </div>
        </form>
      </CardPad>

      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, ID or reference" wrapClassName="w-full" />

      <Panel title="Recent payments" count={list.isPending ? undefined : list.data?.length}>
        <Async query={list} isEmpty={(d) => d.length === 0} empty={{ title: 'No payments match', sub: 'Recorded payments appear here. Use the form above to record the first one.' }}>
          {(payments) => (
            <div className="divide-y divide-separator">
              {payments.map((p) => {
                const cr = p.amount - (p.allocated || 0)
                return (
                  <div key={p.id} className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={p.student} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                        {p.student} · <b className="font-[650]">{money(p.amount)}</b>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Code>{p.student_code}</Code>
                        <span>· {fmtDate(p.paid_on)}{p.reference ? ` · ref ${p.reference}` : ''}</span>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5 tnum">
                        Allocated {money(p.allocated || 0)}
                        {cr > 0 ? ` · ${money(cr)} credit` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <Chip tone="gray">{METHOD_LABEL[p.method] || p.method}</Chip>
                      {cr > 0 && <Chip tone="amber">Credit</Chip>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Async>
      </Panel>
    </div>
  )
}
