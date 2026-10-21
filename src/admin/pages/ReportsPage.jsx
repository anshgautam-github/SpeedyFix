import { useState } from 'react';
import { Download } from 'lucide-react';
import { adminServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Button, Card, CardHeader, DemoNotice, ErrorState, Skeleton, TextField, useToast } from '../../portal/ui';
import { statusLabel } from '../domain/model';

const Stat = ({ label, value, hint }) => <Card className="p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-display text-3xl text-white tabular-nums">{value}</p>{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</Card>;
const Bars = ({ rows }) => { const max = Math.max(1, ...rows.map((r) => r.count)); return <ul className="space-y-2.5">{rows.map((r) => <li key={r.label}><div className="flex justify-between text-sm"><span className="text-slate-200">{r.label}</span><span className="tabular-nums text-white">{r.count}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="presentation"><div className="h-full rounded-full bg-gradient-to-r from-volt to-volt-glow" style={{ width: `${(r.count / max) * 100}%` }} /></div></li>)}</ul>; };
const csv = (rows) => { const cols = Object.keys(rows[0] || {}); const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`; return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n'); };

export default function ReportsPage() {
  const toast = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: r, error, loading, reload } = useAsync(() => adminServices.reports.get({ from, to }), [from, to]);
  const exportCsv = async () => {
    setBusy(true);
    try { const rows = await adminServices.reports.exportBookings({ from, to }); if (!rows.length) { toast.push({ tone: 'rose', title: 'Nothing to export', message: 'No bookings in this range.' }); return; } const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `bookings-${from || 'start'}-${to || 'now'}.csv`; a.click(); URL.revokeObjectURL(url); toast.push({ title: 'Export ready', message: `${rows.length} rows, no customer personal data` }); }
    catch (e) { toast.push({ tone: 'rose', title: 'Export failed', message: e.message }); } finally { setBusy(false); }
  };
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load reports" />;
  const m = (v, u) => (v == null ? 'Not enough data' : `${v} ${u}`);
  return (
    <div className="space-y-6">
      <Card className="p-4"><div className="flex flex-wrap items-end gap-3"><TextField label="Created from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><TextField label="Created to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /><Button variant="secondary" onClick={exportCsv} loading={busy}><Download className="h-4 w-4" aria-hidden="true" />Export bookings CSV</Button></div><p className="mt-2 text-xs text-slate-400">The export has booking reference, registration, center, type, status, driver name, dates and exception types. It excludes customer names, phone numbers and addresses. Exports are logged.</p></Card>
      {loading && !r && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}</div>}
      {r && (
        <>
          {r.demo && <DemoNotice>Some of these records are demonstration data. Nothing here is a real operational result.</DemoNotice>}
          {r.total === 0 && <p className="text-slate-400">No bookings in this range, so there is nothing to report.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Bookings" value={r.total} hint={`${r.pickupOnly} pickup only · ${r.withDelivery} with delivery`} /><Stat label="Completed" value={r.completed} /><Stat label="Cancelled" value={r.cancelled} /><Stat label="Exceptions now" value={r.exceptions} /></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Avg pickup duration" value={m(r.avgPickupMinutes, 'min')} hint={`Driver assigned to picked up. ${r.pickupSample} booking${r.pickupSample === 1 ? '' : 's'} with both timestamps.`} /><Stat label="Avg delivery duration" value={m(r.avgDeliveryMinutes, 'min')} hint={`Delivery driver assigned to delivered. ${r.deliverySample} with both timestamps.`} /><Stat label="Avg work-order time" value={m(r.avgWorkOrderHours, 'h')} hint={`Started to completed. ${r.workOrderSample} with both timestamps.`} /><Stat label="Handover failures" value={r.failedHandovers} hint="Handovers with at least one failed code attempt that are not yet verified." /></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader title="Bookings by status" /><div className="px-5 py-5">{Object.keys(r.byStatus).length ? <Bars rows={Object.entries(r.byStatus).map(([k, count]) => ({ label: statusLabel(k), count }))} /> : <p className="text-sm text-slate-400">No data.</p>}</div></Card>
            <Card><CardHeader title="Bookings by day created" /><div className="px-5 py-5">{r.byDay.length ? <Bars rows={r.byDay.map((x) => ({ label: x.date, count: x.count }))} /> : <p className="text-sm text-slate-400">No data.</p>}</div></Card>
            <Card><CardHeader title="Volume by service center" /><div className="px-5 py-5">{Object.keys(r.byCenter).length ? <Bars rows={Object.entries(r.byCenter).map(([label, count]) => ({ label, count }))} /> : <p className="text-sm text-slate-400">No data.</p>}</div></Card>
            <Card><CardHeader title="Driver job counts" /><div className="px-5 py-5">{Object.keys(r.byDriver).length ? <Bars rows={Object.entries(r.byDriver).map(([label, count]) => ({ label, count }))} /> : <p className="text-sm text-slate-400">No completed driver jobs yet.</p>}</div></Card>
          </div>
          <Card className="p-5 text-sm text-slate-400"><p className="font-display text-white">How these are calculated</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Counts use the booking's created date within the range above.</li><li>Durations use recorded status timestamps. Bookings missing either timestamp are left out of the average.</li><li>Driver job counts are completed pickup handovers plus verified deliveries per driver.</li><li>Historical trends before records existed are not shown.</li></ul></Card>
        </>
      )}
    </div>
  );
}
