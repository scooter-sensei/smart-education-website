import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { ActivePill } from '@/components/ui/StatusPill'
import { Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import type { ApiError, Subject } from '@/lib/types'

export function SubjectsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['subjects'], queryFn: () => api.subjects.list() })

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})

  const createMut = useMutation({
    mutationFn: () => api.subjects.create({ code: code.trim(), name: name.trim() }),
    onSuccess: () => {
      setCode('')
      setName('')
      qc.invalidateQueries({ queryKey: ['subjects'] })
      toast('Subject added.', 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t add the subject.', 'red'),
  })
  const setActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.subjects.setActive(id, active),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['subjects'] })
      toast(v.active ? 'Subject reactivated.' : 'Subject deactivated.')
    },
    onError: () => toast('Couldn’t update — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!code.trim()) next.code = 'Enter a subject code.'
    else if (!/^[A-Za-z0-9]{2,10}$/.test(code.trim())) next.code = 'Use 2–10 letters or digits, no spaces.'
    if (!name.trim()) next.name = 'Enter a subject name.'
    setErrors(next)
    if (Object.keys(next).length) return
    createMut.mutate()
  }

  async function onToggle(s: Subject) {
    if (s.is_active) {
      const ok = await confirm({
        title: 'Deactivate this subject?',
        body: 'It can’t be used for new teacher assignments or enrollments. Existing enrollments and history are unaffected.',
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActiveMut.mutate({ id: s.id, active: !s.is_active })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subjects"
        subtitle="The reusable subject master. A subject can be taught by several teachers and priced per class. Deactivate rather than delete — historical references stay valid."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New subject</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          A short code (like <Code>MATH</Code>) and a display name.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-[0.7fr_1.4fr]">
            <Field label="Code" htmlFor="sub-code" error={errors.code}>
              <Input
                id="sub-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (errors.code) setErrors((s) => ({ ...s, code: undefined }))
                }}
                placeholder="e.g. CHEM"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                invalid={!!errors.code}
              />
            </Field>
            <Field label="Subject name" htmlFor="sub-name" error={errors.name}>
              <Input
                id="sub-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((s) => ({ ...s, name: undefined }))
                }}
                placeholder="e.g. Chemistry"
                autoComplete="off"
                invalid={!!errors.name}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Add subject
            </Button>
          </div>
        </form>
      </CardPad>

      <Panel title="All subjects" count={query.data?.length}>
        <Async query={query} isEmpty={(d) => d.length === 0} empty={{ title: 'No subjects yet', sub: 'Add your first subject above.' }}>
          {(subjects) => (
            <Stagger className="divide-y divide-separator">
              {subjects.map((s) => (
                <StaggerItem key={s.id}>
                  <div className="flex items-center gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{s.name}</p>
                      <p className="mt-1">
                        <Code>{s.code}</Code>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <ActivePill active={s.is_active} />
                      <Button variant={s.is_active ? 'red-tinted' : 'tinted'} size="xs" onClick={() => onToggle(s)}>
                        {s.is_active ? 'Deactivate' : 'Reactivate'}
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
