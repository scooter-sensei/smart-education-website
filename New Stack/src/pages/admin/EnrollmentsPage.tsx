import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusPill } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm, type ConfirmFn } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/constants'
import { useOptimisticListMutation } from '@/lib/optimistic'
import type { ApiError, Enrollment, EnrollmentStatus } from '@/lib/types'

type Filter = '' | 'PENDING' | 'ACTIVE' | 'PENDING_DEACTIVATION' | 'INACTIVE'

function contextLine(e: Enrollment): string {
  switch (e.status) {
    case 'PENDING':
      return `Requested by ${e.requested_by || 'a teacher'} · ${fmtDate(e.created_at)}`
    case 'ACTIVE':
      return `Active since ${fmtDate(e.created_at)}`
    case 'PENDING_DEACTIVATION':
      return 'Winds down at the end of the current billing cycle'
    case 'INACTIVE':
      return `Ended ${fmtDate(e.reviewed_at || e.created_at)}`
    case 'REJECTED':
      return `Rejected ${fmtDate(e.reviewed_at || e.created_at)}`
    default:
      return fmtDate(e.created_at)
  }
}

export function EnrollmentsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()

  const [status, setStatus] = useState<Filter>('')
  const [q, setQ] = useState('')
  const [studentId, setStudentId] = useState('')
  const [tsId, setTsId] = useState('')
  const [errors, setErrors] = useState<{ student?: string; ts?: string }>({})
  const [reassigning, setReassigning] = useState<Enrollment | null>(null)

  const options = useQuery({ queryKey: ['enrollments', 'options'], queryFn: () => api.enrollments.options() })
  const query = useQuery({
    queryKey: ['enrollments', status || 'all'],
    queryFn: () => api.enrollments.list(status ? { status } : {}),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['enrollments'] })

  const filtered = useMemo(() => {
    const list = query.data ?? []
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter((e) =>
      [e.student, e.student_code, e.subject, e.teacher].some((f) => (f || '').toLowerCase().includes(needle)),
    )
  }, [query.data, q])

  const createMut = useMutation({
    mutationFn: () => api.enrollments.create({ student_id: studentId, ts_id: tsId }),
    onSuccess: (row) => {
      setStudentId('')
      setTsId('')
      if (status && status !== 'ACTIVE') setStatus('')
      invalidate()
      toast(`Enrollment created — ${row.student} · ${row.subject}.`, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t create the enrollment.', 'red'),
  })

  // Optimistic: every lifecycle action moves an enrollment OUT of any specific
  // status filter, so on a filtered view the row is dropped instantly (slides
  // off on click). On "All" the row stays and its pill updates after refetch.
  const lifecycleMut = useOptimisticListMutation<{ fn: () => Promise<unknown>; okMsg: string; id: number }, Enrollment>({
    mutationFn: ({ fn }) => fn(),
    targetKey: () => (status ? ['enrollments', status] : null),
    patch: (list, { id }) => list.filter((e) => e.id !== id),
    invalidate: [['enrollments']],
    onSuccess: (_r, v) => toast(v.okMsg),
    onError: (err) => toast(err?.message || 'That didn’t go through — try again.', 'red'),
  })

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!studentId) next.student = 'Choose a student.'
    if (!tsId) next.ts = 'Choose a teacher-subject.'
    setErrors(next)
    if (Object.keys(next).length) return
    createMut.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Enrollments"
        subtitle="An enrollment ties a student to one teacher for one subject — it’s what billing cycles hang off. Teachers request them and you approve; you can also enrol directly. Deactivating keeps billing through the current cycle, then stops, so nothing is cut off mid-cycle."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New enrollment</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Enrol an active student with a teacher for a subject. An enrollment you create here is active immediately and
          bills from the current cycle.
        </p>
        <form onSubmit={onCreate} noValidate>
          <FormGrid cols={2}>
            <Field label="Student" error={errors.student}>
              <Select
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value)
                  if (errors.student) setErrors((s) => ({ ...s, student: undefined }))
                }}
                invalid={!!errors.student}
              >
                <option value="">{options.isPending ? 'Loading…' : 'Select a student'}</option>
                {options.data?.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Teacher — subject" error={errors.ts}>
              <Select
                value={tsId}
                onChange={(e) => {
                  setTsId(e.target.value)
                  if (errors.ts) setErrors((s) => ({ ...s, ts: undefined }))
                }}
                invalid={!!errors.ts}
              >
                <option value="">{options.isPending ? 'Loading…' : 'Select teacher — subject'}</option>
                {options.data?.authorizations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Create enrollment
            </Button>
          </div>
        </form>
      </CardPad>

      <div className="flex items-center gap-2.5 flex-wrap">
        <SegmentedControl<Filter>
          options={[
            { value: '', label: 'All' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PENDING_DEACTIVATION', label: 'Ending' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
          value={status}
          onChange={setStatus}
        />
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, subject or teacher" />
      </div>

      <Panel title="Enrollments" count={query.isPending ? undefined : filtered.length}>
        <Async
          query={query}
          isEmpty={() => filtered.length === 0}
          empty={{ title: 'No enrollments match', sub: 'Adjust the filter or search above. New requests from teachers appear here as “Pending”.' }}
        >
          {() => (
            <Stagger className="divide-y divide-separator">
              {filtered.map((e) => (
                <StaggerItem key={e.id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={e.student} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{e.student}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Code>{e.student_code}</Code>
                        <span>· {e.subject} · {e.teacher}</span>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        {e.session} · {contextLine(e)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none flex-wrap justify-end">
                      <StatusPill kind="enrollment" value={e.status} />
                      <RowActions
                        e={e}
                        confirm={confirm}
                        onReassign={() => setReassigning(e)}
                        run={(fn, okMsg, id) => lifecycleMut.mutate({ fn, okMsg, id })}
                      />
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Async>
      </Panel>

      {reassigning && options.data && (
        <ReassignDialog
          enrollment={reassigning}
          authorizations={options.data.authorizations}
          onClose={() => setReassigning(null)}
          onDone={() => {
            invalidate()
            setReassigning(null)
          }}
        />
      )}
    </div>
  )
}

function RowActions({
  e,
  confirm,
  onReassign,
  run,
}: {
  e: Enrollment
  confirm: ConfirmFn
  onReassign: () => void
  run: (fn: () => Promise<unknown>, okMsg: string, id: number) => void
}) {
  const runRow = (fn: () => Promise<unknown>, okMsg: string) => run(fn, okMsg, e.id)
  const change = (
    <Button variant="gray" size="xs" onClick={onReassign}>
      Change
    </Button>
  )
  const confirmRun = async (
    dialog: Parameters<typeof confirm>[0],
    fn: () => Promise<unknown>,
    okMsg: string,
  ) => {
    const ok = await confirm(dialog)
    if (ok) runRow(fn, okMsg)
  }

  const map: Record<EnrollmentStatus, ReactNode> = {
    PENDING: (
      <>
        <Button
          variant="green-tinted"
          size="xs"
          onClick={() =>
            confirmRun(
              { title: 'Approve this enrollment?', body: `${e.student} is enrolled for ${e.subject} with ${e.teacher}, and billing starts from the current cycle.`, confirmLabel: 'Approve' },
              () => api.enrollments.approve(e.id),
              `${e.student} enrolled for ${e.subject}.`,
            )
          }
        >
          Approve
        </Button>
        <Button
          variant="red-tinted"
          size="xs"
          onClick={() =>
            confirmRun(
              { title: 'Reject this request?', body: `No enrollment is created for ${e.student}. The request is kept in history.`, confirmLabel: 'Reject', tone: 'danger' },
              () => api.enrollments.reject(e.id),
              `${e.student}’s request was rejected.`,
            )
          }
        >
          Reject
        </Button>
        {change}
      </>
    ),
    ACTIVE: (
      <>
        {change}
        <Button
          variant="red-tinted"
          size="xs"
          onClick={() =>
            confirmRun(
              { title: 'Deactivate this enrollment?', body: 'It keeps billing through the current cycle, then stops. You can cancel this any time before the cycle ends.', confirmLabel: 'Deactivate', tone: 'danger' },
              () => api.enrollments.deactivate(e.id),
              `${e.student}’s ${e.subject} enrollment will end after this cycle.`,
            )
          }
        >
          Deactivate
        </Button>
      </>
    ),
    PENDING_DEACTIVATION: (
      <>
        <Button
          variant="tinted"
          size="xs"
          onClick={() => runRow(() => api.enrollments.cancelDeactivation(e.id), `${e.student}’s ${e.subject} enrollment stays active.`)}
        >
          Keep active
        </Button>
        <Button
          variant="red-tinted"
          size="xs"
          onClick={() =>
            confirmRun(
              { title: 'End this enrollment now?', body: 'It stops immediately, before the current cycle ends. Its history is preserved.', confirmLabel: 'End now', tone: 'danger' },
              () => api.enrollments.end(e.id),
              `${e.student}’s ${e.subject} enrollment ended.`,
            )
          }
        >
          End now
        </Button>
      </>
    ),
    INACTIVE: (
      <Button
        variant="green-tinted"
        size="xs"
        onClick={() =>
          confirmRun(
            { title: 'Reactivate this enrollment?', body: `${e.student} is enrolled again for ${e.subject}, billing from the current cycle.`, confirmLabel: 'Reactivate' },
            () => api.enrollments.reactivate(e.id),
            `${e.student}’s ${e.subject} enrollment is active again.`,
          )
        }
      >
        Reactivate
      </Button>
    ),
    REJECTED: null,
  }
  return <>{map[e.status]}</>
}

function ReassignDialog({
  enrollment,
  authorizations,
  onClose,
  onDone,
}: {
  enrollment: Enrollment
  authorizations: { id: number; label: string; teacher: string; subject: string }[]
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [tsId, setTsId] = useState(String(enrollment.ts_id))
  const mut = useMutation({
    mutationFn: () => api.enrollments.changeAssignment(enrollment.id, tsId),
    onSuccess: (row) => {
      toast(`${row.student} reassigned to ${row.subject} with ${row.teacher}.`, 'green')
      onDone()
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t change — try again.', 'red'),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Change teacher — subject"
      description={
        <span className="flex items-center gap-1.5 flex-wrap">
          <Code>{enrollment.student_code}</Code>
          <span>
            {enrollment.student} is currently on {enrollment.subject} with {enrollment.teacher}. Reassign to a different
            authorised teacher-subject.
          </span>
        </span>
      }
      footer={
        <>
          <Button variant="gray" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
            Save change
          </Button>
        </>
      }
    >
      <Field label="Teacher — subject">
        <Select value={tsId} onChange={(e) => setTsId(e.target.value)}>
          {authorizations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  )
}
