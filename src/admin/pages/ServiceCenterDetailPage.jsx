import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ErrorState, InlineAlert, Skeleton, TextAreaField, TextField, useToast } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { STAFF_LABEL } from '../domain/model';
import { StatusBadge } from '../features/common';
import { approvalLabel, approvalTone } from './ServiceCentersPage';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;

export default function ServiceCenterDetailPage() {
  const { centerId } = useParams();
  const toast = useToast();
  const { data: c, error, loading, reload } = useAsync(() => adminServices.centers.get(centerId), [centerId]);
  const [f, setF] = useState({ contact: '', hours: '', reason: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (c) setF({ contact: c.contact || '', hours: c.hours || '', reason: '' }); }, [c]);
  if (error) return <div className="space-y-4"><ErrorState error={error} onRetry={reload} title="Could not load this service center" /><div className="text-center"><Button as={Link} to="/admin/service-centers" variant="secondary">Back</Button></div></div>;
  if (loading || !c) return <Skeleton className="h-96" />;
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await adminServices.centers.updateInfo(c.id, f, f.reason); notifyChanged(); toast.push({ title: 'Center updated' }); reload(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <div className="space-y-6">
      <Card className="p-5"><div className="flex flex-wrap items-center gap-2"><Badge tone={approvalTone(c)}>{approvalLabel(c)}</Badge>{c.demo && <Badge tone="amber">Demo</Badge>}</div><h2 className="mt-3 font-display text-2xl text-white">{c.name}</h2><p className="text-slate-300">{c.address}</p></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Staff accounts" /><ul className="divide-y divide-white/10">{c.staff.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span className="min-w-0"><span className="block text-white">{s.name}</span><span className="text-xs text-slate-400 [overflow-wrap:anywhere]">{s.email}</span></span><span className="flex gap-2"><Badge tone="blue">{STAFF_LABEL[s.staffRole]}</Badge><Badge tone={s.status === 'active' ? 'green' : 'slate'}>{s.status}</Badge></span></li>)}{!c.staff.length && <li className="px-5 py-5 text-center text-sm text-slate-400">No staff accounts.</li>}</ul><p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">{c.technicians} technician {c.technicians === 1 ? 'record' : 'records'} are managed by the center.</p></Card>
        <Card><CardHeader title="Contact and hours" /><form onSubmit={save} noValidate className="space-y-4 px-5 py-5">{err && <InlineAlert>{err}</InlineAlert>}{!c.canEdit && <InlineAlert tone="blue">Only a super admin can change these details.</InlineAlert>}
          <TextField label="Contact number" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} disabled={!c.canEdit} /><TextField label="Operating hours" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} disabled={!c.canEdit} />
          {c.canEdit && <><TextAreaField label="Reason for the change" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required /><Button type="submit" loading={busy}>Save changes</Button></>}</form></Card>
      </div>
      <Card><CardHeader title={`Bookings (${c.bookingCount})`} /><ul className="divide-y divide-white/10">{c.bookings.map((b) => <li key={b.id}><Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-white/5"><span className="text-sm font-semibold text-white">{b.reference}</span><span className="text-sm text-slate-300">{b.vehicle.registration}</span><span className="ml-auto"><StatusBadge statusKey={b.statusKey} /></span></Link></li>)}{!c.bookings.length && <li className="px-5 py-5 text-center text-sm text-slate-400">No bookings yet.</li>}</ul></Card>
      <Card><CardHeader title="Work orders" /><ul className="divide-y divide-white/10">{c.workOrders.map((w) => <li key={w.id} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="text-white">{w.reference} <span className="text-slate-400">· {w.bookingRef}</span></span><Badge>{w.status.replace(/_/g, ' ')}</Badge></li>)}{!c.workOrders.length && <li className="px-5 py-5 text-center text-sm text-slate-400">No work orders yet.</li>}</ul></Card>
      <Card><CardHeader title="Administrative history" /><ul className="divide-y divide-white/10">{c.audit.map((a) => <li key={a.id} className="px-5 py-3 text-sm"><span className="text-white">{a.action.replace(/\./g, ' ')}</span> <span className="text-slate-400">by {a.adminName}{a.reason ? `: ${a.reason}` : ''}</span><span className="block text-xs text-slate-400">{fmtDateTime(a.at)}</span></li>)}{!c.audit.length && <li className="px-5 py-5 text-center text-sm text-slate-400">No administrative actions recorded.</li>}</ul></Card>
    </div>
  );
}
