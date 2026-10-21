import { useState } from 'react';
import { Badge, Button, InlineAlert, SelectField, TextAreaField, TextField, cx, useToast } from '../../portal/ui';
import { driverServices } from '../services';
import { notifyChanged } from '../../portal/lib/events';

const Req = () => <Badge tone="rose">Required</Badge>;
const Opt = () => <Badge>Optional</Badge>;

function Choice({ legend, name, value, onChange, options, required, error }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-white">{legend}{required ? <Req /> : <Opt />}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(([v, l]) => (
          <label key={v} className={cx('flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-volt/50', value === v ? 'border-volt-glow bg-volt/10 text-white' : 'border-white/10 bg-white/[.02] text-slate-300 hover:bg-white/5')}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="h-4 w-4 accent-[#1F6BFF]" />{l}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </fieldset>
  );
}

/** Vehicle condition record. Required checks are validated here for speed and again by the server. */
export default function InspectionForm({ job, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ exterior: '', scratches: '', visibleDamage: '', fuel: '', accessories: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const damaged = f.exterior === 'damage' || f.scratches === 'present' || f.visibleDamage === 'present';

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const next = { exterior: f.exterior ? '' : 'Choose the exterior condition.', scratches: f.scratches ? '' : 'Say whether there are scratches or dents.', visibleDamage: f.visibleDamage ? '' : 'Say whether there is visible damage.', notes: damaged && !f.notes.trim() ? 'Describe the existing damage.' : '' };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true); setError('');
    try { const u = await driverServices.jobs.transition(job.id, 'inspect', { expectedPhase: job.phase, payload: f }); notifyChanged(); toast.push({ title: 'Condition recorded' }); onSaved(u); }
    catch (err) { setError(err.message); onSaved(); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <p className="text-sm text-slate-300">Record the condition before the handover. This protects you and the customer.</p>
      {error && <InlineAlert>{error}</InlineAlert>}
      <Choice legend="Exterior condition" name="exterior" value={f.exterior} onChange={set('exterior')} required error={errors.exterior} options={[['good', 'Good'], ['minor', 'Minor marks'], ['damage', 'Damaged']]} />
      <Choice legend="Existing scratches or dents" name="scratches" value={f.scratches} onChange={set('scratches')} required error={errors.scratches} options={[['none', 'None seen'], ['present', 'Present']]} />
      <Choice legend="Visible damage" name="visibleDamage" value={f.visibleDamage} onChange={set('visibleDamage')} required error={errors.visibleDamage} options={[['none', 'None seen'], ['present', 'Present']]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label={<span className="flex items-center gap-2">Fuel level <Opt /></span>} value={f.fuel} onChange={(e) => set('fuel')(e.target.value)}>
          <option value="">Not checked</option>{['Empty', 'Quarter', 'Half', 'Three quarters', 'Full'].map((x) => <option key={x}>{x}</option>)}
        </SelectField>
        <TextField label={<span className="flex items-center gap-2">Items received <Opt /></span>} value={f.accessories} onChange={(e) => set('accessories')(e.target.value)} placeholder="Spare key, documents, mats" />
      </div>
      <TextAreaField label={<span className="flex items-center gap-2">Notes {damaged ? <Req /> : <Opt />}</span>} value={f.notes} onChange={(e) => set('notes')(e.target.value)} error={errors.notes} hint={damaged ? 'Describe where the damage is and how it looks.' : undefined} />
      <p className="rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-slate-400">Photo capture is not connected to storage in this build, so photos cannot be attached yet.</p>
      <Button type="submit" size="lg" className="w-full" loading={busy}>Save condition record</Button>
    </form>
  );
}

export function InspectionSummary({ inspection }) {
  if (!inspection) return <p className="text-sm text-slate-400">Not recorded yet. It is required before the handover code can be verified.</p>;
  const L = { good: 'Good', minor: 'Minor marks', damage: 'Damaged', none: 'None seen', present: 'Present' };
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-slate-400">Exterior</dt><dd className="text-white">{L[inspection.exterior]}</dd></div>
      <div><dt className="text-xs text-slate-400">Scratches or dents</dt><dd className="text-white">{L[inspection.scratches]}</dd></div>
      <div><dt className="text-xs text-slate-400">Visible damage</dt><dd className="text-white">{L[inspection.visibleDamage]}</dd></div>
      <div><dt className="text-xs text-slate-400">Fuel level</dt><dd className="text-white">{inspection.fuel || 'Not checked'}</dd></div>
      {inspection.accessories && <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Items received</dt><dd className="text-white">{inspection.accessories}</dd></div>}
      {inspection.notes && <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Notes</dt><dd className="text-white">{inspection.notes}</dd></div>}
    </dl>
  );
}
