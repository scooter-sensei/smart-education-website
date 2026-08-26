import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Select } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusPill } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/constants'
import { useDebounced } from '@/lib/useDebounced'
import { useOptimisticListMutation } from '@/lib/optimistic'
import type { ApiError, Enrollment } from '@/lib/types'

type Filter = '' | 'PENDING' | 'ACTIVE' | 'PENDING_DEACTIVATION' | 'INACTIVE'

function contextLine(e: Enrollment): string {
  switch (e.status) {
    case 'PENDING':
      return `Awaiting admin approval · requested ${fmtDate(e.created_at)}`
    case 'ACTIVE':
      return `Active since ${fmtDate(e.created_at)}`
    case 'PENDING_DEACTIVATION':
      return 'Ends after the current billing cycle'
    case 'INACTIVE':
      return `Ended ${fmtDate(e.reviewed_at || e.created_at)}`
    case 'REJECTED':
      return `Not approved · ${fmtDate(e.reviewed_at || e.created_at)}`
    default:
      return fmtDate(e.created_at)
  }
}

export function MyEnrollmentsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()

  const [status, setStatus] = useState<Filter>('')
  const [q, setQ] = useState('')
  const qDebounced = useDebounced(q)
  const [studentId, setStudentId] = useState('')
  const [tsId, setTsId] = useState('')
  const [errors, setErrors] = useState<{ student?: string; ts?: string }>({})

  const options = useQuery({ queryKey: ['enrollments', 'options'], queryFn: () => api.enrollments.options() })
  const subjects = useQuery({ queryKey: ['teacher', 'subjects'], queryFn: () => api.teacher.subjects() })
  const query = useQuery({
    queryKey: ['teacher', 'enrollments', status || 'all'],
    queryFn: () => api.teacher.enrollments(status ? { status } : {}),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['teacher', 'enrollments'] })

  const filtered = useMemo(() => {
    const list = query.data ?? []
    const needle = qDebounced.trim().toLowerCase()
    if (!needle) return list
    return list.filter((e) => [e.student, e.student_code, e.subject].some((f) => (f || '').toLowerCase().includes(needle)))
  }, [query.data, qDebounced])

  const requestMut = useMutation({
    mutationFn: () => api.teacher.requestEnrollment({ student_id: studentId, ts_id: tsId }),
    onSuccess: (row) => {
      setStudentId('')
      setTsId('')
      if (status && status !== 'PENDING') setStatus('')
      invalidate()
      toast(`Requested — ${row.student} · ${row.subject} is awaiting approval.`, 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t submit the request.', 'red'),
  })

  // Optimistic: cancelling/ending drops the row from the current filtered view
  // instantly (slides off on click); on "All" it stays and updates after refetch.
  const actionMut = useOptimisticListMutation<{ fn: () => Promise<unknown>; okMsg: string; id: number }, Enrollment>({
    mutationFn: ({ fn }) => fn(),
    targetKey: () => (status ? ['teacher', 'enrollments', status] : null),
    patch: (list, { id }) => list.filter((e) => e.id !== id),
    invalidate: [['teacher', 'enrollments']],
    onSuccess: (_r, v) => toast(v.okMsg),
    onError: (err) => toast(err?.message || 'That didn’t go through — try again.', 'red'),
  })

  function onRequest(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!studentId) next.student = 'Choose a student.'
    if (!tsId) next.ts = 'Choose a subject.'
    setErrors(next)
    if (Object.keys(next).length) return
    requestMut.mutate()
  }

  async function onCancel(e: Enrollment) {
    const ok = await confirm({
      title: 'Cancel this request?',
      body: `Your enrollment request for ${e.student} · ${e.subject} is withdrawn. You can request it again later.`,
      confirmLabel: 'Cancel request',
      tone: 'danger',
    })
    if (ok) actionMut.mutate({ fn: () => api.teacher.cancelRequest(e.id), okMsg: `Request for ${e.student} withdrawn.`, id: e.id })
  }
  async function onRequestEnd(e: Enrollment) {
    const ok = await confirm({
      title: 'Request to end this enrollment?',
      body: `${e.student}’s ${e.subject} enrollment keeps billing through the current cycle, then the admin ends it.`,
      confirmLabel: 'Request end',
      tone: 'danger',
    })
    if (ok)
      actionMut.mutate({ fn: () => api.teacher.requestDeactivation(e.id), okMsg: `End requested for ${e.student} · ${e.subject}.`, id: e.id })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Enrollments"
        subtitle="Your students, by subject. Request a new enrollment or ask to end one — the admin approves it, and billing starts or stops from there."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">Request an enrollment</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Pick an active student and one of your subjects. It’s submitted for admin approval and appears below as
          “Pending”.
        </p>
        <form onSubmit={onRequest} noValidate>
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
            <Field label="Subject" error={errors.ts}>
              <Select
                value={tsId}
                onChange={(e) => {
                  setTsId(e.target.value)
                  if (errors.ts) setErrors((s) => ({ ...s, ts: undefined }))
                }}
                invalid={!!errors.ts}
              >
                <option value="">{subjects.isPending ? 'Loading…' : 'Select a subject'}</option>
                {subjects.data?.map((s) => (
                  <option key={s.ts_id} value={s.ts_id}>
                    {s.subject}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={requestMut.isPending}>
              Request enrollment
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
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student or subject" />
      </div>

      <Panel title="Enrollments" count={query.isPending ? undefined : filtered.length}>
        <Async query={query} isEmpty={() => filtered.length === 0} empty={{ title: 'No enrollments match', sub: 'Adjust the filter or search above, or request an enrollment for one of your subjects.' }}>
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
                        <span>· {e.subject}</span>
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        {e.session} · {contextLine(e)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <StatusPill kind="enrollment" value={e.status} />
                      {e.status === 'PENDING' && (
                        <Button variant="gray" size="xs" onClick={() => onCancel(e)}>
                          Cancel request
                        </Button>
                      )}
                      {e.status === 'ACTIVE' && (
                        <Button variant="red-tinted" size="xs" onClick={() => onRequestEnd(e)}>
                          Request end
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
