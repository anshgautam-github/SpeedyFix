import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CarFront, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { services } from '../services';
import { useAsync } from '../hooks/useAsync';
import { Badge, Button, Card, ConfirmDialog, DemoBadge, EmptyState, ErrorState, Skeleton, useToast } from '../ui';
import VehicleFormModal from '../features/vehicle/VehicleFormModal';

const Icon = ({ type }) => (type === 'Two-wheeler' ? <Bike className="h-6 w-6" aria-hidden="true" /> : type === 'MPV / Van' ? <Truck className="h-6 w-6" aria-hidden="true" /> : <CarFront className="h-6 w-6" aria-hidden="true" />);

export default function VehiclesPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => services.vehicles.list(), []);
  const [form, setForm] = useState({ open: false, vehicle: null });
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rmError, setRmError] = useState('');

  const remove = async () => {
    setBusy(true); setRmError('');
    try { await services.vehicles.remove(removing.id); toast.push({ title: 'Vehicle removed', message: `${removing.make} ${removing.model}` }); setRemoving(null); reload(); }
    catch (e) { setRmError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-slate-400">Vehicles you have saved. Pick one when you book a pickup.</p>
        <Button onClick={() => setForm({ open: true, vehicle: null })}><Plus className="h-4 w-4" aria-hidden="true" /> Add vehicle</Button>
      </div>

      {error && <ErrorState error={error} onRetry={reload} title="Could not load your vehicles" />}
      {loading && !data && <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-48" />)}</div>}
      {data && !data.length && (
        <EmptyState icon={CarFront} title="No vehicles yet" action={<Button onClick={() => setForm({ open: true, vehicle: null })}>Add your first vehicle</Button>}>
          Save your vehicle once, then book pickups in a few taps.
        </EmptyState>
      )}

      {data && data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((v) => (
            <li key={v.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-volt/10 text-volt-glow"><Icon type={v.type} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg text-white">{v.make} {v.model}</h2>{v.demo && <DemoBadge />}</div>
                    <p className="mt-0.5 inline-block rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-sm tracking-wider text-white">{v.registration}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-xs text-slate-400">Year</dt><dd className="text-white">{v.year}</dd></div>
                  <div><dt className="text-xs text-slate-400">Type</dt><dd className="text-white">{v.type}</dd></div>
                  <div><dt className="text-xs text-slate-400">Bookings</dt><dd className="text-white">{v.bookingCount}</dd></div>
                </dl>
                {v.notes && <p className="mt-3 line-clamp-2 text-sm text-slate-400">{v.notes}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Button as={Link} to={`/customer/bookings/new?vehicle=${v.id}`} size="sm">Book a pickup</Button>
                  <Button as={Link} to={`/customer/bookings?vehicle=${v.id}`} variant="secondary" size="sm">View bookings</Button>
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, vehicle: v })} aria-label={`Edit ${v.make} ${v.model}`}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setRmError(''); setRemoving(v); }} aria-label={`Remove ${v.make} ${v.model}`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <VehicleFormModal open={form.open} vehicle={form.vehicle} onClose={() => setForm({ open: false, vehicle: null })} onSaved={() => reload()} />
      <ConfirmDialog open={Boolean(removing)} danger loading={busy} error={rmError} title="Remove this vehicle?" confirmLabel="Remove vehicle" cancelLabel="Keep vehicle"
        body={removing && <>{removing.make} {removing.model} ({removing.registration}) will be removed from your saved vehicles. Past bookings keep their vehicle details.</>}
        onConfirm={remove} onClose={() => setRemoving(null)} />
    </div>
  );
}
