import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, useToast } from '../../portal/ui';
import { notifyChanged } from '../../portal/lib/events';
import { useAdmin } from '../layout/AdminContext';
import { ReasonDialog } from '../features/common';
import { useAdminList } from '../features/common2';

export const approvalTone = (c) => (c.status === 'suspended' ? 'rose' : c.approval === 'approved' ? 'green' : c.approval === 'pending' ? 'amber' : 'rose');
export const approvalLabel = (c) => (c.status === 'suspended' ? 'Suspended' : c.approval === 'approved' ? 'Approved' : c.approval === 'pending' ? 'Pending approval' : 'Rejected');

export default function ServiceCentersPage() {
  const { can, reload } = useAdmin();
  const toast = useToast();
  const [act, setAct] = useState(null);
  const l = useAdminList(() => adminServices.centers.list(), []);
  const run = async (c, kind, reason) => {
    if (kind === 'approve') await adminServices.centers.setApproval(c.id, 'approved', reason); if (kind === 'reject') await adminServices.centers.setApproval(c.id, 'rejected', reason);
    if (kind === 'suspend') await adminServices.centers.setStatus(c.id, 'suspended', reason); if (kind === 'reactivate') await adminServices.centers.setStatus(c.id, 'active', reason);
    notifyChanged(); reload(); toast.push({ title: `Center ${kind === 'approve' ? 'approved' : kind === 'reject' ? 'rejected' : kind === 'suspend' ? 'suspended' : 'reactivated'}`, message: c.name }); setAct(null); l.reload(true);
  };
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-slate-400">Only approved, active centers can receive bookings or operate in their portal. Suspending a center blocks its staff immediately. Records are kept.</p>
      {l.error && <ErrorState error={l.error} onRetry={l.reload} title="Could not load service centers" />}
      {l.loading && !l.data && <Skeleton className="h-48" />}
      {l.data && !l.data.length && <EmptyState icon={Building2} title="No service centers">Registrations appear here for review.</EmptyState>}
      {l.data && l.data.length > 0 && <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">{l.data.map((c) => (
        <li key={c.id}><Card className="h-full p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg text-white"><Link to={`/admin/service-centers/${c.id}`} className="hover:text-volt-glow">{c.name}</Link></h2><p className="text-sm text-slate-400">{c.address}</p></div><span className="flex flex-col items-end gap-1"><Badge tone={approvalTone(c)}>{approvalLabel(c)}</Badge>{c.application && <Badge tone="amber">New application</Badge>}{c.demo && <Badge tone="amber">Demo</Badge>}</span></div>
          <dl className="mt-3 grid grid-cols-4 gap-2 text-sm">{[['Staff', c.staff], ['Bookings', c.bookings], ['Open WOs', c.activeWorkOrders], ['Completed', c.completedJobs]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="font-display text-xl text-white">{v}</dd></div>)}</dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {can('centers.approve') && c.approval === 'pending' && <><Button size="sm" onClick={() => setAct({ c, kind: 'approve', optional: true })}>Approve</Button><Button size="sm" variant="danger" onClick={() => setAct({ c, kind: 'reject' })}>Reject</Button></>}
            {can('centers.approve') && c.approval === 'approved' && c.status === 'active' && <Button size="sm" variant="danger" onClick={() => setAct({ c, kind: 'suspend' })}>Suspend</Button>}
            {can('centers.approve') && c.status === 'suspended' && <Button size="sm" variant="secondary" onClick={() => setAct({ c, kind: 'reactivate' })}>Reactivate</Button>}
            {can('centers.approve') && c.approval === 'rejected' && <Button size="sm" variant="secondary" onClick={() => setAct({ c, kind: 'approve', optional: true })}>Approve</Button>}
            <Button as={Link} to={`/admin/service-centers/${c.id}`} size="sm" variant="ghost">Details</Button>
          </div></Card></li>))}</ul>}
      <ReasonDialog open={Boolean(act)} danger={act && ['reject', 'suspend'].includes(act.kind)} optional={act?.optional} title={act ? `${act.kind[0].toUpperCase()}${act.kind.slice(1)} ${act.c.name}?` : ''} confirmLabel={act ? act.kind[0].toUpperCase() + act.kind.slice(1) : ''} onClose={() => setAct(null)}
        body={act && ({ approve: 'The center can then receive bookings and use its portal.', reject: 'The application is marked as not approved. The center cannot take bookings.', suspend: 'The center is blocked from its portal and hidden from customers immediately. Existing records are kept.', reactivate: 'The center can operate again.' })[act.kind]} onConfirm={(reason) => run(act.c, act.kind, reason)} />
    </div>
  );
}
