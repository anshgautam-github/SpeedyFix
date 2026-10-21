import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, EmptyState, ErrorState, Skeleton, SelectField, TextField } from '../../portal/ui';
import { fmtDate, relativeTime } from '../../portal/lib/format';
import { BOOKING_FILTERS } from '../domain/model';
import { useAdmin } from '../layout/AdminContext';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { Chips, FlagBadges, SearchBox, StatusBadge, useDebounced, usePagedList } from '../features/common';
import { useAsync } from '../../portal/hooks/useAsync';

export default function BookingsPage() {
  const { centers } = useAdmin();
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [centerId, setCenterId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = useDebounced(text);
  const drivers = useAsync(() => adminServices.drivers.list({}).catch(() => []), []);
  const l = usePagedList(({ cursor }) => adminServices.bookings.list({ status, query, centerId, driverId, from, to, cursor, limit: 10 }), [status, query, centerId, driverId, from, to]);
  const cols = [
    { key: 'ref', header: 'Booking', render: (b) => <span className="inline-flex flex-wrap items-center gap-2">{b.reference}{b.demo && <Badge tone="amber">Demo</Badge>}</span> },
    { key: 'cust', header: 'Customer', render: (b) => b.customer.name },
    { key: 'veh', header: 'Vehicle', render: (b) => <span>{b.vehicle.registration}<span className="block text-xs text-slate-400">{b.vehicle.make} {b.vehicle.model}</span></span> },
    { key: 'c', header: 'Service center', render: (b) => b.center.name },
    { key: 't', header: 'Type', render: (b) => b.type },
    { key: 'd', header: 'Driver', render: (b) => b.deliveryDriver?.name || b.driver?.name || <span className="text-slate-400">Unassigned</span> },
    { key: 's', header: 'Scheduled', render: (b) => `${fmtDate(b.schedule.date)}, ${b.schedule.slot}` },
    { key: 'st', header: 'Status', render: (b) => <span className="flex flex-col items-start gap-1"><StatusBadge statusKey={b.statusKey} /><FlagBadges flags={b.flags} /></span> },
    { key: 'u', header: 'Updated', render: (b) => relativeTime(b.updatedAt) },
  ];
  const filtered = status !== 'all' || query || centerId || driverId || from || to;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2"><SearchBox value={text} onChange={setText} placeholder="Booking reference, registration or customer" label="Search bookings" /></div>
        <SelectField label="Service center" value={centerId} onChange={(e) => setCenterId(e.target.value)}><option value="">All centers</option>{centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
        <SelectField label="Driver" value={driverId} onChange={(e) => setDriverId(e.target.value)}><option value="">All drivers</option>{(drivers.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</SelectField>
        <div className="grid grid-cols-2 gap-2"><TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <Chips options={BOOKING_FILTERS} value={status} onChange={setStatus} label="Booking status" />
      {l.error && <ErrorState error={l.error} onRetry={() => l.reload()} title="Could not load bookings" />}
      {l.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      {!l.loading && !l.error && !l.items.length && <EmptyState icon={ListChecks} title={filtered ? 'No bookings match' : 'No bookings yet'} action={filtered ? <Button variant="secondary" onClick={() => { setStatus('all'); setText(''); setCenterId(''); setDriverId(''); setFrom(''); setTo(''); }}>Clear filters</Button> : null}>{filtered ? 'Try different filters.' : 'Bookings from every center and customer appear here.'}</EmptyState>}
      {!l.loading && l.items.length > 0 && (<><p className="text-sm text-slate-400" aria-live="polite">{l.total} {l.total === 1 ? 'booking' : 'bookings'}</p><ResponsiveTable caption="Bookings" columns={cols} rows={l.items} href={(b) => `/admin/bookings/${b.id}`} />{l.next != null && <div className="text-center"><Button variant="secondary" loading={l.more} onClick={l.loadMore}>Load more</Button></div>}</>)}
    </div>
  );
}
