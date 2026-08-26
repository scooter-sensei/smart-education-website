import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Panel } from '@/components/ui/Panel'
import { StatusPill } from '@/components/ui/StatusPill'
import { Async, Stagger, StaggerItem } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/constants'
import { useOptimisticListMutation } from '@/lib/optimistic'
import type { RegistrationRequest } from '@/lib/types'

const todayISO = () => new Date().toISOString().slice(0, 10)

export function RegistrationRequestsPage() {
  const { toast } = useToast()
  const confirm = useConfirm()

  const all = useQuery({ queryKey: ['registrationRequests'], queryFn: () => api.registrationRequests.list() })
  const pending = (all.data ?? []).filter((r) => r.status === 'PENDING')
  const reviewed = (all.data ?? []).filter((r) => r.status !== 'PENDING')

  // Optimistic: flip the request's status in the single cached list so it slides
  // out of the Pending panel on click and appears in Recently reviewed.
  const approveMut = useOptimisticListMutation({
    mutationFn: (id: number) => api.registrationRequests.approve(id),
    targetKey: () => ['registrationRequests'],
    patch: (list: RegistrationRequest[], id: number) =>
      list.map((r) => (r.id === id ? { ...r, status: 'APPROVED' as const, reviewed_at: todayISO() } : r)),
    invalidate: [['registrationRequests'], ['students']],
    onSuccess: (res) => toast(`Approved — ${res.student_code} created.`, 'green'),
    onError: (err) => toast(err?.message || 'Couldn’t approve — try again.', 'red'),
  })
  const rejectMut = useOptimisticListMutation({
    mutationFn: (id: number) => api.registrationRequests.reject(id),
    targetKey: () => ['registrationRequests'],
    patch: (list: RegistrationRequest[], id: number) =>
      list.map((r) => (r.id === id ? { ...r, status: 'REJECTED' as const, reviewed_at: todayISO() } : r)),
    invalidate: [['registrationRequests']],
    onSuccess: () => {
      toast('Request rejected.')
    },
    onError: (err) => toast(err?.message || 'Couldn’t reject — try again.', 'red'),
  })

  async function onApprove(r: RegistrationRequest) {
    const ok = await confirm({
      title: 'Approve this registration?',
      body: `This creates a permanent Student ID for ${r.full_name} and their first admission. The ID is never reused, and this can’t be undone.`,
      confirmLabel: 'Approve',
    })
    if (ok) approveMut.mutate(r.id)
  }
  async function onReject(r: RegistrationRequest) {
    const ok = await confirm({
      title: 'Reject this request?',
      body: `No student is created for ${r.full_name}. The request is kept in history.`,
      confirmLabel: 'Reject',
      tone: 'danger',
    })
    if (ok) rejectMut.mutate(r.id)
  }

  const busy = approveMut.isPending || rejectMut.isPending

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registration Requests"
        subtitle="Teachers submit new-student intakes here. Approving one creates a permanent, never-reused Student ID and the student’s first admission. Rejecting creates nothing."
      />

      <Panel title="Pending approval" count={all.isPending ? undefined : pending.length}>
        <Async
          query={all}
          isEmpty={() => pending.length === 0}
          empty={{ icon: 'check', title: 'No pending registrations', sub: 'When a teacher submits a new-student request, it appears here for your approval.' }}
        >
          {() => (
            <Stagger className="divide-y divide-separator">
              {pending.map((r) => (
                <StaggerItem key={r.id}>
                  <div className="flex items-start gap-3 px-[18px] py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{r.full_name}</p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        {r.klass} · {r.session} · guardian {r.guardian_name} ({r.guardian_phone})
                      </p>
                      <p className="text-[13.5px] text-secondary mt-0.5">
                        Requested by {r.requested_by} · {fmtDate(r.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <Button variant="green-tinted" size="xs" onClick={() => onApprove(r)} disabled={busy}>
                        Approve
                      </Button>
                      <Button variant="red-tinted" size="xs" onClick={() => onReject(r)} disabled={busy}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Async>
      </Panel>

      <Panel title="Recently reviewed" count={all.isPending ? undefined : reviewed.length}>
        <Async
          query={all}
          isEmpty={() => reviewed.length === 0}
          empty={{ title: 'Nothing reviewed yet', sub: 'Approved and rejected requests will be listed here for the record.' }}
        >
          {() => (
            <div className="divide-y divide-separator">
              {reviewed.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-[18px] py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[16.5px] font-[590] tracking-[-0.01em]">{r.full_name}</p>
                    <p className="text-[13.5px] text-secondary mt-0.5">
                      {r.klass} · {r.session} · reviewed {fmtDate(r.reviewed_at)}
                    </p>
                  </div>
                  <StatusPill kind="request" value={r.status} />
                </div>
              ))}
            </div>
          )}
        </Async>
      </Panel>
    </div>
  )
}
