import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CardPad, PageHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { Avatar, Code } from '@/components/ui/bits'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/constants'
import type { ApiError, AttendanceStatus } from '@/lib/types'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function AttendancePage() {
  const { toast } = useToast()
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  const monthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`
  const thisMonth = todayStr.slice(0, 7)

  const [date, setDate] = useState(todayStr)
  const [tsId, setTsId] = useState('')
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({})

  const subjects = useQuery({ queryKey: ['teacher', 'subjects'], queryFn: () => api.teacher.subjects() })
  const roster = useQuery({
    queryKey: ['teacher', 'attendanceRoster', date, tsId],
    queryFn: () => api.teacher.attendanceRoster({ date, ts_id: tsId }),
  })

  // seed marks from the roster (default PRESENT when unmarked)
  useEffect(() => {
    if (!roster.data) return
    const seed: Record<number, AttendanceStatus> = {}
    roster.data.forEach((r) => (seed[r.enrollment_id] = r.status ?? 'PRESENT'))
    setMarks(seed)
  }, [roster.data])

  const locked = date.slice(0, 7) !== thisMonth
  const rows = roster.data ?? []
  const tally = useMemo(() => {
    let present = 0
    let absent = 0
    rows.forEach((r) => (marks[r.enrollment_id] === 'ABSENT' ? absent++ : present++))
    return { present, absent }
  }, [rows, marks])

  const saveMut = useMutation({
    mutationFn: () => {
      const list = rows.map((r) => ({ enrollment_id: r.enrollment_id, status: marks[r.enrollment_id] ?? 'PRESENT' }))
      return api.teacher.attendanceSave({ date, marks: list })
    },
    onSuccess: (res) => toast(`Saved ${fmtDate(res.date)} — ${res.present} present, ${res.absent} absent.`, 'green'),
    onError: (err: ApiError) => toast(err?.message || 'Couldn’t save — try again.', 'red'),
  })

  function markAll(status: AttendanceStatus) {
    const next: Record<number, AttendanceStatus> = {}
    rows.forEach((r) => (next[r.enrollment_id] = status))
    setMarks(next)
  }

  const subjectOptions = [{ ts_id: '', subject: 'All' }, ...(subjects.data ?? []).map((s) => ({ ts_id: String(s.ts_id), subject: s.subject }))]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        subtitle="Mark who attended, by date and subject. You can record or amend any date in the current month — earlier months are locked, so the register stays settled once a month closes."
      />

      <CardPad>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input type="date" value={date} min={monthStart} max={todayStr} onChange={(e) => setDate(e.target.value || todayStr)} />
          </Field>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-secondary mb-1.5 ml-0.5">Subject</span>
            <div className="flex gap-[2px] bg-fill rounded-[11px] p-[3px] overflow-x-auto no-scrollbar self-start max-w-full">
              {subjectOptions.map((o) => {
                const on = o.ts_id === tsId
                return (
                  <button
                    key={o.ts_id || 'all'}
                    type="button"
                    onClick={() => setTsId(o.ts_id)}
                    className={cn(
                      'px-[15px] py-2 text-[13px] font-semibold rounded-lg whitespace-nowrap transition-colors active:scale-[0.97]',
                      on ? 'bg-card text-label shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-secondary hover:text-label',
                    )}
                  >
                    {o.subject}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {locked && (
          <p className="mt-3 text-[13px] font-medium text-orange bg-tint-orange px-3 py-2.5 rounded-[10px] leading-snug">
            This date is outside the current month, so the register is locked. Only the current month can be edited.
          </p>
        )}
      </CardPad>

      <Panel title={`Roster · ${fmtDate(date)}`} count={roster.isPending ? undefined : rows.length}>
        <Async query={roster} isEmpty={() => rows.length === 0} empty={{ title: 'No students to mark', sub: 'You have no active enrollments for this subject. Enrolled students show up here to mark present or absent.' }}>
          {() => (
            <>
              <Stagger className={cn('divide-y divide-separator', locked && 'opacity-60 pointer-events-none')}>
                {rows.map((r) => {
                  const status = marks[r.enrollment_id] ?? 'PRESENT'
                  return (
                    <StaggerItem key={r.enrollment_id}>
                      <div className="flex items-center gap-3 px-[18px] py-3">
                        <Avatar name={r.student} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{r.student}</p>
                          <p className="text-[13.5px] text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <Code>{r.student_code}</Code>
                            <span>· {r.subject}</span>
                          </p>
                        </div>
                        <div className="flex gap-[2px] bg-fill rounded-[11px] p-[3px] flex-none">
                          {(['PRESENT', 'ABSENT'] as const).map((v) => {
                            const on = status === v
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setMarks((m) => ({ ...m, [r.enrollment_id]: v }))}
                                className={cn(
                                  'px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-colors active:scale-[0.97]',
                                  on
                                    ? v === 'PRESENT'
                                      ? 'bg-card text-green shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                                      : 'bg-card text-red shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                                    : 'text-secondary hover:text-label',
                                )}
                              >
                                {v === 'PRESENT' ? 'Present' : 'Absent'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </StaggerItem>
                  )
                })}
              </Stagger>

              {rows.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap px-[18px] py-3 border-t border-separator">
                  <span className="text-[13px] text-secondary tnum">
                    <b className="text-label font-[650]">{tally.present}</b> present ·{' '}
                    <b className="text-label font-[650]">{tally.absent}</b> absent
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="gray" size="sm" onClick={() => markAll('PRESENT')} disabled={locked}>
                      All present
                    </Button>
                    <Button size="sm" onClick={() => saveMut.mutate()} disabled={locked || saveMut.isPending}>
                      Save attendance
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Async>
      </Panel>
    </div>
  )
}
