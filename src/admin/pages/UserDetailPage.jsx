import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ErrorState, InlineAlert, SelectField, Skeleton, useToast } from '../../portal/ui';
import { fmtDate, fmtDateTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { roleName } from '../domain/model';
import { StatusBadge, ReasonDialog } from '../features/common';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;

export default function UserDetailPage() {
  const { userId } = useParams();
  const toast = useToast();
  const { data: u, error, loading, reload } = useAsync(() => adminServices.users.get(userId), [userId]);
  const [act, setAct] = useState(null);
  const [role, setRole] = useState('');
  const [note, setNote] = useState('');
  if (error) return <div className="space-y-4"><ErrorState error={error} onRetry={error.code === 'NOT_FOUND' ? undefined : reload} title={error.code === 'NOT_FOUND' ? 'User not found' : 'Could not load this user'} /><div className="text-center"><Button as={Link} to="/admin/users" variant="secondary">Back to users</Button></div></div>;
  if (loading || !u) return <Skeleton className="h-96" />;
  const done = (msg) => { notifyChanged(); toast.push({ title: msg, message: u.name }); setAct(null); reload(true); };
  const roleOptions = u.role === 'center' ? [['manager', 'Center manager'], ['advisor', 'Service advisor'], ['technician', 'Technician']] : u.role === 'admin' ? [['super', 'Super admin'], ['operations', 'Operations']] : null;
  const current = u.role === 'center' ? u.staffRole : u.adminLevel;
  return (
    <div className="space-y-6">
      <Card className="p-5"><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{roleName(u)}</Badge><Badge tone={u.status === 'deactivated' || u.status === 'suspended' || u.status === 'rejected' ? 'rose' : u.status === 'pending' ? 'amber' : 'green'}>{u.status}</Badge>{u.isSelf && <Badge>You</Badge>}</div><h2 className="mt-3 font-display text-2xl text-white">{u.name}</h2><p className="text-slate-400 [overflow-wrap:anywhere]">{u.email}</p></Card>
      {note && <InlineAlert tone="blue">{note}</InlineAlert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Profile" /><dl className="divide-y divide-white/10 px-5"><Row k="Phone">{u.phone}</Row><Row k="Role">{roleName(u)}</Row><Row k="Service center">{u.centerName}</Row><Row k="Registered">{u.createdAt ? fmtDate(u.createdAt) : null}</Row><Row k="Last sign-in">{u.lastSignInAt ? fmtDateTime(u.lastSignInAt) : null}</Row></dl><p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Passwords and tokens are never shown.</p></Card>
        <Card><CardHeader title="Account actions" /><div className="space-y-4 px-5 py-5">
          {u.isSelf ? <p className="text-sm text-slate-400">You cannot change your own account here.</p> : (
            <>
              <div className="flex flex-wrap gap-2">{u.status === 'deactivated' ? <Button size="sm" onClick={() => setAct({ kind: 'activate' })}>Activate account</Button> : <Button size="sm" variant="danger" onClick={() => setAct({ kind: 'deactivate' })}>Deactivate account</Button>}<Button size="sm" variant="secondary" onClick={async () => { try { const r = await adminServices.users.requestRecovery(u.id); setNote(r.note); reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Not done', message: e.message }); } }}>Request account recovery</Button></div>
              {roleOptions && <div className="flex flex-wrap items-end gap-2"><SelectField className="min-w-[12rem]" label="Change role" value={role || current} onChange={(e) => setRole(e.target.value)}>{roleOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectField><Button size="sm" variant="secondary" disabled={!role || role === current} onClick={() => setAct({ kind: 'role', role })}>Change role</Button></div>}
              <p className="text-xs text-slate-400">Deactivating keeps all bookings and records. The user is signed out and cannot sign in. Customer and driver roles are not changed here; drivers are approved in driver management.</p>
            </>
          )}</div></Card>
      </div>
      {u.history.length > 0 && <Card><CardHeader title="Related bookings and jobs" /><ul className="divide-y divide-white/10">{u.history.map((b) => <li key={b.id}><Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-white/5"><span className="text-sm font-semibold text-white">{b.reference}</span><span className="text-sm text-slate-300">{b.vehicle.registration}</span><span className="text-xs text-slate-400">{b.center.name}</span><span className="ml-auto"><StatusBadge statusKey={b.statusKey} /></span></Link></li>)}</ul></Card>}
      <Card><CardHeader title="Administrative history" /><ul className="divide-y divide-white/10">{u.audit.map((a) => <li key={a.id} className="px-5 py-3 text-sm"><span className="text-white">{a.action.replace(/\./g, ' ')}</span> <span className="text-slate-400">by {a.adminName}{a.reason ? `: ${a.reason}` : ''}</span><span className="block text-xs text-slate-400">{fmtDateTime(a.at)}</span></li>)}{!u.audit.length && <li className="px-5 py-5 text-center text-sm text-slate-400">No administrative actions recorded.</li>}</ul></Card>
      <ReasonDialog open={Boolean(act)} danger={act?.kind === 'deactivate'} title={act?.kind === 'activate' ? 'Activate this account?' : act?.kind === 'role' ? 'Change this role?' : 'Deactivate this account?'} confirmLabel={act?.kind === 'activate' ? 'Activate' : act?.kind === 'role' ? 'Change role' : 'Deactivate'} onClose={() => setAct(null)}
        body={act?.kind === 'role' ? <>Change <strong className="text-white">{u.name}</strong> from {roleName(u)} to the new role. This changes what they can do immediately.</> : act?.kind === 'activate' ? 'The user will be able to sign in again.' : 'The user is signed out and cannot sign in. Their records are kept.'}
        onConfirm={async (reason) => { if (act.kind === 'role') { await adminServices.users.changeRole(u.id, u.role === 'center' ? { staffRole: act.role } : { adminLevel: act.role }, reason); setRole(''); done('Role changed'); } else { await adminServices.users.setActive(u.id, act.kind === 'activate', reason); done(act.kind === 'activate' ? 'Account activated' : 'Account deactivated'); } }} />
    </div>
  );
}
