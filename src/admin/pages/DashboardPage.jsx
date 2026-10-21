import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { adminServices, adminDemo } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { PageHeader, Badge, Button, Card, CardHeader, DemoNotice, EmptyState, ErrorState, SelectField, Skeleton, TextField, useToast } from '../../portal/ui';
import { relativeTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { BOOKING_FILTERS, statusLabel } from '../domain/model';
import { useAdmin } from '../layout/AdminContext';
import { FlagBadges, StatusBadge } from '../features/common';

const Stat = ({ label, value, tone = 'text-white' }) => <Card className="p-4"><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 font-display text-3xl tabular-nums ${tone}`}>{value}</p></Card>;

function BookingList({ title, items, empty }) {
  return (
    <Card><CardHeader title={`${title} (${items.length})`} />
      <ul className="divide-y divide-white/10">
        {items.map((b) => <li key={b.id}><Link to={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-white/5"><span className="text-sm font-semibold text-white">{b.reference}</span><span className="text-sm text-slate-300">{b.vehicle.registration}</span><span className="text-xs text-slate-400">{b.center.name}</span><span className="ml-auto flex items-center gap-2"><FlagBadges flags={b.flags} /><StatusBadge statusKey={b.statusKey} /></span></Link></li>)}
        {!items.length && <li className="px-5 py-5 text-center text-sm text-slate-400">{empty}</li>}
      </ul></Card>
  );
}
const Bars = ({ rows, label }) => { const max = Math.max(1, ...rows.map((r) => r.count)); return <ul className="space-y-2.5" aria-label={label}>{rows.map((r) => <li key={r.key}><div className="flex justify-between text-xs"><span className="text-slate-300">{r.label}</span><span className="tabular-nums text-white">{r.count}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="presentation"><div className="h-full rounded-full bg-gradient-to-r from-volt to-volt-glow" style={{ width: `${(r.count / max) * 100}%` }} /></div></li>)}</ul>; };

export default function DashboardPage() {
  const { centers, can } = useAdmin();
  const toast = useToast();
  const [f, setF] = useState({ status: 'all', centerId: '', type: 'all', from: '', to: '' });
  const [seeding, setSeeding] = useState(false);
  const q = useAsync(() => adminServices.dashboard.get(f), [f.status, f.centerId, f.type, f.from, f.to]);
  usePolling(() => q.reload(true), 12000);
  const d = q.data;
  const seed = async () => { setSeeding(true); try { await adminDemo.seed(); notifyChanged(); await q.reload(); } catch (e) { toast.push({ tone: 'rose', title: 'Could not load sample data', message: e.message }); } finally { setSeeding(false); } };
  const vol = d?.charts.volumeByDay.map((x) => ({ key: x.date, label: x.date.slice(5), count: x.count })) || [];
  const dist = d ? Object.entries(d.charts.statusDistribution).map(([k, count]) => ({ key: k, label: statusLabel(k), count })) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Platform operations" description="Bookings, drivers and service centers across the platform, and the jobs that need attention." />
      <Card className="p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{BOOKING_FILTERS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</SelectField>
        <SelectField label="Service center" value={f.centerId} onChange={(e) => setF({ ...f, centerId: e.target.value })}><option value="">All centers</option>{centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
        <SelectField label="Booking type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="all">All</option><option value="pickup">Pickup only</option><option value="delivery">With delivery</option></SelectField>
        <TextField label="Scheduled from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /><TextField label="Scheduled to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
      </div><p className="mt-2 text-xs text-slate-400">Filters apply to the live lists and charts. Platform totals in the cards are shown for everything, except the booking cards which follow the filters.</p></Card>

      {q.error && <ErrorState error={q.error} onRetry={q.reload} title="Could not load the dashboard" />}
      {q.loading && !d && <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {d && d.total === 0 && <EmptyState icon={LayoutDashboard} title="No bookings on the platform yet" action={adminDemo && can('settings.manage') ? <Button variant="secondary" loading={seeding} onClick={seed}>Load demo sample data</Button> : null}>Customer, driver and service-center portals create the records you see here. In demo mode you can add sample drivers and centers to try approvals and dispatch.</EmptyState>}

      {d && d.total > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Customers" value={d.counts.customers} /><Stat label="Active drivers" value={d.counts.activeDrivers} /><Stat label="Approved centers" value={d.counts.approvedCenters} /><Stat label="Bookings today" value={d.counts.bookingsToday} /><Stat label="Pending assignment" value={d.counts.pending} tone={d.counts.pending ? 'text-amber-300' : 'text-white'} />
            <Stat label="Active pickups" value={d.counts.activePickups} /><Stat label="Active deliveries" value={d.counts.activeDeliveries} /><Stat label="In transit" value={d.counts.inTransit} tone="text-volt-glow" /><Stat label="Open work orders" value={d.counts.openWorkOrders} /><Stat label="Completed" value={d.counts.completed} tone="text-emerald-300" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <BookingList title="Needs intervention" items={d.live.exceptions} empty="No delayed or stuck jobs." />
            <BookingList title="Awaiting driver assignment" items={d.live.awaitingAssignment} empty="Every job has a driver." />
            <Card><CardHeader title={`Drivers on jobs (${d.live.driversOnJobs.length})`} /><ul className="divide-y divide-white/10">{d.live.driversOnJobs.map((x) => <li key={x.id} className="flex items-center justify-between px-5 py-3 text-sm"><span className="text-white">{x.name}</span><Badge tone="amber">{x.activeJobs} active</Badge></li>)}{!d.live.driversOnJobs.length && <li className="px-5 py-5 text-center text-sm text-slate-400">No driver is on a job.</li>}</ul></Card>
            <BookingList title="Vehicles in transit to a center" items={d.live.awaitingReceipt} empty="No vehicle is in transit." />
            <BookingList title="Ready for delivery" items={d.live.readyForDelivery} empty="No vehicle is waiting for a delivery request." />
            <BookingList title="Recently created" items={d.live.recent} empty="No bookings." />
            <BookingList title="Recently completed" items={d.live.recentCompleted} empty="No completed jobs yet." />
            <Card><CardHeader title="Recent activity" /><ul className="divide-y divide-white/10">{d.activity.slice(0, 8).map((a) => <li key={a.id}>{a.bookingId ? <Link to={`/admin/bookings/${a.bookingId}`} className="block px-5 py-2.5 hover:bg-white/5"><span className="block text-sm text-slate-100">{a.text}</span><span className="text-xs text-slate-400">{relativeTime(a.at)}</span></Link> : <div className="px-5 py-2.5"><span className="block text-sm text-slate-100">{a.text}</span><span className="text-xs text-slate-400">{relativeTime(a.at)}</span></div>}</li>)}</ul></Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader title="Bookings created, last 7 days" /><div className="px-5 py-5">{vol.some((v) => v.count) ? <Bars rows={vol} label="Bookings per day" /> : <p className="text-sm text-slate-400">No bookings were created in the last 7 days.</p>}</div></Card>
            <Card><CardHeader title="Status distribution" /><div className="px-5 py-5">{dist.length ? <Bars rows={dist} label="Status distribution" /> : <p className="text-sm text-slate-400">Nothing matches the filters.</p>}</div></Card>
          </div>
          <p className="text-xs text-slate-400">Exception thresholds in use: unassigned {d.thresholds.unassignedMinutes} min, pickup delay {d.thresholds.pickupDelayMinutes} min after the slot, receipt {d.thresholds.receiptDelayMinutes} min, stalled work order {d.thresholds.stalledWorkOrderHours} h. These are configurable defaults, not service-level guarantees.</p>
          {d.demo && <DemoNotice>Some records are demonstration data.</DemoNotice>}
          {adminDemo && can('settings.manage') && !d.seeded && <Card className="border-amber-400/25"><CardHeader title="Demo controls" /><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5"><DemoNotice className="flex-1">Adds sample drivers (one pending, one suspended) and service-center applications so you can try approvals and dispatch.</DemoNotice><Button variant="secondary" loading={seeding} onClick={seed}>Load demo sample data</Button></div></Card>}
        </>
      )}
    </div>
  );
}
