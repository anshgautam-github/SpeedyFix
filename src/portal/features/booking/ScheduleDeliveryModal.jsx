import { useEffect, useState } from 'react';
import { Modal, Button, InlineAlert, SelectField, TextField, useToast, DemoNotice } from '../../ui';
import { services } from '../../services';
import { todayISO } from '../../lib/format';
import { notifyChanged } from '../../lib/events';

export default function ScheduleDeliveryModal({ booking, open, onClose, onDone }) {
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [f, setF] = useState({ date: '', slot: '', address: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setF({ date: '', slot: '', address: booking?.pickup?.address ? `${booking.pickup.address}, ${booking.pickup.city}` : '' });
    setErr({}); setError('');
    services.bookings.serviceTypes().then((r) => setSlots(r.slots)).catch((e) => setError(e.message));
  }, [open, booking]);

  const submit = async () => {
    const next = { date: !f.date ? 'Choose a delivery date.' : f.date < todayISO() ? 'Choose today or a later date.' : '', slot: f.slot ? '' : 'Choose a time slot.', address: f.address.trim() ? '' : 'Enter the delivery address.' };
    setErr(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true); setError('');
    try {
      const updated = await services.bookings.scheduleDelivery(booking.id, f);
      notifyChanged();
      toast.push({ title: 'Delivery requested', message: 'The delivery request is saved on your booking.' });
      onDone?.(updated);
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Schedule delivery"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy}>Request delivery</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">Choose when and where you want your vehicle returned. A delivery is only confirmed once a driver is assigned.</p>
        <DemoNotice>Illustrative time slots. Nothing is sent to a real driver.</DemoNotice>
        {error && <InlineAlert>{error}</InlineAlert>}
        <TextField label="Delivery date" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} error={err.date} required />
        <SelectField label="Time slot" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} error={err.slot} required>
          <option value="">Select a slot</option>
          {slots.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectField>
        <TextField label="Delivery address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={err.address} required />
      </div>
    </Modal>
  );
}
