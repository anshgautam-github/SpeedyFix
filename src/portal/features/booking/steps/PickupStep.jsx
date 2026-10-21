import { SelectField, TextAreaField, TextField } from '../../../ui';
import { todayISO } from '../../../lib/format';

/**
 * Plain address fields, no maps API required. To add a map picker later, render it here and write the
 * result into pickup.address / city / postalCode (see src/portal/integrations/maps.js).
 */
export default function PickupStep({ draft, setDraft, slots, saved = [], errors }) {
  const p = draft.pickup;
  const set = (k) => (e) => setDraft((d) => ({ ...d, pickup: { ...d.pickup, [k]: e.target.value } }));
  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <SelectField label="Use a saved address" value="" onChange={(e) => { const a = saved[Number(e.target.value)]; if (a) setDraft((d) => ({ ...d, pickup: { ...d.pickup, address: a.address, city: a.city || d.pickup.city, postalCode: a.postalCode || d.pickup.postalCode } })); }}>
          <option value="">Choose to fill the fields below</option>
          {saved.map((a, i) => <option key={i} value={i}>{a.label}: {a.address}</option>)}
        </SelectField>
      )}
      <TextField label="Pickup address" value={p.address} onChange={set('address')} error={errors.address} autoComplete="street-address" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="City" value={p.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" required />
        <TextField label="Postal code" value={p.postalCode} onChange={set('postalCode')} error={errors.postalCode} autoComplete="postal-code" required />
      </div>
      <TextField label="Landmark (optional)" value={p.landmark} onChange={set('landmark')} hint="Helps the driver find you." />
      <TextField label="Contact phone" type="tel" value={p.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" hint="The driver may call this number." required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Preferred pickup date" type="date" min={todayISO()} value={p.date} onChange={set('date')} error={errors.date} required />
        <SelectField label="Time slot" value={p.slot} onChange={set('slot')} error={errors.slot} required>
          <option value="">Select a slot</option>
          {slots.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectField>
      </div>
      <TextAreaField label="Special instructions (optional)" value={p.instructions} onChange={set('instructions')} />
    </div>
  );
}
