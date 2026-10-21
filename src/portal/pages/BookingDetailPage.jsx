import { Link, useParams } from 'react-router-dom';
import { Card, CardHeader, DemoBadge, ErrorState, Skeleton, StageTimeline, StatusBadge, Button } from '../ui';
import { services } from '../services';
import { useAsync, usePolling } from '../hooks/useAsync';
import { isOpen } from '../domain/status';
import { fmtDate, fmtDateTime } from '../lib/format';
import BookingActions from '../features/booking/BookingActions';
import HandoverPanel from '../features/handover/HandoverPanel';
import ServiceProgress from '../features/service/ServiceProgress';
import { DetailRow, DriverBlock } from '../features/booking/parts';

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const { data: b, error, loading, reload, setData } = useAsync(() => services.bookings.get(bookingId), [bookingId]);
  usePolling(() => reload(true), 10000, Boolean(b && isOpen(b)));
  const changed = (updated) => (updated ? setData(updated) : reload(true));

  if (loading && !b) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (error) return (
    <div className="space-y-4">
      <ErrorState error={error} onRetry={error.code === 'NOT_FOUND' ? undefined : reload} title={error.code === 'NOT_FOUND' ? 'Booking not found' : 'Could not load this booking'} />
      <div className="text-center"><Button as={Link} to="/customer/bookings" variant="secondary">Back to my bookings</Button></div>
    </div>
  );
  if (!b) return null;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl text-white">{b.reference}</h2><StatusBadge status={b.status} />{b.demo && <DemoBadge />}
        </div>
        <p className="mt-1 text-slate-300">{b.vehicle.make} {b.vehicle.model} &middot; {b.vehicle.registration} &middot; {b.serviceType}</p>
        <div className="mt-4"><BookingActions booking={b} onChanged={changed} hideView /></div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <HandoverPanel booking={b} onChanged={changed} />
          <ServiceProgress bookingId={b.id} status={b.status} />
          <Card>
            <CardHeader title="Booking progress" action={isOpen(b) ? <Link to={`/customer/tracking/${b.id}`} className="text-sm text-volt-glow hover:underline">Open tracking</Link> : null} />
            <div className="px-5 py-5"><StageTimeline booking={b} /></div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="divide-y divide-white/10 px-5">
              <DetailRow label="Booked">{fmtDateTime(b.createdAt)}</DetailRow>
              <DetailRow label="Last updated">{fmtDateTime(b.updatedAt)}</DetailRow>
              <DetailRow label="Pickup">{fmtDate(b.pickup.date)}, {b.pickup.slot}</DetailRow>
              <DetailRow label="Pickup address">{b.pickup.address}, {b.pickup.city} {b.pickup.postalCode}{b.pickup.landmark ? ` (${b.pickup.landmark})` : ''}</DetailRow>
              <DetailRow label="Contact phone">{b.pickup.phone}</DetailRow>
              <DetailRow label="Service center">{b.center.name}<span className="block text-slate-400">{b.center.address}</span></DetailRow>
              <DetailRow label="Notes">{[b.serviceNotes, b.pickup.instructions].filter(Boolean).join(' / ')}</DetailRow>
              <DetailRow label="Delivery">{b.delivery ? `${fmtDate(b.delivery.date)}, ${b.delivery.slot}, ${b.delivery.address}` : null}</DetailRow>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Drivers" />
            <div className="space-y-4 px-5 py-5">
              <DriverBlock driver={b.driver} title="Pickup driver" />
              {(b.deliveryDriver || b.delivery) && <DriverBlock driver={b.deliveryDriver} title="Delivery driver" />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
