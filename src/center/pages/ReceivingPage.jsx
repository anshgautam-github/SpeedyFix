import { Link } from 'react-router-dom';
import { PackageCheck } from 'lucide-react';
import { centerServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';

/** Vehicles that are on their way or have arrived. Receiving itself happens on the booking page. */
export default function ReceivingPage() {
  const { data, error, loading, reload } = useAsync(() => centerServices.receiving.list(), []);
  usePolling(() => reload(true), 10000);
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-slate-400">Vehicles coming to your workshop. You can receive a vehicle once the driver has recorded arrival. Receiving creates the work order for the visit.</p>
      {error && <ErrorState error={error} onRetry={reload} title="Could not load incoming vehicles" />}
      {loading && !data && <Skeleton className="h-40" />}
      {data && !data.length && <EmptyState icon={PackageCheck} title="No vehicles on the way">Vehicles appear here after a driver collects them.</EmptyState>}
      {data && data.length > 0 && <ul className="space-y-3">{data.map((b) => (
        <li key={b.id}><Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <div className="min-w-0 flex-1"><p className="font-display text-white">{b.vehicle.registration} · {b.vehicle.make} {b.vehicle.model}</p><p className="text-sm text-slate-400">{b.customer.name} · {b.reference}{b.driver ? ` · driver ${b.driver.name}` : ''}</p></div>
          {b.arrived ? <Badge tone="amber">Arrived {fmtDateTime(b.driverArrivedAt)}</Badge> : <Badge>On the way</Badge>}
          <Button as={Link} to={`/service-center/bookings/${b.id}`} variant={b.arrived ? 'primary' : 'secondary'} size="sm">{b.arrived ? 'Receive vehicle' : 'View booking'}</Button>
        </Card></li>))}</ul>}
    </div>
  );
}
