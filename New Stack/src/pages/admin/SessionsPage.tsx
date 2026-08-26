import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { StatusPill } from '@/components/ui/StatusPill'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/constants'
import type { AcademicSession, ApiError } from '@/lib/types'

export function SessionsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['sessions'], queryFn: () => api.sessions.list() })

  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' })
  const [errors, setErrors] = useState<{ name?: string; start_date?: string; end_date?: string }>({})
  const set = (k: keyof typeof form, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }))
  }
  const invalidate = () => qc.invalidateQueries({ queryKey: ['sessions'] })

  const createMut = useMutation({
    mutationFn: () => api.sessions.create({ name: form.name.trim(), start_date: form.start_date, end_date: form.end_date }),
    onSuccess: () => {
      setForm({ name: '', start_date: '', end_date: '' })
      invalidate()
      toast('Session created — it starts closed. Activate it when ready.', 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t create the session.', 'red'),
  })
  const activateMut = useMutation({
    mutationFn: (id: number) => api.sessions.activate(id),
    onSuccess: () => {
      invalidate()
      toast('Session activated.')
    },
    onError: () => toast('Couldn’t activate — try again.', 'red'),
  })
  const closeMut = useMutation({
    mutationFn: (id: number) => api.sessions.close(id),
    onSuccess: () => {
      invalidate()
      toast('Session closed.')
    },
    onError: () => toast('Couldn’t close — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Enter a session name.'
    if (!form.start_date) next.start_date = 'Pick a start date.'
    if (!form.end_date) next.end_date = 'Pick an end date.'
    else if (form.start_date && form.end_date <= form.start_date) next.end_date = 'End date must be after the start.'
    setErrors(next)
    if (Object.keys(next).length) return
    createMut.mutate()
  }

  async function onActivate(s: AcademicSession) {
    const ok = await confirm({
      title: 'Activate this session?',
      body: 'Only one session can be active. The current active session will be closed automatically.',
      confirmLabel: 'Activate',
    })
    if (ok) activateMut.mutate(s.id)
  }
  async function onClose(s: AcademicSession) {
    const ok = await confirm({
      title: 'Close this session?',
      body: 'Closing stops new admissions and billing for this period. All history is preserved and stays viewable.',
      confirmLabel: 'Close session',
      tone: 'danger',
    })
    if (ok) closeMut.mutate(s.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Academic Sessions"
        subtitle="Only one session is active at a time. Create a period, then activate it when it begins. Closed sessions keep all their history."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New session</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          A new session starts closed. Activate it to make it the current operating period.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
            <Field label="Session name" htmlFor="s-name" error={errors.name}>
              <Input id="s-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 2027–28" autoComplete="off" invalid={!!errors.name} />
            </Field>
            <Field label="Start date" htmlFor="s-start" error={errors.start_date}>
              <Input id="s-start" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} invalid={!!errors.start_date} />
            </Field>
            <Field label="End date" htmlFor="s-end" error={errors.end_date}>
              <Input id="s-end" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} invalid={!!errors.end_date} />
            </Field>
          </div>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Create session
            </Button>
          </div>
        </form>
      </CardPad>

      <Panel title="All sessions" count={query.data?.length}>
        <Async query={query} isEmpty={(d) => d.length === 0} empty={{ title: 'No sessions yet', sub: 'Create your first academic session above to begin.' }}>
          {(sessions) => (
            <Stagger className="divide-y divide-separator">
              {sessions.map((s) => (
                <StaggerItem key={s.id}>
                  <div className="flex items-center gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{s.name}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        {fmtDate(s.start_date)} — {fmtDate(s.end_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <StatusPill kind="session" value={s.status} />
                      {s.status === 'ACTIVE' ? (
                        <Button variant="red-tinted" size="xs" onClick={() => onClose(s)}>
                          Close
                        </Button>
                      ) : (
                        <Button variant="tinted" size="xs" onClick={() => onActivate(s)}>
                          Activate
                        </Button>
                      )}
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
