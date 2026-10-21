import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, Card, EmptyState, ErrorState, InlineAlert, Skeleton, useToast } from '../../portal/ui';
import { notifyChanged } from '../../portal/lib/events';
import { useAdmin } from '../layout/AdminContext';
import { Chips, ReasonDialog } from '../features/common';
import { SearchBox, useAdminList } from '../features/common2';

const TABS = [{ key: 'all', label: 'All' }, { key: 'pending', label: 'Pending approval' }, { key: 'approved', label: 'Approved' }, { key: 'suspended', label: 'Suspended' }, { key: 'rejected', label: 'Rejected' }, { key: 'deactivated', label: 'Deactivated' }];
const TONE = { approved: 'green', pending: 'amber', suspended: 'rose', rejected: 'rose', deactivated: 'slate' };

export default function DriversPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [act, setAct] = useState(null);
  const l = useAdminList(() => adminServices.drivers.list({ status, query: text }), [status, text]);
  const decide = async (d, decision, reason) => { await adminServices.drivers.setApproval(d.id, decision, reason); notifyChanged(); toast.push({ title: `Driver ${decision}`, message: d.name }); setAct(null); l.reload(true); };
  const direct = async (d, decision) => { try { await adminServices.drivers.setApproval(d.id, decision, ''); notifyChanged(); toast.push({ title: `Driver ${decision}`, message: d.name }); l.reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Not done', message: e.message }); } };
  return (
    <div className="space-y-5">
      <InlineAlert tone="blue">Approval is separate from sign-in. Only approved drivers can see or take assignments. Identity, licence and background verification are not part of this build, so no verification status is shown.</InlineAlert>
      <SearchBox value={text} onChange={setText} placeholder="Driver name or email" label="Search drivers" />
      <Chips options={TABS} value={status} onChange={setStatus} label="Driver status" />
      {l.error && <ErrorState error={l.error} onRetry={l.reload} title="Could not load drivers" />}
      {l.loading && !l.data && <Skeleton className="h-48" />}
      {l.data && !l.data.length && <EmptyState icon={ShieldCheck} title="No drivers match">Driver registrations appear here for review.</EmptyState>}
      {l.data && l.data.length > 0 && <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">{l.data.map((d) => (
        <li key={d.id}><Card className="h-full p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-display text-lg text-white">{d.name}</h2><p className="text-sm text-slate-400 [overflow-wrap:anywhere]">{d.email}{d.phone ? ` · ${d.phone}` : ''}</p></div><Badge tone={TONE[d.status]}>{d.status}</Badge></div>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-slate-400">Availability</dt><dd className="text-white">{d.availability === 'on_job' ? 'On a job' : d.availability}</dd></div><div><dt className="text-xs text-slate-400">Active jobs</dt><dd className="font-display text-xl text-white">{d.activeJobs}</dd></div><div><dt className="text-xs text-slate-400">Completed</dt><dd className="font-display text-xl text-white">{d.completedJobs}</dd></div></dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {can('drivers.approve') && d.approval === 'pending' && <><Button size="sm" onClick={() => direct(d, 'approved')}>Approve</Button><Button size="sm" variant="danger" onClick={() => setAct({ d, decision: 'rejected' })}>Reject</Button></>}
            {can('drivers.approve') && d.approval === 'approved' && <Button size="sm" variant="danger" onClick={() => setAct({ d, decision: 'suspended' })}>Suspend</Button>}
            {can('drivers.approve') && ['suspended', 'rejected'].includes(d.approval) && <Button size="sm" variant="secondary" onClick={() => direct(d, 'approved')}>{d.approval === 'suspended' ? 'Reactivate' : 'Approve'}</Button>}
            {can('users.manage') && <Button as={Link} to={`/admin/users/${d.id}`} size="sm" variant="ghost">Profile and history</Button>}
          </div></Card></li>))}</ul>}
      <ReasonDialog open={Boolean(act)} danger title={act ? `${act.decision === 'suspended' ? 'Suspend' : 'Reject'} ${act.d.name}?` : ''} confirmLabel={act?.decision === 'suspended' ? 'Suspend driver' : 'Reject driver'} onClose={() => setAct(null)}
        body={act && (act.decision === 'suspended' ? 'A suspended driver cannot see or take assignments. Existing records are kept.' : 'The application will be marked as not approved. The driver cannot take assignments.')} onConfirm={(reason) => decide(act.d, act.decision, reason)} />
    </div>
  );
}
