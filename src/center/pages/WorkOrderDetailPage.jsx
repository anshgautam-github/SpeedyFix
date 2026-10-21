import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { centerServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ErrorState, InlineAlert, Modal, SelectField, Skeleton, TextAreaField, cx, useToast } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { WO_ACTIONS, WO_STEPS, woStepIndex } from '../domain/model';
import { useCenter } from '../layout/CenterContext';
import { WoBadge } from '../features/badges';
import LabourParts from '../features/LabourParts';

const PRIMARY = { new: 'accept', accepted: 'assign', assigned: 'start', in_progress: 'complete_service', waiting_parts: 'resume', quality_check: 'pass_qc' };
const NEEDS_REASON = ['fail_qc', 'cancel'];

function Steps({ status }) {
  const cur = woStepIndex(status);
  return (
    <ol className="grid gap-2 sm:grid-cols-5" aria-label="Work order progress">
      {WO_STEPS.map((s, i) => { const done = i <= cur; const active = i === cur + 1 && status !== 'completed'; return (
        <li key={s.key} aria-current={active ? 'step' : undefined} className={cx('flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm', done ? 'border-volt/40 bg-volt/10 text-white' : active ? 'border-white/20 text-slate-200' : 'border-white/10 text-slate-400')}>
          <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs', done ? 'border-volt bg-volt text-white' : 'border-white/20')}>{done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}</span>{s.label}
          <span className="sr-only">{done ? ', done' : active ? ', next' : ''}</span></li>); })}
    </ol>
  );
}

function AssignModal({ wo, open, onClose, onDone }) {
  const toast = useToast();
  const { data, error, loading } = useAsync(() => (open ? centerServices.technicians.list() : Promise.resolve([])), [open]);
  const [tech, setTech] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    if (!tech) { setErr('Choose a technician.'); return; }
    setBusy(true); setErr('');
    try { const u = await centerServices.workOrders.transition(wo.id, 'assign', { expectedStatus: wo.status, payload: { technicianId: tech } }); notifyChanged(); toast.push({ title: 'Technician assigned' }); onDone(u); onClose(); } catch (e) { setErr(e.message); onDone(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={wo.technician ? 'Change technician' : 'Assign technician'} footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={go} loading={busy}>Assign</Button></>}>
      <div className="space-y-4">
        {error && <InlineAlert>{error.message}</InlineAlert>}
        {err && <InlineAlert>{err}</InlineAlert>}
        <SelectField label="Technician" value={tech} onChange={(e) => setTech(e.target.value)} disabled={loading}><option value="">{loading ? 'Loading' : 'Select a technician'}</option>{(data || []).filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.activeCount} open)</option>)}</SelectField>
      </div>
    </Modal>
  );
}

