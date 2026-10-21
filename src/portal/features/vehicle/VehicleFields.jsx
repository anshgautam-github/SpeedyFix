import { SelectField, TextAreaField, TextField } from '../../ui';

export const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MPV / Van', 'Two-wheeler', 'Other'];
export const emptyVehicle = { registration: '', make: '', model: '', year: '', type: '', notes: '' };

/** Shared by the My Vehicles modal and step 1 of the booking wizard. */
export default function VehicleFields({ value, onChange, errors = {} }) {
  const set = (k) => (e) => onChange({ ...value, [k]: k === 'registration' ? e.target.value.toUpperCase() : e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField className="sm:col-span-2" label="Registration number" value={value.registration} onChange={set('registration')} error={errors.registration} autoCapitalize="characters" placeholder="KA01AB1234" required />
      <TextField label="Make" value={value.make} onChange={set('make')} error={errors.make} placeholder="Hyundai" required />
      <TextField label="Model" value={value.model} onChange={set('model')} error={errors.model} placeholder="Creta" required />
      <TextField label="Year" type="number" inputMode="numeric" value={value.year} onChange={set('year')} error={errors.year} placeholder="2021" required />
      <SelectField label="Vehicle type" value={value.type} onChange={set('type')} error={errors.type} required>
        <option value="">Select a type</option>
        {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
      </SelectField>
      <TextAreaField className="sm:col-span-2" label="Notes (optional)" value={value.notes} onChange={set('notes')} hint="Anything the driver or service center should know, such as a known fault or where the key is." />
    </div>
  );
}
