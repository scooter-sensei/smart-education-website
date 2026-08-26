import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { ActivePill } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import type { ApiError, Teacher } from '@/lib/types'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_RE = /^[0-9+\-\s]{7,15}$/

export function TeachersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['teachers'], queryFn: () => api.teachers.list() })

  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [errors, setErrors] = useState<{ full_name?: string; email?: string; phone?: string }>({})
  const set = (k: keyof typeof form, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }))
  }

  const createMut = useMutation({
    mutationFn: () =>
      api.teachers.create({ full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() }),
    onSuccess: (row: Teacher) => {
      setForm({ full_name: '', email: '', phone: '' })
      qc.invalidateQueries({ queryKey: ['teachers'] })
      toast(`Teacher created — ${row.teacher_code}.`, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t create the teacher.', 'red'),
  })
  const setActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.teachers.setActive(id, active),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      toast(v.active ? 'Teacher reactivated — they can sign in again.' : 'Teacher deactivated — they can no longer sign in.')
    },
    onError: () => toast('Couldn’t update — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.full_name.trim()) next.full_name = 'Enter the teacher’s name.'
    if (!form.email.trim()) next.email = 'Enter a login email.'
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'That doesn’t look like an email address.'
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone number, or leave it blank.'
    setErrors(next)
    if (Object.keys(next).length) return
    createMut.mutate()
  }

  async function onToggle(t: Teacher) {
    if (t.is_active) {
      const ok = await confirm({
        title: 'Deactivate this teacher?',
        body: 'They can no longer sign in. Their assigned subjects, enrollments and history are preserved.',
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActiveMut.mutate({ id: t.id, active: !t.is_active })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teacher Accounts"
        subtitle="Create and manage teacher sign-ins. Each teacher gets a permanent code and a login. Deactivate rather than delete — history and assignments stay intact."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New teacher</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          A permanent teacher code is assigned automatically. The email is their login; share the initial password with
          them privately.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={3}>
            <Field label="Full name" htmlFor="t-name" error={errors.full_name}>
              <Input id="t-name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="e.g. Debjani Roy" autoComplete="off" invalid={!!errors.full_name} />
            </Field>
            <Field label="Email (login)" htmlFor="t-email" error={errors.email}>
              <Input id="t-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@smartedutrack.in" autoCapitalize="off" spellCheck={false} invalid={!!errors.email} />
            </Field>
            <Field
              label={
                <>
                  Phone <span className="font-normal text-tertiary">· optional</span>
                </>
              }
              htmlFor="t-phone"
              error={errors.phone}
            >
              <Input id="t-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98300 00000" invalid={!!errors.phone} />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Create teacher
            </Button>
          </div>
        </form>
      </CardPad>

      <Panel title="All teachers" count={query.data?.length}>
        <Async query={query} isEmpty={(d) => d.length === 0} empty={{ title: 'No teachers yet', sub: 'Create your first teacher account above.' }}>
          {(teachers) => (
            <Stagger className="divide-y divide-separator">
              {teachers.map((t) => (
                <StaggerItem key={t.id}>
                  <div className="flex items-center gap-3 px-[18px] py-3">
                    <Avatar name={t.full_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em] truncate">{t.full_name}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Code>{t.teacher_code}</Code>
                        <span className="truncate">· {t.email}</span>
                        {t.phone && <span>· {t.phone}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <ActivePill active={t.is_active} />
                      <Button variant={t.is_active ? 'red-tinted' : 'tinted'} size="xs" onClick={() => onToggle(t)}>
                        {t.is_active ? 'Deactivate' : 'Reactivate'}
                      </Button>
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