export default function WorkOrderDetailPage() {
  const { workOrderId } = useParams();
  const { center } = useCenter();
  const toast = useToast();
  const { data: wo, error, loading, reload, setData } = useAsync(() => centerServices.workOrders.get(workOrderId), [workOrderId]);
  const techs = useAsync(() => centerServices.technicians.list().catch(() => []), []);
  usePolling(() => reload(true), 10000, Boolean(wo && !['completed', 'cancelled'].includes(wo.status)));
  const [assign, setAssign] = useState(false);
  const [reason, setReason] = useState({ action: null, text: '', busy: false, error: '' });
  const [busy, setBusy] = useState('');
  const changed = (u) => (u ? setData(u) : reload(true));

  if (loading && !wo) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (error) return <div className="space-y-4"><ErrorState error={error} onRetry={error.code === 'NOT_FOUND' ? undefined : reload} title={error.code === 'NOT_FOUND' ? 'Work order not found' : 'Could not load this work order'} /><div className="text-center"><Button as={Link} to="/service-center/work-orders" variant="secondary">Back to work orders</Button></div></div>;
  if (!wo) return null;

  const run = async (action, payload) => {
    setBusy(action);
    try { const u = await centerServices.workOrders.transition(wo.id, action, { expectedStatus: wo.status, payload }); notifyChanged(); toast.push({ title: WO_ACTIONS[action].label, message: wo.reference }); changed(u); return true; }
    catch (e) { toast.push({ tone: 'rose', title: e.code === 'STALE' ? 'Work order updated' : 'Could not continue', message: e.message }); changed(); return false; } finally { setBusy(''); }
  };
  const click = (a) => (a === 'assign' ? setAssign(true) : NEEDS_REASON.includes(a) ? setReason({ action: a, text: '', busy: false, error: '' }) : run(a));
  const laborTechs = (techs.data || []).filter((t) => t.active);
  if (wo.technician && !laborTechs.some((t) => t.id === wo.technician.id)) laborTechs.push({ id: wo.technician.id, name: wo.technician.name });
  const primary = PRIMARY[wo.status];
  const canPrimary = wo.allowed.includes(primary);
  const secondary = wo.allowed.filter((a) => a !== primary);
  const submitReason = async () => {
    if (!reason.text.trim()) { setReason((r) => ({ ...r, error: 'Enter a reason.' })); return; }
    setReason((r) => ({ ...r, busy: true, error: '' }));
    const ok = await run(reason.action, { reason: reason.text });
    setReason(ok ? { action: null, text: '', busy: false, error: '' } : (r) => ({ ...r, busy: false }));
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><WoBadge status={wo.status} />{wo.demo && <Badge tone="amber">Demo</Badge>}</div>
        <h2 className="mt-3 font-display text-2xl text-white">{wo.reference}</h2>
        <p className="text-slate-300">{wo.vehicle.registration} · {wo.vehicle.make} {wo.vehicle.model} · {wo.customer.name} · <Link to={`/service-center/bookings/${wo.bookingId}`} className="text-volt-glow hover:underline">{wo.bookingRef}</Link></p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3"><div><dt className="text-xs text-slate-400">Technician</dt><dd className="text-white">{wo.technician?.name || 'Not assigned'}</dd></div><div><dt className="text-xs text-slate-400">Work started</dt><dd className="text-white">{wo.startedAt ? fmtDateTime(wo.startedAt) : 'Not started'}</dd></div><div><dt className="text-xs text-slate-400">Completed</dt><dd className="text-white">{wo.completedAt ? fmtDateTime(wo.completedAt) : 'Not completed'}</dd></div></dl>
        <div className="mt-5"><Steps status={wo.status} /></div>
        {wo.status !== 'completed' && wo.status !== 'cancelled' && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {primary && canPrimary && <Button onClick={() => click(primary)} loading={busy === primary}>{primary === 'assign' ? (wo.technician ? 'Change technician' : 'Assign technician') : WO_ACTIONS[primary].label}</Button>}
            {primary && !canPrimary && <p className="text-sm text-slate-400">Next step: {WO_ACTIONS[primary].label.toLowerCase()}. Your role cannot do this step.</p>}
            {secondary.map((a) => <Button key={a} variant={a === 'cancel' || a === 'fail_qc' ? 'danger' : 'secondary'} onClick={() => click(a)} loading={busy === a}>{a === 'assign' ? 'Change technician' : WO_ACTIONS[a].label}</Button>)}
          </div>
        )}
        {wo.status === 'completed' && <InlineAlert tone="green" className="mt-5">Servicing is complete and the quality check passed. The booking is ready for delivery. <Link to={`/service-center/bookings/${wo.bookingId}`} className="font-semibold underline">Request delivery from the booking</Link>.</InlineAlert>}
        {wo.status === 'in_progress' && !wo.totals.labourHours && <p className="mt-3 text-xs text-slate-400">Record labour hours below before completing servicing.</p>}
      </Card>

      <LabourParts wo={wo} technicians={laborTechs} defaultRate={center.hourlyRate} onChanged={changed} />

      <Card><CardHeader title="Status history" />
        <ol className="divide-y divide-white/10">{[...wo.history].reverse().map((h, i) => <li key={i} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="text-slate-100">{h.status.replace(/_/g, ' ')}{h.note ? <span className="text-slate-400"> · {h.note}</span> : null}</span><span className="shrink-0 text-xs text-slate-400">{fmtDateTime(h.at)}</span></li>)}</ol>
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Internal. Customers do not see work-order notes in this build.</p></Card>

      <AssignModal wo={wo} open={assign} onClose={() => setAssign(false)} onDone={changed} />
      <Modal open={Boolean(reason.action)} onClose={() => !reason.busy && setReason({ action: null, text: '', busy: false, error: '' })} title={reason.action ? WO_ACTIONS[reason.action].label : ''}
        footer={<><Button variant="secondary" onClick={() => setReason({ action: null, text: '', busy: false, error: '' })} disabled={reason.busy}>Back</Button><Button variant="danger" onClick={submitReason} loading={reason.busy}>Confirm</Button></>}>
        <TextAreaField label="Reason" value={reason.text} onChange={(e) => setReason((r) => ({ ...r, text: e.target.value }))} error={reason.error} required />
      </Modal>
    </div>
  );
}
