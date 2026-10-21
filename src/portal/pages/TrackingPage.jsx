import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { services, demoTools } from '../services';
import { useAsync, usePolling } from '../hooks/useAsync';
import { Button, Card, CardHeader, DemoBadge, DemoNotice, EmptyState, ErrorState, InlineAlert, JourneyStrip, Skeleton, StageTimeline, StatusBadge, useToast } from '../ui';
import { isOpen, statusMeta } from '../domain/status';
import { fmtDate, relativeTime } from '../lib/format';
import { notifyChanged } from '../lib/events';
import HandoverPanel from '../features/handover/HandoverPanel';
import { DriverBlock } from '../features/booking/parts';

export function TrackingIndex() {
  const { data, error, loading, reload } = useAsync(() => services.bookings.summary(), []);
  if (loading) return <Skeleton className="h-48" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data.featured) return <Navigate to={`/customer/tracking/${data.featured.id}`} replace />;
  return (
    <EmptyState icon={Navigation} title="Nothing to track right now" action={<Button as={Link} to="/customer/bookings/new">Book a pickup</Button>}>
      When you have an open booking, you can follow it here. Past bookings are in My Bookings.
    </EmptyState>
  );
}

function Place({ label, title, lines }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-volt/10 text-volt-glow"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 text-sm"><p className="text-xs text-slate-400">{label}</p><p className="font-semibold text-white">{title}</p>{lines.filter(Boolean).map((l) => <p key={l} className="text-slate-300">{l}</p>)}</div>
    </div>
  );
}

export default function TrackingPage() {
  const { bookingId } = useParams();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload, setData } = useAsync(() => services.tracking.get(bookingId), [bookingId]);
  const b = data?.booking;
  usePolling(() => reload(true), 8000, Boolean(b && isOpen(b)));
  const changed = (updated) => (updated ? setData({ ...data, booking: updated, lastUpdated: updated.updatedAt }) : reload(true));

  const advance = async () => {
    setBusy(true);
    try {
      const r = await demoTools.advance(b.id);
      notifyChanged();
      setData({ ...data, booking: r.booking, lastUpdated: r.booking.updatedAt });
      toast.push(r.blocked ? { tone: 'rose', title: 'Waiting for you', message: r.blocked } : { title: 'Simulated update applied', message: statusMeta(r.booking.status).label });
    } catch (e) { toast.push({ tone: 'rose', title: 'Could not update', message: e.message }); } finally { setBusy(false); }
  };

  if (loading && !b) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (error) return <div className="space-y-4"><ErrorState error={error} onRetry={error.code === 'NOT_FOUND' ? undefined : reload} title={error.code === 'NOT_FOUND' ? 'Booking not found' : 'Could not load tracking'} /><div className="text-center"><Button as={Link} to="/customer/bookings" variant="secondary">My bookings</Button></div></div>;
  if (!b) return null;

  const meta = statusMeta(b.status);
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl text-white">{b.reference}</h2><StatusBadge status={b.status} />{b.demo && <DemoBadge />}</div>
            <p className="mt-1 text-slate-300">{b.vehicle.make} {b.vehicle.model} &middot; {b.vehicle.registration}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => reload(true)} aria-label="Refresh status"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</Button>
            <Button as={Link} to={`/customer/bookings/${b.id}`} variant="ghost" size="sm">Booking details <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[.02] px-4 py-5"><JourneyStrip status={b.status} /></div>
      </Card>

      <HandoverPanel booking={b} onChanged={changed} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Journey stages" />
          <div className="px-5 py-5"><StageTimeline booking={b} /></div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Last known status" />
            <div className="space-y-3 px-5 py-5">
              <p className="font-display text-lg text-white">{meta.label}</p>
              <p className="text-sm text-slate-400">Updated {relativeTime(data.lastUpdated)}. This page refreshes automatically.</p>
              {!data.liveLocation && <InlineAlert tone="blue">Live vehicle location is not available. This page shows the last known status of your booking, not a map position.</InlineAlert>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Route" />
            <div className="space-y-4 px-5 py-5">
              <Place label="Pickup" title={b.pickup.address} lines={[`${b.pickup.city} ${b.pickup.postalCode}`, b.pickup.landmark, `${fmtDate(b.pickup.date)}, ${b.pickup.slot}`]} />
              <Place label="Service center" title={b.center.name} lines={[b.center.address]} />
              {b.delivery && <Place label="Delivery" title={b.delivery.address} lines={[`${fmtDate(b.delivery.date)}, ${b.delivery.slot}`]} />}
            </div>
          </Card>
          <Card>
            <CardHeader title="Driver" />
            <div className="px-5 py-5"><DriverBlock driver={['delivery_driver_assigned', 'out_for_delivery'].includes(b.status) ? b.deliveryDriver : b.driver} /></div>
          </Card>
          {demoTools && (
            <Card className="border-amber-400/25">
              <CardHeader title="Demo controls" action={<DemoBadge />} />
              <div className="space-y-3 px-5 py-5">
                <DemoNotice>In production, drivers and the service center move your booking forward. Here you can simulate their updates to try the flow. Steps that need you (handover codes, scheduling delivery) will wait for you.</DemoNotice>
                <Button variant="secondary" onClick={advance} loading={busy} disabled={!isOpen(b)} className="w-full">Simulate the next update</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
