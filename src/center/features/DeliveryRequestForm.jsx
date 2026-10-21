import { useRef, useState } from 'react';
import { Button, InlineAlert, SelectField, TextAreaField, TextField, useToast } from '../../portal/ui';
import { centerServices } from '../services';
import { todayISO } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';

const SLOTS = ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00'];

/** Delivery request for a completed vehicle. The customer address comes from the booking record; staff can correct it. */
export default function DeliveryRequestForm({ booking, defaults, onDone, onCancel }) {
  const toast = useToast();
  const key = useRef(`dl_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  const busyRef = useRef(false);
  const [f, setF] = useState({ date: '', slot: '', address: defaults?.address || '', notes: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e?.preventDefault();
    if (busyRef.current) return;
    const next = { date: !f.date ? 'Choose a delivery date.' : f.date < todayISO() ? 'Choose today or a later date.' : '', slot: f.slot ? '' : 'Choose a time slot.', address: f.address.trim() ? '' : 'Enter the delivery address.' };
    setErr(next);
    if (Object.values(next).some(Boolean)) return;
    busyRef.current = true; setBusy(true); setError('');
    try { const b = await centerServices.deliveries.request(booking.id, f, key.current); notifyChanged(); toast.push({ title: 'Delivery requested', message: booking.reference }); onDone?.(b); }
    catch (e2) { setError(e2.message); } finally { busyRef.current = false; setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-slate-300">Request delivery of <strong className="text-white">{booking.vehicle.registration}</strong> to {booking.customer.name}. A driver is assigned by Speedy Fix, and the driver completes the handover with the customer's code.</p>
      {error && <InlineAlert>{error}</InlineAlert>}
      <TextField label="Delivery address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={err.address} hint="Taken from the customer's booking record." required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Preferred delivery date" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} error={err.date} required />
        <SelectField label="Time slot" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} error={err.slot} required><option value="">Select a slot</option>{SLOTS.map((s) => <option key={s}>{s}</option>)}</SelectField>
      </div>
      <TextAreaField label="Instructions (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <div className="flex flex-wrap justify-end gap-2">{onCancel && <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>}<Button type="submit" loading={busy}>Request delivery</Button></div>
    </form>
  );
}
