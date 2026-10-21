import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CalendarPlus, CarFront, CheckCircle2, ListChecks, Truck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { services, demoTools } from '../services';
import { useAsync, usePolling } from '../hooks/useAsync';
import { PageHeader, Button, Card, CardHeader, DemoBadge, EmptyState, ErrorState, JourneyStrip, Skeleton, StatusBadge, useToast } from '../ui';
import { firstName, fmtDate, greeting, relativeTime } from '../lib/format';
import { pendingHandover } from '../domain/status';
import BookingListItem from '../features/booking/BookingListItem';
import { DriverBlock } from '../features/booking/parts';
import { notifyChanged } from '../lib/events';
import { IS_DEMO } from '../config';
import { useState } from 'react';

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div>
      <p className="mt-3 font-display text-3xl text-white tabular-nums">{value}</p>
    </Card>
  );
}

function ActiveBooking({ b }) {
  const needs = pendingHandover(b);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 bg-gradient-to-r from-volt/[.12] to-transparent px-5 py-4">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-base text-white">Active booking</h2><StatusBadge status={b.status} />{b.demo && <DemoBadge />}</div>
      </div>
      <div className="space-y-5 px-5 py-5">
        {needs && (
          <Link to={`/customer/tracking/${b.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 hover:bg-amber-400/15">
            <span><strong className="font-semibold">Action needed:</strong> verify the {needs === 'pickup' ? 'pickup' : 'delivery'} handover.</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-slate-400">Vehicle</p><p className="text-sm font-semibold text-white">{b.vehicle.make} {b.vehicle.model}</p><p className="text-sm text-slate-300">{b.vehicle.registration}</p></div>
          <div><p className="text-xs text-slate-400">Booking reference</p><p className="text-sm font-semibold text-white">{b.reference}</p></div>
          <div><p className="text-xs text-slate-400">Service center</p><p className="text-sm text-white">{b.center.name}</p></div>
          <div><p className="text-xs text-slate-400">Pickup</p><p className="text-sm text-white">{fmtDate(b.pickup.date)}</p><p className="text-sm text-slate-300">{b.pickup.slot}</p></div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><DriverBlock driver={b.driver} /></div>
        <div className="rounded-xl border border-white/10 bg-white/[.02] px-4 py-5"><JourneyStrip status={b.status} /></div>
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={`/customer/tracking/${b.id}`}>Track vehicle</Button>
          <Button as={Link} to={`/customer/bookings/${b.id}`} variant="secondary">View booking</Button>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);
  const summary = useAsync(() => services.bookings.summary(), []);
  const feed = useAsync(() => services.notifications.list({ limit: 6 }), []);
  usePolling(() => { summary.reload(true); feed.reload(true); }, 12000);

  const seed = async () => {
    setSeeding(true);
    try { await demoTools.seedSample(); notifyChanged(); await Promise.all([summary.reload(), feed.reload()]); }
    catch (e) { toast.push({ tone: 'rose', title: 'Could not load sample data', message: e.message }); }
    finally { setSeeding(false); }
  };

  const s = summary.data;
  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}, ${firstName(user?.name)}`} description="Your vehicle journey, all in one place." actions={<Button as={Link} to="/customer/bookings/new" size="lg"><CalendarPlus className="h-5 w-5" aria-hidden="true" /> Book a pickup</Button>} />

      {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} title="Could not load your dashboard" />}

      {summary.loading && !s && (
        <div className="space-y-6"><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>
      )}

      {s && s.total === 0 && (
        <EmptyState icon={CarFront} title="Let's get your first pickup booked"
          action={<><Button as={Link} to="/customer/vehicles">Add a vehicle</Button><Button as={Link} to="/customer/bookings/new" variant="secondary">Book a pickup</Button>{IS_DEMO && <Button variant="ghost" onClick={seed} loading={seeding}>Load demo sample data</Button>}</>}>
          Add your vehicle, choose a service center and schedule a pickup. A driver collects the car and you can follow every step here.
        </EmptyState>
      )}

      {s && s.total > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat icon={ListChecks} label="Total bookings" value={s.total} tone="bg-volt/15 text-volt-glow" />
            <Stat icon={Truck} label="Active bookings" value={s.active} tone="bg-amber-400/10 text-amber-300" />
            <Stat icon={CalendarClock} label="Upcoming pickups" value={s.upcoming} tone="bg-slate-400/10 text-slate-300" />
            <Stat icon={CheckCircle2} label="Completed services" value={s.completed} tone="bg-emerald-400/10 text-emerald-300" />
          </div>

          {s.featured ? <ActiveBooking b={s.featured} /> : (
            <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-display text-base text-white">No active booking</h2><p className="text-sm text-slate-400">Everything is delivered. Book another pickup whenever you need one.</p></div>
              <Button as={Link} to="/customer/bookings/new" variant="secondary">Book a pickup</Button>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section aria-labelledby="recent-h" className="space-y-3">
              <div className="flex items-center justify-between"><h2 id="recent-h" className="font-display text-base text-white">Recent bookings</h2><Link to="/customer/bookings" className="text-sm text-volt-glow hover:underline">View all</Link></div>
              {s.recent.map((b) => <BookingListItem key={b.id} booking={b} compact />)}
            </section>
            <Card className="self-start">
              <CardHeader title="Activity" action={<Link to="/customer/notifications" className="text-sm text-volt-glow hover:underline">All</Link>} />
              <ul className="divide-y divide-white/10">
                {(feed.data || []).map((n) => (
                  <li key={n.id}><Link to={`/customer/bookings/${n.bookingId}`} className="block px-5 py-3 hover:bg-white/5"><p className="text-sm text-slate-100">{n.message}</p><p className="text-xs text-slate-400">{n.reference} &middot; {relativeTime(n.createdAt)}</p></Link></li>
                ))}
                {feed.data && !feed.data.length && <li className="px-5 py-8 text-center text-sm text-slate-400">Updates about your bookings appear here.</li>}
                {feed.loading && !feed.data && <li className="space-y-2 px-5 py-4"><Skeleton className="h-4" /><Skeleton className="h-4 w-2/3" /></li>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
