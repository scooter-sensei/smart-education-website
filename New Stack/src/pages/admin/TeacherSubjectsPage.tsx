import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Select } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import type { ApiError, TeacherSubject } from '@/lib/types'

export function TeacherSubjectsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['teacherSubjects'], queryFn: () => api.teacherSubjects.list() })
  const options = useQuery({ queryKey: ['teacherSubjects', 'options'], queryFn: () => api.teacherSubjects.options() })

  const [teacherId, setTeacherId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [errors, setErrors] = useState<{ teacher?: string; subject?: string }>({})
  const invalidate = () => qc.invalidateQueries({ queryKey: ['teacherSubjects'] })

  const createMut = useMutation({
    mutationFn: () => api.teacherSubjects.create({ teacher_id: teacherId, subject_id: subjectId }),
    onSuccess: () => {
      setTeacherId('')
      setSubjectId('')
      invalidate()
      toast('Teacher authorized.', 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t authorize — try again.', 'red'),
  })
  const setActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.teacherSubjects.setActive(id, active),
    onSuccess: (_r, v) => {
      invalidate()
      toast(v.active ? 'Authorization restored.' : 'Authorization removed.')
    },
    onError: () => toast('Couldn’t update — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!teacherId) next.teacher = 'Choose a teacher.'
    if (!subjectId) next.subject = 'Choose a subject.'
    setErrors(next)
    if (Object.keys(next).length) return
    createMut.mutate()
  }

  async function onToggle(x: TeacherSubject) {
    if (x.is_active) {
      const ok = await confirm({
        title: 'Remove this authorization?',
        body: 'The teacher can no longer be assigned to new enrollments for this subject. Enrollments that already used it are unaffected.',
        confirmLabel: 'Remove',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActiveMut.mutate({ id: x.id, active: !x.is_active })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teacher – Subject Authorisation"
        subtitle="Authorise a teacher to teach a subject. Only authorised teacher-subject pairs can be used when creating enrollments. Removing an authorisation never affects enrollments that already used it."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">Authorise a teacher</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Pick an active teacher and an active subject. A teacher can be authorised for many subjects.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={2}>
            <Field label="Teacher" htmlFor="ts-teacher" error={errors.teacher}>
              <Select
                id="ts-teacher"
                value={teacherId}
                onChange={(e) => {
                  setTeacherId(e.target.value)
                  if (errors.teacher) setErrors((s) => ({ ...s, teacher: undefined }))
                }}
                invalid={!!errors.teacher}
              >
                <option value="">{options.isPending ? 'Loading teachers…' : 'Select a teacher…'}</option>
                {options.data?.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="ts-subject" error={errors.subject}>
              <Select
                id="ts-subject"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  if (errors.subject) setErrors((s) => ({ ...s, subject: undefined }))
                }}
                invalid={!!errors.subject}
              >
                <option value="">{options.isPending ? 'Loading subjects…' : 'Select a subject…'}</option>
                {options.data?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Authorise
            </Button>
          </div>
        </form>
      </CardPad>

      <Panel title="All authorisations" count={query.data?.length}>
        <Async query={query} isEmpty={(d) => d.length === 0} empty={{ title: 'No authorisations yet', sub: 'Authorise a teacher for a subject above to get started.' }}>
          {(rows) => (
            <Stagger className="divide-y divide-separator">
              {rows.map((x) => (
                <StaggerItem key={x.id}>
                  <div className="flex items-center gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{x.teacher}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5">Authorised for {x.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className={cn('pill', x.is_active ? 'pill-green' : 'pill-gray')}>
                        {x.is_active ? 'Active' : 'Removed'}
                      </span>
                      <Button variant={x.is_active ? 'red-tinted' : 'tinted'} size="xs" onClick={() => onToggle(x)}>
                        {x.is_active ? 'Remove' : 'Restore'}
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
