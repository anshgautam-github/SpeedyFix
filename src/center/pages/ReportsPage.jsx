import { centerServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Card, CardHeader, DemoNotice, ErrorState, Skeleton } from '../../portal/ui';
import { BOOKING_FILTERS, money } from '../domain/model';

const Stat = ({ label, value, hint }) => <Card className="p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-display text-3xl text-white tabular-nums">{value}</p>{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</Card>;

export default function ReportsPage() {
  const { data: r, error, loading, reload } = useAsync(() => centerServices.reports.get(), []);
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load reports" />;
  if (loading || !r) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  const max = Math.max(1, ...Object.values(r.byStatus));
  return (
    <div className="space-y-6">
      {r.demo && <DemoNotice>Some of the records behind these figures are demonstration data. Nothing here is a real operational result.</DemoNotice>}
      {r.total === 0 && <p className="text-slate-400">No bookings yet, so there is nothing to report.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total bookings" value={r.total} />
        <Stat label="Completed work orders" value={r.completedWorkOrders} />
        <Stat label="Vehicles in the workshop" value={r.inWorkshop} />
        <Stat label="Pending deliveries" value={r.pendingDeliveries} />
        <Stat label="Average service duration" value={r.avgServiceHours != null ? `${r.avgServiceHours} h` : 'Not enough data'} hint={r.avgServiceHours != null ? `From ${r.timedSample} completed work ${r.timedSample === 1 ? 'order' : 'orders'} with start and finish times` : 'Needs completed work orders with timestamps'} />
        <Stat label="Labour and parts" value={money(r.labourTotal + r.partsTotal)} hint={`Labour ${money(r.labourTotal)} · Parts ${money(r.partsTotal)}. Workshop cost records, not payments.`} />
      </div>
      <Card><CardHeader title="Bookings by status" />
        <ul className="space-y-3 px-5 py-5">{BOOKING_FILTERS.filter((f) => f.key !== 'all').map((f) => { const n = r.byStatus[f.key] || 0; return (
          <li key={f.key}><div className="flex justify-between text-sm"><span className="text-slate-200">{f.label}</span><span className="tabular-nums text-white">{n}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="presentation"><div className="h-full rounded-full bg-gradient-to-r from-volt to-volt-glow" style={{ width: `${(n / max) * 100}%` }} /></div></li>); })}</ul>
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Current counts only. Historical trends are not shown because they are not stored.</p></Card>
    </div>
  );
}
