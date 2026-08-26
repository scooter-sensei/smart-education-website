import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/Card'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { Chip } from '@/components/ui/StatusPill'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { api } from '@/lib/api'
import { useDebounced } from '@/lib/useDebounced'

export function MyStudentsPage() {
  const [q, setQ] = useState('')
  const qDebounced = useDebounced(q)
  const query = useQuery({ queryKey: ['teacher', 'students'], queryFn: () => api.teacher.students() })

  const filtered = useMemo(() => {
    const list = query.data ?? []
    const needle = qDebounced.trim().toLowerCase()
    if (!needle) return list
    return list.filter((s) => s.student.toLowerCase().includes(needle) || s.student_code.toLowerCase().includes(needle))
  }, [query.data, qDebounced])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Students"
        subtitle="Students currently enrolled with you, across the subjects you teach. To enrol a new student or end an enrollment, use My Enrollments."
      />

      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or student ID" wrapClassName="w-full" />

      <Panel title="Roster" count={query.isPending ? undefined : filtered.length}>
        <Async query={query} isEmpty={() => filtered.length === 0} empty={{ title: 'No students match', sub: 'When the admin approves an enrollment for one of your subjects, that student appears here.' }}>
          {() => (
            <Stagger className="divide-y divide-separator">
              {filtered.map((s) => (
                <StaggerItem key={s.student_id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <Avatar name={s.student} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{s.student}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Code>{s.student_code}</Code>
                        {s.klass && <span>· {s.klass}</span>}
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        Guardian {s.guardian_name || '—'}
                        {s.guardian_phone ? ` · ${s.guardian_phone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-none flex-wrap justify-end max-w-[46%]">
                      {s.subjects.map((sub) => (
                        <Chip key={sub} tone="blue">
                          {sub}
                        </Chip>
                      ))}
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
