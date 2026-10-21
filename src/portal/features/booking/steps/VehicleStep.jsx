import ChoiceCard from './ChoiceCard';
import VehicleFields from '../../vehicle/VehicleFields';
import { InlineAlert } from '../../../ui';

export default function VehicleStep({ draft, setDraft, vehicles, errors }) {
  const newMode = draft.vehicleMode === 'new';
  return (
    <div className="space-y-4">
      {errors.vehicleId && <InlineAlert>{errors.vehicleId}</InlineAlert>}
      <fieldset className="space-y-3">
        <legend className="sr-only">Vehicle</legend>
        {vehicles.map((v) => (
          <ChoiceCard key={v.id} name="vehicle" value={v.id} checked={!newMode && draft.vehicleId === v.id} onChange={(id) => setDraft((d) => ({ ...d, vehicleMode: 'saved', vehicleId: id }))} title={`${v.make} ${v.model}`}>
            {v.registration} &middot; {v.year} &middot; {v.type}
          </ChoiceCard>
        ))}
        <ChoiceCard name="vehicle" value="__new" checked={newMode} onChange={() => setDraft((d) => ({ ...d, vehicleMode: 'new' }))} title="Add a new vehicle">It is saved to My Vehicles when you confirm.</ChoiceCard>
      </fieldset>
      {newMode && (
        <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
          <VehicleFields value={draft.newVehicle} onChange={(nv) => setDraft((d) => ({ ...d, newVehicle: nv }))} errors={errors.newVehicle || {}} />
        </div>
      )}
    </div>
  );
}
