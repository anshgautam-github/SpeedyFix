import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ErrorState, InlineAlert, Modal, SelectField, Skeleton, TextAreaField, TextField, useToast } from '../../portal/ui';
import { fmtDate, fmtDateTime, todayISO } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { FlagBadges, ReasonDialog, StatusBadge } from '../features/common';

const SLOTS = ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00'];
const Row = ({ k, children }) => <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;
const HV = { verified: ['green', 'Verified with OTP'], pending: ['amber', 'Waiting for code'], locked: ['rose', 'Locked'], expired: ['rose', 'Expired'], waiting: ['slate', 'Not started'] };

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const toast = useToast();
  const { data: b, error, loading, reload } = useAsync(() => adminServices.bookings.get(bookingId), [bookingId]);
  usePolling(() => reload(true), 10000, Boolean(b && !['completed', 'cancelled'].includes(b.statusKey)));
  const [cancel, setCancel] = useState(false);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading && !b) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (error) return <div className="space-y-4"><ErrorState error={error} onRetry={error.code === 'NOT_FOUND' ? undefined : reload} title={error.code === 'NOT_FOUND' ? 'Booking not found' : 'Could not load this booking'} /><div className="text-center"><Button as={Link} to="/admin/bookings" variant="secondary">Back to bookings</Button></div></div>;
  if (!b) return null;
  const after = async (fn, msg) => { try { await fn(); notifyChanged(); toast.push({ title: msg, message: b.reference }); reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Not done', message: e.message }); reload(true); } };
  const addNote = async () => { setBusy(true); try { await adminServices.bookings.addNote(b.id, note); setNote(''); reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Could not add note', message: e.message }); } finally { setBusy(false); } };
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge statusKey={b.statusKey} /><FlagBadges flags={b.flags} />{b.demo && <Badge tone="amber">Demo</Badge>}</div>
        <h2 className="mt-3 font-display text-2xl text-white">{b.reference}</h2>
        <p className="text-slate-300">{b.vehicle.registration} · {b.vehicle.make} {b.vehicle.model} · {b.customer.name} · {b.center.name}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {b.permitted.assign && ['pending_assignment', 'driver_assigned', 'pickup_in_progress', 'ready_for_delivery', 'delivery_in_progress'].includes(b.statusKey) && <Button as={Link} to="/admin/assignments" size="sm">Open dispatch</Button>}
          {b.permitted.update && <Button variant="secondary" size="sm" onClick={() => { setF({ date: b.pickup.date, slot: b.pickup.slot, instructions: b.pickup.instructions || '', priority: b.priority, reason: '' }); setEdit(true); }}>Correct booking</Button>}
          {b.permitted.cancel && <Button variant="danger" size="sm" onClick={() => setCancel(true)}>Cancel booking</Button>}
        </div>
        {b.flags.length > 0 && <ul className="mt-4 space-y-1 text-sm text-amber-100">{b.flags.map((x, i) => <li key={i}>• {x.detail}</li>)}</ul>}
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Booking details" /><dl className="divide-y divide-white/10 px-5">
            <Row k="Customer">{b.customer.name}{b.customer.phone ? ` · ${b.customer.phone}` : ''}</Row><Row k="Service center">{b.center.name}</Row><Row k="Type">{b.type}</Row><Row k="Service or issue">{b.issue}</Row>
            <Row k="Pickup">{fmtDate(b.pickup.date)}, {b.pickup.slot}</Row><Row k="Pickup address">{[b.pickup.address, b.pickup.city, b.pickup.postalCode].filter(Boolean).join(', ')}{b.pickup.landmark ? ` (${b.pickup.landmark})` : ''}</Row>
            <Row k="Pickup driver">{b.driverFull ? `${b.driverFull.name}${b.driverFull.phone ? ` · ${b.driverFull.phone}` : ''}` : null}</Row><Row k="Delivery">{b.delivery ? `${fmtDate(b.delivery.date)}, ${b.delivery.slot} · ${b.delivery.address}` : null}</Row><Row k="Delivery driver">{b.deliveryDriverFull?.name}</Row>
            <Row k="Instructions">{[b.notesText, b.pickup.instructions].filter(Boolean).join(' / ')}</Row></dl></Card>
          <Card><CardHeader title="Handover records" /><div className="divide-y divide-white/10">{['pickup', 'delivery'].map((t) => { const h = b.handovers[t]; const [tone, label] = HV[h.status] || HV.waiting; return (
            <div key={t} className="px-5 py-4 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-white">{t === 'pickup' ? 'Pickup (customer to driver)' : 'Delivery (driver to customer)'}</span><Badge tone={tone}>{label}</Badge></div>
              {h.verifiedAt && <p className="mt-1 text-xs text-slate-400">Verified {fmtDateTime(h.verifiedAt)}</p>}{h.attempts > 0 && !h.verifiedAt && <p className="mt-1 text-xs text-amber-200">{h.attempts} failed {h.attempts === 1 ? 'attempt' : 'attempts'}</p>}
              {h.driverCondition && <p className="mt-1 text-xs text-slate-400">Driver condition record: exterior {h.driverCondition.exterior}, scratches {h.driverCondition.scratches}.</p>}</div>); })}
            <p className="px-5 py-3 text-xs text-slate-400">Codes are never shown here. Handovers can only be verified by the driver's server-side check; admins cannot verify or override them. <Link to="/admin/handovers" className="text-volt-glow hover:underline">Handover monitoring</Link></p></div></Card>
          {b.workOrder && <Card><CardHeader title="Work order" action={<Badge>{b.workOrder.status.replace(/_/g, ' ')}</Badge>} /><dl className="divide-y divide-white/10 px-5"><Row k="Reference">{b.workOrder.reference}</Row><Row k="Technician">{b.workOrder.technician}</Row><Row k="Started">{b.workOrder.startedAt ? fmtDateTime(b.workOrder.startedAt) : null}</Row><Row k="Completed">{b.workOrder.completedAt ? fmtDateTime(b.workOrder.completedAt) : null}</Row><Row k="Received">{b.receiving ? `${fmtDateTime(b.receiving.at)} by ${b.receiving.byName}` : null}</Row></dl><p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Read-only here. Workshop records are edited by the service center.</p></Card>}
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Status timeline" /><ol className="divide-y divide-white/10">{b.timeline.map((t, i) => <li key={i} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="text-slate-100">{t.label}</span><span className="shrink-0 text-xs text-slate-400">{fmtDateTime(t.at)}</span></li>)}</ol></Card>
          <Card><CardHeader title="Operational notes" /><div className="space-y-3 px-5 py-4">
            <ul className="space-y-2 text-sm">{b.adminNotes.map((n, i) => <li key={i} className="rounded-lg bg-white/[.04] px-3 py-2"><p className="text-slate-100">{n.text}</p><p className="text-xs text-slate-400">{n.by} · {fmtDateTime(n.at)}</p></li>)}{!b.adminNotes.length && <li className="text-slate-400">No notes yet.</li>}</ul>
            <TextAreaField label="Add a note" value={note} onChange={(e) => setNote(e.target.value)} /><Button size="sm" variant="secondary" onClick={addNote} loading={busy} disabled={!note.trim()}>Add note</Button><p className="text-xs text-slate-400">Notes are internal and not shown to customers, drivers or centers.</p></div></Card>
        </div>
      </div>
      <ReasonDialog open={cancel} danger title="Cancel this booking?" confirmLabel="Cancel booking" body={<>Booking <strong className="text-white">{b.reference}</strong> will be cancelled and the customer will see it as cancelled. This is only possible before the vehicle is collected.</>} onClose={() => setCancel(false)} onConfirm={async (reason) => { await adminServices.bookings.cancel(b.id, reason); notifyChanged(); toast.push({ title: 'Booking cancelled', message: b.reference }); setCancel(false); reload(true); }} />
      <Modal open={edit} onClose={() => setEdit(false)} title="Correct booking" footer={<><Button variant="secondary" onClick={() => setEdit(false)}>Cancel</Button><Button onClick={() => after(async () => { await adminServices.bookings.update(b.id, f, f.reason); setEdit(false); }, 'Booking corrected')}>Save correction</Button></>}>
        {f && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><TextField label="Pickup date" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><SelectField label="Time slot" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</SelectField></div>
          <SelectField label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="normal">Normal</option><option value="urgent">Urgent</option></SelectField><TextAreaField label="Instructions" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /><TextAreaField label="Reason for the correction" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required hint="Recorded in the audit log with the before and after values." /></div>}
      </Modal>
    </div>
  );
}
