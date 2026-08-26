import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, FormGrid, Input } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { ActivePill } from '@/components/ui/StatusPill'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import type { ApiError, Klass } from '@/lib/types'

export function ClassesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['classes'], queryFn: () => api.classes.list() })

  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [errors, setErrors] = useState<{ name?: string; level?: string }>({})

  const createMut = useMutation({
    mutationFn: () => api.classes.create({ name: name.trim(), level }),
    onSuccess: () => {
      setName('')
      setLevel('')
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast('Class added.', 'green')
    },
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t add the class.', 'red'),
  })

  const setActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.classes.setActive(id, active),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast(v.active ? 'Class reactivated.' : 'Class deactivated.')
    },
    onError: () => toast('Couldn’t update — try again.', 'red'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Enter a class name.'
    const n = Number(level)
    if (!level) next.level = 'Enter a level.'
    else if (!(n > 0) || n % 1 !== 0) next.level = 'Level must be a whole number above 0.'
    setErrors(next)
    if (Object.keys(next).length) return
    createMut.mutate()
  }

  async function onToggle(c: Klass) {
    if (c.is_active) {
      const ok = await confirm({
        title: 'Deactivate this class?',
        body: 'It can no longer be used for new admissions or fee configuration. Existing records are unaffected.',
        confirmLabel: 'Deactivate',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActiveMut.mutate({ id: c.id, active: !c.is_active })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Classes"
        subtitle="The reusable class master — used for student placement and fee configuration, kept across sessions. Deactivate rather than delete."
      />

      <CardPad>
        <h2 className="text-[16px] font-[650] tracking-[-0.01em]">New class</h2>
        <p className="text-[13.5px] text-secondary mt-1 mb-3.5 leading-snug">
          Add a class and its numeric level (used to order classes and suggest promotions).
        </p>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={2}>
            <Field label="Class name" htmlFor="cls-name" error={errors.name}>
              <Input
                id="cls-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((s) => ({ ...s, name: undefined }))
                }}
                placeholder="e.g. Class 7"
                autoComplete="off"
                invalid={!!errors.name}
              />
            </Field>
            <Field label="Level" htmlFor="cls-level" error={errors.level}>
              <Input
                id="cls-level"
                type="number"
                inputMode="numeric"
                min={1}
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value)
                  if (errors.level) setErrors((s) => ({ ...s, level: undefined }))
                }}
                placeholder="e.g. 7"
                invalid={!!errors.level}
              />
            </Field>
          </FormGrid>
          <div className="flex items-center gap-2.5 mt-4">
            <Button type="submit" disabled={createMut.isPending}>
              Add class
            </Button>
          </div>
        </form>
      </CardPad>

      <Panel title="All classes" count={query.data?.length}>
        <Async
          query={query}
          isEmpty={(d) => d.length === 0}
          empty={{ title: 'No classes yet', sub: 'Add your first class above.' }}
        >
          {(classes) => (
            <Stagger className="divide-y divide-separator">
              {classes.map((c) => (
                <StaggerItem key={c.id}>
                  <div className="flex items-center gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{c.name}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5">Level {c.level}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <ActivePill active={c.is_active} />
                      <Button
                        variant={c.is_active ? 'red-tinted' : 'tinted'}
                        size="xs"
                        onClick={() => onToggle(c)}
                        disabled={setActiveMut.isPending}
                      >
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
    </div>
  )
}
