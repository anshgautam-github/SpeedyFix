import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, EmptyState, ErrorState, InlineAlert, SelectField, Skeleton } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { money } from '../domain/model';
import { useAdmin } from '../layout/AdminContext';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { SearchBox, useAdminList } from '../features/common2';

export default function WorkOrdersPage() {
  const { centers } = useAdmin();
  const [status, setStatus] = useState('all');
  const [centerId, setCenterId] = useState('');
  const [stalled, setStalled] = useState(false);
  const [text, setText] = useState('');
  const l = useAdminList(() => adminServices.workOrders.list({ status, centerId, query: text, stalledOnly: stalled }), [status, centerId, text, stalled]);
  const cols = [
    { key: 'ref', header: 'Work order', render: (w) => <span className="inline-flex flex-wrap items-center gap-2">{w.reference}{w.stalled && <Badge tone="amber">Stalled</Badge>}{w.demo && <Badge tone="amber">Demo</Badge>}</span> },
    { key: 'b', header: 'Booking', render: (w) => w.bookingRef },
    { key: 'v', header: 'Vehicle', render: (w) => w.vehicle },
    { key: 'c', header: 'Service center', render: (w) => w.center.name },
    { key: 't', header: 'Technician', render: (w) => w.technician || <span className="text-slate-400">Not assigned</span> },
    { key: 's', header: 'Status', render: (w) => <Badge tone={w.status === 'completed' ? 'green' : w.status === 'cancelled' ? 'rose' : 'blue'}>{w.status.replace(/_/g, ' ')}</Badge> },
    { key: 'st', header: 'Started', render: (w) => (w.startedAt ? fmtDateTime(w.startedAt) : '–') },
    { key: 'f', header: 'Completed', render: (w) => (w.completedAt ? fmtDateTime(w.completedAt) : '–') },
    { key: 'l', header: 'Labour', render: (w) => money(w.labour), className: 'tabular-nums' },
    { key: 'p', header: 'Parts', render: (w) => money(w.parts), className: 'tabular-nums' },
  ];
  return (
    <div className="space-y-5">
      <InlineAlert tone="blue">Read-only oversight. Workshop records are edited by the service centers. Labour and parts totals are workshop cost records, not payments.</InlineAlert>
      <div className="grid gap-3 sm:grid-cols-4"><div className="sm:col-span-2"><SearchBox value={text} onChange={setText} placeholder="Work order, booking or registration" label="Search work orders" /></div>
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option>{['new', 'accepted', 'assigned', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</SelectField>
        <SelectField label="Service center" value={centerId} onChange={(e) => setCenterId(e.target.value)}><option value="">All centers</option>{centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField></div>
      <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={stalled} onChange={(e) => setStalled(e.target.checked)} className="h-4 w-4 accent-[#1F6BFF]" />Show stalled work orders only</label>
      {l.error && <ErrorState error={l.error} onRetry={l.reload} title="Could not load work orders" />}
      {l.loading && <Skeleton className="h-48" />}
      {l.data && !l.data.length && <EmptyState icon={ClipboardList} title="No work orders match">Work orders appear after service centers receive vehicles.</EmptyState>}
      {l.data && l.data.length > 0 && <ResponsiveTable caption="Work orders" columns={cols} rows={l.data} href={(w) => `/admin/bookings/${w.bookingId}`} />}
    </div>
  );
}
