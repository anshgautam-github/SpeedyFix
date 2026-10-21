import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { centerServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, InlineAlert, Modal, SelectField, Skeleton, TextAreaField, TextField, useToast } from '../../portal/ui';
import { fmtDate, fmtDateTime, todayISO } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { BookingBadge, PriorityBadge, WoBadge, money } from '../features/badges';
import ReceivingPanel from '../features/ReceivingPanel';
import DeliveryRequestForm from '../features/DeliveryRequestForm';
import { useCenter } from '../layout/CenterContext';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;
const Call = ({ phone, label }) => phone ? <a href={`tel:${String(phone).replace(/\s/g, '')}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-sm text-white hover:bg-white/10"><Phone className="h-4 w-4 text-volt-glow" aria-hidden="true" />Call {label || phone}</a> : null;
const SLOTS = ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00'];

function EditModal({ booking, open, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: booking.pickup.date, slot: booking.pickup.slot, landmark: booking.pickup.landmark || '', instructions: booking.pickup.instructions || '', priority: booking.priority });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true); setError('');
    try { const b = await centerServices.bookings.update(booking.id, f); notifyChanged(); toast.push({ title: 'Booking updated' }); onSaved(b); onClose(); } catch (e) { setError(e.message); onSaved(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Update booking" footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy}>Save changes</Button></>}>
      <div className="space-y-4">
        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Pickup date" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><SelectField label="Time slot" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</SelectField></div>
        <SelectField label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="normal">Normal</option><option value="urgent">Urgent</option></SelectField>
        <TextField label="Landmark" value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} />
        <TextAreaField label="Instructions" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
      </div>
    </Modal>
  );
}

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const { can } = useCenter();
  const toast = useToast();
  const { data: b, error, loading, reload, setData } = useAsync(() => centerServices.bookings.get(bookingId), [bookingId]);
  usePolling(() => reload(true), 10000, Boolean(b && !['delivered', 'cancelled'].includes(b.status)));
  const [edit, setEdit] = useState(false);
  const [cancel, setCancel] = useState({ open: false, busy: false, error: '' });
  const [deliver, setDeliver] = useState(false);
  const changed = (u) => (u ? setData(u) : reload(true));

  if (loading && !b) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (error) return <div className="space-y-4"><ErrorState error={error} onRetry={error.code === 'NOT_FOUND' ? undefined : reload} title={error.code === 'NOT_FOUND' ? 'Booking not found' : 'Could not load this booking'} /><div className="text-center"><Button as={Link} to="/service-center/bookings" variant="secondary">Back to bookings</Button></div></div>;
  if (!b) return null;
  const doCancel = async () => {
    setCancel((c) => ({ ...c, busy: true, error: '' }));
    try { const u = await centerServices.bookings.cancel(b.id); notifyChanged(); toast.push({ title: 'Booking cancelled', message: b.reference }); setCancel({ open: false, busy: false, error: '' }); changed(u); }
    catch (e) { setCancel({ open: true, busy: false, error: e.message }); changed(); }
  };
  const h = b.handovers;
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><BookingBadge statusKey={b.statusKey} /><PriorityBadge priority={b.priority} />{b.demo && <Badge tone="amber">Demo</Badge>}{b.createdBy === 'center' && <Badge>Created by your center</Badge>}</div>
        <h2 className="mt-3 font-display text-2xl text-white">{b.reference}</h2>
        <p className="text-slate-300">{b.vehicle.registration} · {b.vehicle.make} {b.vehicle.model} · {b.customer.name}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {b.permitted.update && <Button variant="secondary" size="sm" onClick={() => setEdit(true)}>Update booking</Button>}
          {b.permitted.cancel && <Button variant="danger" size="sm" onClick={() => setCancel({ open: true, busy: false, error: '' })}>Cancel booking</Button>}
          {b.permitted.requestDelivery && <Button size="sm" onClick={() => setDeliver(true)}>Request delivery</Button>}
          {b.workOrder && can('wo.progress') && <Button as={Link} to={`/service-center/work-orders/${b.workOrder.id}`} variant="secondary" size="sm">Open work order</Button>}
        </div>
      </Card>

      <ReceivingPanel booking={b} onChanged={changed} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Booking details" />
            <dl className="divide-y divide-white/10 px-5">
              <Row k="Customer"><span className="flex flex-wrap items-center gap-3">{b.customer.name}<Call phone={b.customer.phone} /></span></Row>
              <Row k="Pickup">{fmtDate(b.pickup.date)}, {b.pickup.slot}</Row>
              <Row k="Pickup address">{[b.pickup.address, b.pickup.city, b.pickup.postalCode].filter(Boolean).join(', ')}{b.pickup.landmark ? ` (${b.pickup.landmark})` : ''}</Row>
              <Row k="Service or issue">{b.issue}</Row>
              <Row k="Instructions">{[b.notes, b.pickup.instructions].filter(Boolean).join(' / ')}</Row>
              <Row k="Driver">{b.driver ? <span className="flex flex-wrap items-center gap-3">{b.driver.name}<Call phone={b.driver.phone} /></span> : null}</Row>
              <Row k="Delivery">{b.delivery ? `${fmtDate(b.delivery.date)}, ${b.delivery.slot} · ${b.delivery.address}` : null}</Row>
              <Row k="Delivery driver">{b.deliveryDriver ? <span className="flex flex-wrap items-center gap-3">{b.deliveryDriver.name}<Call phone={b.deliveryDriver.phone} /></span> : null}</Row>
            </dl></Card>
          <Card><CardHeader title="Handover records" />
            <div className="divide-y divide-white/10">
              {[['Pickup handover (customer to driver)', h.pickup], ['Delivery handover (driver to customer)', h.delivery]].map(([label, r]) => (
                <div key={label} className="px-5 py-4 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-white">{label}</span>{r.verifiedAt ? <Badge tone="green">Verified with OTP</Badge> : <Badge>Not yet</Badge>}</div>
                  {r.verifiedAt && <p className="mt-1 text-xs text-slate-400">Verified {fmtDateTime(r.verifiedAt)} by the driver with the customer's code.</p>}
                  {r.driverCondition && <p className="mt-1 text-xs text-slate-400">Driver's condition record: exterior {r.driverCondition.exterior}, scratches {r.driverCondition.scratches}{r.driverCondition.notes ? `, "${r.driverCondition.notes}"` : ''}.</p>}</div>
              ))}
              <p className="px-5 py-3 text-xs text-slate-400">Vehicle photos are not available in this build. Handovers are completed by drivers; the service center cannot verify or override them.</p>
            </div></Card>
          {b.workOrderFull && (
            <Card><CardHeader title="Work order" action={<WoBadge status={b.workOrderFull.status} />} />
              <dl className="divide-y divide-white/10 px-5"><Row k="Reference">{b.workOrderFull.reference}</Row><Row k="Technician">{b.workOrderFull.technician?.name}</Row><Row k="Labour">{money(b.workOrderFull.totals.labour)} ({b.workOrderFull.totals.labourHours} h)</Row><Row k="Parts">{money(b.workOrderFull.totals.parts)}</Row><Row k="Total (workshop cost record)">{money(b.workOrderFull.totals.total)}</Row></dl></Card>
          )}
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Activity timeline" />
            <ol className="divide-y divide-white/10">{b.timeline.map((t, i) => <li key={i} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="text-slate-100">{t.label}</span><span className="shrink-0 text-xs text-slate-400">{fmtDateTime(t.at)}</span></li>)}</ol></Card>
          {b.audit.length > 0 && <Card><CardHeader title="Audit trail" /><ol className="divide-y divide-white/10">{b.audit.slice(0, 10).map((a, i) => <li key={i} className="px-5 py-2.5 text-xs text-slate-300"><span className="text-white">{a.byName}</span> · {a.action}{a.detail ? ` (${a.detail})` : ''}<span className="block text-slate-400">{fmtDateTime(a.at)}</span></li>)}</ol></Card>}
        </div>
      </div>

      <EditModal key={`${b.id}-${b.updatedAt}`} booking={b} open={edit} onClose={() => setEdit(false)} onSaved={changed} />
      <ConfirmDialog open={cancel.open} danger loading={cancel.busy} error={cancel.error} title="Cancel this booking?" confirmLabel="Cancel booking" cancelLabel="Keep booking" onConfirm={doCancel} onClose={() => setCancel({ open: false, busy: false, error: '' })}
        body={<>Booking <strong className="text-white">{b.reference}</strong> will be cancelled. This is only possible before the pickup has started.</>} />
      <Modal open={deliver} onClose={() => setDeliver(false)} title="Request delivery" size="lg"><DeliveryRequestForm booking={b} defaults={b.deliveryDefaults} onCancel={() => setDeliver(false)} onDone={(u) => { setDeliver(false); changed(u); }} /></Modal>
    </div>
  );
}
