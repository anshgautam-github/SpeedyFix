import { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Badge, Button, Card, CardHeader, InlineAlert, SelectField, TextAreaField, TextField, cx, useToast } from '../../portal/ui';
import { centerServices } from '../services';
import { fmtDateTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import RadioChoice from './RadioChoice';

const L = { good: 'Good', minor: 'Minor marks', damage: 'Damaged', none: 'None seen', present: 'Present' };

/**
 * Receiving workflow. A vehicle is only "received" after staff confirm it here; the driver's arrival record is a
 * precondition checked by the server, and no verification code is invented for this step.
 */
export default function ReceivingPanel({ booking, onChanged }) {
  const toast = useToast();
  const [f, setF] = useState({ identityConfirmed: false, exterior: '', scratches: '', fuel: '', accessories: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (booking.receiving) {
    const r = booking.receiving;
    return (
      <Card><CardHeader title="Vehicle received" action={<Badge tone="green">Received</Badge>} />
        <div className="space-y-3 px-5 py-5 text-sm">
          <p className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Receipt confirmed by {r.byName} on {fmtDateTime(r.at)}.</p>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div><dt className="text-xs text-slate-400">Exterior</dt><dd className="text-white">{L[r.exterior]}</dd></div>
            <div><dt className="text-xs text-slate-400">Scratches or dents</dt><dd className="text-white">{L[r.scratches]}</dd></div>
            <div><dt className="text-xs text-slate-400">Fuel level</dt><dd className="text-white">{r.fuel || 'Not checked'}</dd></div>
            <div><dt className="text-xs text-slate-400">Items received</dt><dd className="text-white">{r.accessories || 'None noted'}</dd></div>
            {r.notes && <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Notes</dt><dd className="text-white">{r.notes}</dd></div>}
          </dl>
        </div></Card>
    );
  }
  if (!['picked_up', 'in_transit'].includes(booking.status)) return null;
  if (!booking.receivable) {
    return <Card><CardHeader title="Vehicle receiving" /><div className="flex items-start gap-3 px-5 py-5 text-sm text-slate-300"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />The vehicle is on its way. You can receive it once the driver records arrival at your center.</div></Card>;
  }
  const damaged = f.exterior === 'damage' || f.scratches === 'present';
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const next = { identityConfirmed: f.identityConfirmed ? '' : 'Confirm the vehicle identity.', exterior: f.exterior ? '' : 'Choose the exterior condition.', scratches: f.scratches ? '' : 'Say whether there are scratches or dents.', notes: damaged && !f.notes.trim() ? 'Describe the visible damage.' : '' };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true); setError('');
    try { const b = await centerServices.receiving.confirm(booking.id, f); notifyChanged(); toast.push({ title: 'Vehicle received', message: booking.reference }); onChanged(b); }
    catch (err) { setError(err.message); onChanged(); } finally { setBusy(false); }
  };
  return (
    <Card className="border-amber-400/30"><CardHeader title="Receive this vehicle" action={<Badge tone="amber">Action needed</Badge>} />
      <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5">
        <p className="text-sm text-slate-300">The driver has arrived{booking.handovers.pickup.driverCondition ? ` and recorded the condition at pickup (exterior: ${L[booking.handovers.pickup.driverCondition.exterior]}).` : '.'} Check the vehicle, then confirm receipt.</p>
        {error && <InlineAlert>{error}</InlineAlert>}
        <div><label className={cx('flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 text-sm', f.identityConfirmed ? 'border-volt-glow bg-volt/10 text-white' : 'border-white/10 text-slate-300')}>
          <input type="checkbox" checked={f.identityConfirmed} onChange={(e) => setF({ ...f, identityConfirmed: e.target.checked })} className="h-4 w-4 accent-[#1F6BFF]" />
          <span>The registration on the vehicle is <strong className="text-white">{booking.vehicle.registration}</strong> and matches this booking <Badge tone="rose">Required</Badge></span></label>
          {errors.identityConfirmed && <p role="alert" className="mt-1.5 text-xs text-rose-300">{errors.identityConfirmed}</p>}</div>
        <RadioChoice legend="Exterior condition" name="r-ext" value={f.exterior} onChange={(v) => setF({ ...f, exterior: v })} required error={errors.exterior} options={[['good', 'Good'], ['minor', 'Minor marks'], ['damage', 'Damaged']]} />
        <RadioChoice legend="Existing scratches or dents" name="r-scr" value={f.scratches} onChange={(v) => setF({ ...f, scratches: v })} required error={errors.scratches} options={[['none', 'None seen'], ['present', 'Present']]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={<span className="flex items-center gap-2">Fuel level <Badge>Optional</Badge></span>} value={f.fuel} onChange={(e) => setF({ ...f, fuel: e.target.value })}><option value="">Not checked</option>{['Empty', 'Quarter', 'Half', 'Three quarters', 'Full'].map((x) => <option key={x}>{x}</option>)}</SelectField>
          <TextField label={<span className="flex items-center gap-2">Items received <Badge>Optional</Badge></span>} value={f.accessories} onChange={(e) => setF({ ...f, accessories: e.target.value })} placeholder="Spare key, documents" />
        </div>
        <TextAreaField label={<span className="flex items-center gap-2">Notes {damaged ? <Badge tone="rose">Required</Badge> : <Badge>Optional</Badge>}</span>} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} error={errors.notes} />
        <p className="rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-slate-400">Photo upload is not connected to storage in this build.</p>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Confirm vehicle received</Button>
      </form>
    </Card>
  );
}
