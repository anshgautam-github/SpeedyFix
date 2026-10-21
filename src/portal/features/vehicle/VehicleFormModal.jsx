import { useEffect, useState } from 'react';
import { Button, InlineAlert, Modal, useToast } from '../../ui';
import { services } from '../../services';
import { hasErrors, validateVehicle } from '../../lib/validate';
import VehicleFields, { emptyVehicle } from './VehicleFields';

export default function VehicleFormModal({ open, vehicle, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState(emptyVehicle);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setV(vehicle ? { ...emptyVehicle, ...vehicle, year: String(vehicle.year) } : emptyVehicle); setErrors({}); setError(''); } }, [open, vehicle]);

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const next = validateVehicle(v);
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true); setError('');
    try {
      const saved = vehicle ? await services.vehicles.update(vehicle.id, v) : await services.vehicles.create(v);
      toast.push({ title: vehicle ? 'Vehicle updated' : 'Vehicle added', message: `${saved.make} ${saved.model}` });
      onSaved?.(saved);
      onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={vehicle ? 'Edit vehicle' : 'Add a vehicle'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy}>{vehicle ? 'Save changes' : 'Add vehicle'}</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <InlineAlert>{error}</InlineAlert>}
        <VehicleFields value={v} onChange={setV} errors={errors} />
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
