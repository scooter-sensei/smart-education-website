import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusPill } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { useOptimisticListMutation } from '@/lib/optimistic'
import type { ApiError, Student } from '@/lib/types'

type StatusFilter = '' | 'ACTIVE' | 'WITHDRAWN'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_RE = /^[0-9+\-\s]{7,15}$/

export function StudentsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()

  const [status, setStatus] = useState<StatusFilter>('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Student | null>(null)
  const [readmitting, setReadmitting] = useState<Student | null>(null)

  const query = useQuery({
    queryKey: ['students', status || 'all'],
    queryFn: () => api.students.list(status ? { status } : {}),
  })
  const classes = useQuery({ queryKey: ['students', 'activeClasses'], queryFn: () => api.students.activeClasses() })
  const activeSession = useQuery({ queryKey: ['students', 'activeSession'], queryFn: () => api.students.activeSession() })

  const filtered = useMemo(() => {
    const list = query.data ?? []
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter(
      (s) => s.full_name.toLowerCase().includes(needle) || s.student_code.toLowerCase().includes(needle),
    )
  }, [query.data, q])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['students'] })

  // Optimistic: withdrawing on the Active filter drops the row instantly so it
  // slides off on click; on All it stays (status flips after refetch).
  const withdrawMut = useOptimisticListMutation<Student, Student>({
    mutationFn: (s) => api.students.withdraw(s.id),
    targetKey: () => (status === 'ACTIVE' ? ['students', 'ACTIVE'] : null),
    patch: (list, s) => list.filter((x) => x.id !== s.id),
    invalidate: [['students']],
    onSuccess: (_r, s) => toast(`${s.full_name} was withdrawn.`),
    onError: () => toast('Couldn’t withdraw — try again.', 'red'),
  })

  async function onWithdraw(s: Student) {
    const ok = await confirm({
      title: `Withdraw ${s.full_name}?`,
      body: 'They’re marked withdrawn and stop being billed. Enrollments, attendance and payment history are preserved, and you can re-admit them later.',
      confirmLabel: 'Withdraw',
      tone: 'danger',
    })
    if (ok) withdrawMut.mutate(s)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Students"
        subtitle="Every student began as an approved registration — their code is permanent and never reused. Withdrawing stops billing but keeps all history; re-admitting opens a fresh admission in the current session."
      />

      <div className="flex items-center gap-2.5 flex-wrap">
        <SegmentedControl<StatusFilter>
          options={[
            { value: '', label: 'All' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'WITHDRAWN', label: 'Withdrawn' },
          ]}
          value={status}
          onChange={setStatus}
        />
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or student ID"
          aria-label="Search students by name or ID"
        />
      </div>

      <Panel title="Roster" count={query.isPending ? undefined : filtered.length}>
        <Async
          query={query}
          isEmpty={() => filtered.length === 0}
          empty={{ title: 'No students match', sub: 'Adjust the filter or search above. New students appear here once you approve a registration request.' }}
        >
          {() => (
            <Stagger className="divide-y divide-separator">
              {filtered.map((s) => (
                <StaggerItem key={s.id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={s.full_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{s.full_name}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Code>{s.student_code}</Code>
                        <span>· {s.klass} · {s.session}</span>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        Guardian {s.guardian_name || '—'}
                        {s.guardian_phone ? ` · ${s.guardian_phone}` : ''}
                        {s.phone ? ` · student ${s.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none flex-wrap justify-end">
                      <StatusPill kind="admission" value={s.status} />
                      <Button variant="gray" size="xs" onClick={() => setEditing(s)}>
                        Edit
                      </Button>
                      {s.status === 'ACTIVE' ? (
                        <Button variant="red-tinted" size="xs" onClick={() => onWithdraw(s)}>
                          Withdraw
                        </Button>
                      ) : (
                        <Button variant="green-tinted" size="xs" onClick={() => setReadmitting(s)}>
                          Re-admit
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

      {editing && (
        <EditStudentDialog
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate()
            setEditing(null)
          }}
        />
      )}
      {readmitting && (
        <ReadmitDialog
          student={readmitting}
          classes={classes.data ?? []}
          sessionName={activeSession.data ?? readmitting.session}
          onClose={() => setReadmitting(null)}
          onDone={() => {
            invalidate()
            setReadmitting(null)
          }}
        />
      )}
    </div>
  )
}

/* ---- Edit profile (contact + guardian; code/class/session change through admission) ---- */
function EditStudentDialog({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    full_name: student.full_name,
    phone: student.phone,
    email: student.email,
    guardian_name: student.guardian_name,
    guardian_phone: student.guardian_phone,
    address: student.address,
  })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const set = (k: keyof typeof form, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }))
  }

  const mut = useMutation({
    mutationFn: () =>
      api.students.updateProfile(student.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        guardian_name: form.guardian_name.trim(),
        guardian_phone: form.guardian_phone.trim(),
        address: form.address.trim(),
      }),
    onSuccess: () => {
      toast(`Saved ${form.full_name || 'student'}’s details.`, 'green')
      onSaved()
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t save — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string | undefined> = {}
    if (!form.full_name.trim()) next.full_name = 'Enter the student’s name.'
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone, or leave it blank.'
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = 'That doesn’t look like an email address.'
    if (form.guardian_phone.trim() && !PHONE_RE.test(form.guardian_phone.trim()))
      next.guardian_phone = 'Enter a valid phone, or leave it blank.'
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    mut.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Edit student"
      description={
        <span className="flex items-center gap-1.5 flex-wrap">
          <Code>{student.student_code}</Code>
          <span>· {student.klass} · {student.session}. Class and session change through admission, not here.</span>
        </span>
      }
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
      <form onSubmit={onSubmit} noValidate>
        <FormGrid cols={2}>
          <Field label="Full name" error={errors.full_name}>
            <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} invalid={!!errors.full_name} autoComplete="off" />
          </Field>
          <Field label="Student phone · optional" error={errors.phone}>
            <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98300 00000" invalid={!!errors.phone} />
          </Field>
          <Field label="Email · optional" error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" autoCapitalize="off" spellCheck={false} invalid={!!errors.email} />
          </Field>
          <Field label="Guardian name">
            <Input value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Guardian phone · optional" error={errors.guardian_phone}>
            <Input type="tel" inputMode="tel" value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} placeholder="98300 00000" invalid={!!errors.guardian_phone} />
          </Field>
          <Field label="Address · optional" className="sm:col-span-2">
            <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} placeholder="Locality, town" />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  )
}

/* ---- Re-admit (choose class; session is the current one) ---- */
function ReadmitDialog({
  student,
  classes,
  sessionName,
  onClose,
  onDone,
}: {
  student: Student
  classes: string[]
  sessionName: string
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [klass, setKlass] = useState(student.klass)
  const mut = useMutation({
    mutationFn: () => api.students.readmit(student.id, { klass }),
    onSuccess: () => {
      toast(`${student.full_name} re-admitted to ${klass}.`, 'green')
      onDone()
    },
    onError: () => toast('Couldn’t re-admit — try again.', 'red'),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={`Re-admit ${student.full_name}?`}
      description={
        <span className="flex items-center gap-1.5 flex-wrap">
          <Code>{student.student_code}</Code>
          <span>opens a fresh admission in the current session. Confirm the class they’re re-joining.</span>
        </span>
      }
      footer={
        <>
          <Button variant="gray" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="green" size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
            Re-admit
          </Button>
        </>
      }
    >
      <FormGrid cols={2}>
        <Field label="Class">
          <Select value={klass} onChange={(e) => setKlass(e.target.value)}>
            {(classes.length ? classes : [student.klass]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Session">
          <Input value={sessionName} disabled />
        </Field>
      </FormGrid>
    </Modal>
  )
}
