import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ClipboardList, Plus } from 'lucide-react';
import { centerServices, centerDemo } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { PageHeader, Badge, Button, Card, CardHeader, DemoNotice, EmptyState, ErrorState, Skeleton, useToast } from '../../portal/ui';
import { relativeTime } from '../../portal/lib/format';
import { useCenter } from '../layout/CenterContext';
import { BookingBadge, WoBadge } from '../features/badges';
import { notifyChanged } from '../../portal/lib/events';

const Stat = ({ label, value, tone = 'text-white' }) => <Card className="p-4"><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 font-display text-3xl tabular-nums ${tone}`}>{value}</p></Card>;

function WorkshopList({ title, items, empty }) {
  return (
    <Card>
      <CardHeader title={`${title} (${items.length})`} />
      <ul className="divide-y divide-white/10">
        {items.map((w) => <li key={w.id}><Link to={`/service-center/work-orders/${w.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/5"><span className="min-w-0"><span className="block truncate text-sm text-white">{w.vehicle.registration} · {w.vehicle.make} {w.vehicle.model}</span><span className="text-xs text-slate-400">{w.technician ? w.technician.name : 'No technician yet'}</span></span><WoBadge status={w.status} /></Link></li>)}
        {!items.length && <li className="px-5 py-5 text-center text-sm text-slate-400">{empty}</li>}
      </ul>
    </Card>
  );
}

export default function DashboardPage() {
  const { center, can, reload: reloadCenter } = useCenter();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);
  const q = useAsync(() => centerServices.dashboard.get(), []);
  usePolling(() => q.reload(true), 12000);
  const d = q.data;
  const seed = async () => { setSeeding(true); try { await centerDemo.seed(); notifyChanged(); reloadCenter(); await q.reload(); } catch (e) { toast.push({ tone: 'rose', title: 'Could not load sample data', message: e.message }); } finally { setSeeding(false); } };

  return (
    <div className="space-y-6">
      <PageHeader title={center.name} description="Bookings, workshop and the jobs that need your team today." actions={can('bookings.create') && <Button as={Link} to="/service-center/bookings/new" size="lg"><Plus className="h-5 w-5" aria-hidden="true" />Create booking</Button>} />
      {q.error && <ErrorState error={q.error} onRetry={q.reload} title="Could not load the dashboard" />}
      {q.loading && !d && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}

      {d && d.totalBookings === 0 && (
        <EmptyState icon={ClipboardList} title="No bookings yet" action={<>{can('bookings.create') && <Button as={Link} to="/service-center/bookings/new">Create a pickup booking</Button>}{centerDemo && can('settings.manage') && <Button variant="secondary" loading={seeding} onClick={seed}>Load demo sample data</Button>}</>}>
          Create a pickup booking to bring a customer's vehicle to your workshop. Bookings customers make for your center appear here too.
        </EmptyState>
      )}

      {d && d.totalBookings > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Bookings today" value={d.counts.bookingsToday} />
            <Stat label="Pending pickups" value={d.counts.pendingPickup} />
            <Stat label="Vehicles on the way" value={d.counts.awaitingArrival} />
            <Stat label="Awaiting delivery" value={d.counts.awaitingDelivery} />
            <Stat label="Open work orders" value={d.counts.openWorkOrders} />
            <Stat label="In progress" value={d.counts.inProgress} tone="text-volt-glow" />
            <Stat label="Completed services" value={d.counts.completedServices} tone="text-emerald-300" />
            <Stat label="Vehicles in workshop" value={d.workshop.vehicles.length} />
          </div>

          <Card>
            <CardHeader title={`Needs your attention (${d.attention.length})`} />
            <ul className="divide-y divide-white/10">
              {d.attention.map((a) => (
                <li key={a.id}><Link to={a.workOrderId && a.kind !== 'delivery' ? `/service-center/work-orders/${a.workOrderId}` : `/service-center/bookings/${a.bookingId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5"><AlertCircle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" /><span className="flex-1 text-sm text-slate-100">{a.text}</span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /></Link></li>
              ))}
              {!d.attention.length && <li className="px-5 py-6 text-center text-sm text-slate-400">Nothing needs attention right now.</li>}
            </ul>
          </Card>

          <section aria-labelledby="ws-h" className="space-y-3">
            <h2 id="ws-h" className="font-display text-base text-white">Workshop</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <WorkshopList title="Jobs in progress" items={d.workshop.inProgress} empty="No jobs in progress." />
              <WorkshopList title="Waiting for parts" items={d.workshop.waitingParts} empty="No jobs waiting for parts." />
              <WorkshopList title="Awaiting quality check" items={d.workshop.qualityCheck} empty="No jobs awaiting a quality check." />
              <WorkshopList title="Ready for delivery" items={d.workshop.readyForDelivery} empty="No completed jobs waiting." />
            </div>
          </section>

          <Card>
            <CardHeader title="Recent bookings" action={<Link to="/service-center/bookings" className="text-sm text-volt-glow hover:underline">All bookings</Link>} />
            <ul className="divide-y divide-white/10">{d.recent.map((b) => <li key={b.id}><Link to={`/service-center/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-white/5"><span className="text-sm font-semibold text-white">{b.reference}</span><span className="text-sm text-slate-300">{b.vehicle.registration} · {b.customer.name}</span><BookingBadge statusKey={b.statusKey} />{b.demo && <Badge tone="amber">Demo</Badge>}<span className="ml-auto text-xs text-slate-400">{relativeTime(b.updatedAt)}</span></Link></li>)}</ul>
          </Card>
          {d.recent.some((b) => b.demo) && <DemoNotice>Some records on this dashboard are demonstration data.</DemoNotice>}
        </>
      )}
      {centerDemo && can('settings.manage') && d && d.totalBookings > 0 && (
        <Card className="border-amber-400/25"><CardHeader title="Demo controls" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5"><DemoNotice className="flex-1">Adds simulated bookings, work orders and technicians for this center so you can try the workshop flow. Safe to press more than once.</DemoNotice><Button variant="secondary" loading={seeding} onClick={seed}>Load demo sample data</Button></div></Card>
      )}
    </div>
  );
}
