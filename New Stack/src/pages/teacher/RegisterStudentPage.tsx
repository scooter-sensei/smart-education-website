import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { StatusPill } from '@/components/ui/StatusPill'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/constants'
import type { ApiError } from '@/lib/types'

const PHONE_RE = /^[0-9+\-\s]{7,15}$/

export function RegisterStudentPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const classes = useQuery({ queryKey: ['teacher', 'activeClasses'], queryFn: () => api.students.activeClasses() })
  const sessionName = useQuery({ queryKey: ['teacher', 'activeSession'], queryFn: () => api.students.activeSession() })
  const mine = useQuery({ queryKey: ['registrationRequests', 'mine'], queryFn: () => api.registrationRequests.list({ mine: true }) })

  const [form, setForm] = useState({ full_name: '', klass: '', guardian_name: '', guardian_phone: '', phone: '', address: '' })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const set = (k: keyof typeof form, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }))
  }

  const createMut = useMutation({
    mutationFn: () =>
      api.registrationRequests.create({
        full_name: form.full_name.trim(),
        klass: form.klass,
        session: sessionName.data || '',
        guardian_name: form.guardian_name.trim(),
        guardian_phone: form.guardian_phone.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      }),
    onSuccess: (row) => {
      setForm({ full_name: '', klass: '', guardian_name: '', guardian_phone: '', phone: '', address: '' })
      qc.invalidateQueries({ queryKey: ['registrationRequests'] })
      toast(`Submitted — ${row.full_name}’s registration is awaiting approval.`, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t submit — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string | undefined> = {}
    if (!form.full_name.trim()) next.full_name = 'Enter the student’s name.'
    if (!form.klass) next.klass = 'Choose a class.'
    if (!form.guardian_name.trim()) next.guardian_name = 'Enter the guardian’s name.'
    if (!form.guardian_phone.trim()) next.guardian_phone = 'Enter the guardian’s phone.'
    else if (!PHONE_RE.test(form.guardian_phone.trim())) next.guardian_phone = 'Enter a valid phone number.'
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone, or leave it blank.'
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    createMut.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Register a Student"
        subtitle="Submit a new student’s details for approval. When the admin approves, a permanent Student ID is created and the student’s first admission begins. Nothing is created until then."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New registration</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Give the student and guardian details. You can track the request’s status below until the admin reviews it.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={2}>
            <Field label="Student’s full name" error={errors.full_name}>
              <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="e.g. Ananya Bose" autoComplete="off" invalid={!!errors.full_name} />
            </Field>
            <Field label="Class" error={errors.klass}>
              <Select value={form.klass} onChange={(e) => set('klass', e.target.value)} invalid={!!errors.klass}>
                <option value="">{classes.isPending ? 'Loading…' : 'Select a class'}</option>
                {classes.data?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Guardian’s name" error={errors.guardian_name}>
              <Input value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} placeholder="e.g. Sujata Bose" autoComplete="off" invalid={!!errors.guardian_name} />
            </Field>
            <Field label="Guardian’s phone" error={errors.guardian_phone}>
              <Input type="tel" inputMode="tel" value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} placeholder="98300 00000" invalid={!!errors.guardian_phone} />
            </Field>
            <Field label={<>Student’s phone <span className="font-normal text-tertiary">· optional</span></>} error={errors.phone}>
              <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98300 00000" invalid={!!errors.phone} />
            </Field>
            <Field label="Session">
              <Input value={sessionName.data || '—'} disabled />
            </Field>
            <Field label={<>Address <span className="font-normal text-tertiary">· optional</span></>} className="sm:col-span-2">
              <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} placeholder="Locality, town" />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Submit for approval
            </Button>
          </div>
        </form>
      </CardPad>

      <Panel title="My submissions" count={mine.data?.length}>
        <Async query={mine} isEmpty={(d) => d.length === 0} empty={{ title: 'No submissions yet', sub: 'Registrations you submit appear here so you can follow their status.' }}>
          {(rows) => (
            <Stagger className="divide-y divide-separator">
              {rows.map((r) => (
                <StaggerItem key={r.id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{r.full_name}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        {r.klass} · {r.session} · guardian {r.guardian_name}
                        {r.guardian_phone ? ` (${r.guardian_phone})` : ''}
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        Submitted {fmtDate(r.created_at)}
                        {r.reviewed_at ? ` · reviewed ${fmtDate(r.reviewed_at)}` : ''}
                      </p>
                    </div>
                    <StatusPill kind="request" value={r.status} />
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
