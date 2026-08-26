import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ActivePill } from '@/components/ui/StatusPill'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate, money } from '@/lib/constants'
import { useOptimisticListMutation } from '@/lib/optimistic'
import type { ApiError, FeeConfig } from '@/lib/types'

type Filter = '' | 'ACTIVE' | 'INACTIVE'
const todayISO = () => new Date().toISOString().slice(0, 10)

export function FeeConfigurationPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()

  const [active, setActive] = useState<Filter>('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<FeeConfig | null>(null)
  const [form, setForm] = useState({ class: '', subject: '', amount: '', first_month_billing: 'FULL', effective_from: todayISO() })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const set = (k: keyof typeof form, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }))
  }

  const options = useQuery({ queryKey: ['feeConfigs', 'options'], queryFn: () => api.feeConfigs.options() })
  const query = useQuery({
    queryKey: ['feeConfigs', active || 'all'],
    queryFn: () => api.feeConfigs.list(active ? { active } : {}),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['feeConfigs'] })

  const filtered = useMemo(() => {
    const list = query.data ?? []
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter((c) => `${c.class} ${c.subject}`.toLowerCase().includes(needle))
  }, [query.data, q])

  const createMut = useMutation({
    mutationFn: () =>
      api.feeConfigs.create({
        class: form.class,
        subject: form.subject,
        amount: form.amount,
        first_month_billing: form.first_month_billing,
        effective_from: form.effective_from,
      }),
    onSuccess: (row) => {
      setForm({ class: '', subject: '', amount: '', first_month_billing: 'FULL', effective_from: todayISO() })
      invalidate()
      toast(`Fee added — ${row.class} · ${row.subject} at ${money(row.amount)}.`, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t add the fee.', 'red'),
  })
  // Optimistic: on a specific filter, deactivating/reactivating drops the row from
  // the visible list immediately, so it slides off on click. On "All" it stays
  // (in-place toggle) — skip the optimistic patch and let the refetch flip the pill.
  const setActiveMut = useOptimisticListMutation<{ id: number; next: boolean }, FeeConfig>({
    mutationFn: ({ id, next }) => api.feeConfigs.setActive(id, next),
    targetKey: () => (active ? ['feeConfigs', active] : null),
    patch: (list, { id }) => list.filter((c) => c.id !== id),
    invalidate: [['feeConfigs']],
    onSuccess: (_r, v) => toast(v.next ? 'Fee reactivated.' : 'Fee deactivated — new cycles won’t use it.'),
    onError: (err) => toast(err?.message || 'Couldn’t update — try again.', 'red'),
  })

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string | undefined> = {}
    if (!form.class) next.class = 'Choose a class.'
    if (!form.subject) next.subject = 'Choose a subject.'
    if (!form.amount) next.amount = 'Enter a monthly fee.'
    else if (!(+form.amount > 0)) next.amount = 'Enter a fee greater than zero.'
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    createMut.mutate()
  }

  async function onToggle(c: FeeConfig) {
    if (c.is_active) {
      const ok = await confirm({
        title: 'Deactivate this fee?',
        body: `${c.class} · ${c.subject} will no longer price new billing cycles. Records already billed are unchanged.`,
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActiveMut.mutate({ id: c.id, next: !c.is_active })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fee Configuration"
        subtitle="Set the monthly fee for each class and subject. Billing cycles price every enrollment from these. “First month” decides whether a mid-month joiner pays the full fee or half for their first month."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New fee</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          One active fee per class-and-subject. Deactivate an old fee and add a new one when the rate changes.
        </p>
        <form onSubmit={onCreate} noValidate>
          <FormGrid cols={3}>
            <Field label="Class" error={errors.class}>
              <Select value={form.class} onChange={(e) => set('class', e.target.value)} invalid={!!errors.class}>
                <option value="">{options.isPending ? 'Loading…' : 'Select a class'}</option>
                {options.data?.classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" error={errors.subject}>
              <Select value={form.subject} onChange={(e) => set('subject', e.target.value)} invalid={!!errors.subject}>
                <option value="">{options.isPending ? 'Loading…' : 'Select a subject'}</option>
                {options.data?.subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly fee (₹)" error={errors.amount}>
              <Input type="number" min={1} step={1} inputMode="numeric" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="e.g. 1100" invalid={!!errors.amount} />
            </Field>
            <Field label="First month">
              <Select value={form.first_month_billing} onChange={(e) => set('first_month_billing', e.target.value)}>
                <option value="FULL">Full fee</option>
                <option value="HALF">Half fee</option>
              </Select>
            </Field>
            <Field label="Effective from">
              <Input type="date" value={form.effective_from} onChange={(e) => set('effective_from', e.target.value)} />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Add fee
            </Button>
          </div>
        </form>
      </CardPad>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SegmentedControl<Filter>
          options={[
            { value: '', label: 'All' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
          value={active}
          onChange={setActive}
        />
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search class or subject" />
      </div>

      <Panel title="Fees" count={query.isPending ? undefined : filtered.length}>
        <Async query={query} isEmpty={() => filtered.length === 0} empty={{ title: 'No fees match', sub: 'Add a monthly fee for a class and subject above. Billing can’t price an enrollment without one.' }}>
          {() => (
            <Stagger className="divide-y divide-separator">
              {filtered.map((c) => (
                <StaggerItem key={c.id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">
                        {c.class} · {c.subject}
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        <b className="text-label font-[650]">{money(c.amount)}</b> / month · first month{' '}
                        {c.first_month_billing === 'HALF' ? 'half' : 'full'}
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">Effective {fmtDate(c.effective_from)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-none flex-wrap justify-end">
                      <ActivePill active={c.is_active} />
                      <Button variant="gray" size="xs" onClick={() => setEditing(c)}>
                        Edit
                      </Button>
                      <Button variant={c.is_active ? 'red-tinted' : 'tinted'} size="xs" onClick={() => onToggle(c)}>
                        {c.is_active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Async>
      </Panel>

      {editing && (
        <EditFeeDialog
          fee={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate()
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function EditFeeDialog({ fee, onClose, onSaved }: { fee: FeeConfig; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [amount, setAmount] = useState(String(fee.amount))
  const [first, setFirst] = useState(fee.first_month_billing)
  const [eff, setEff] = useState(fee.effective_from)
  const [error, setError] = useState<string>()

  const mut = useMutation({
    mutationFn: () => api.feeConfigs.update(fee.id, { amount, first_month_billing: first, effective_from: eff }),
    onSuccess: () => {
      toast(`Fee updated — ${fee.class} · ${fee.subject}.`, 'green')
      onSaved()
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t save — try again.', 'red'),
  })

  function onSubmit() {
    if (!(+amount > 0)) {
      setError('Enter a monthly fee greater than zero.')
      return
    }
    mut.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit fee"
      description={`${fee.class} · ${fee.subject}. Class and subject identify the fee and can’t change here — deactivate and add a new one instead.`}
      footer={
        <>
          <Button variant="gray" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={mut.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <FormGrid cols={2}>
        <Field label="Monthly fee (₹)" error={error}>
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (error) setError(undefined)
            }}
            invalid={!!error}
          />
        </Field>
        <Field label="First month">
          <Select value={first} onChange={(e) => setFirst(e.target.value as 'FULL' | 'HALF')}>
            <option value="FULL">Full fee</option>
            <option value="HALF">Half fee</option>
          </Select>
        </Field>
        <Field label="Effective from" className="sm:col-span-2">
          <Input type="date" value={eff} onChange={(e) => setEff(e.target.value)} />
        </Field>
      </FormGrid>
    </Modal>
  )
}
