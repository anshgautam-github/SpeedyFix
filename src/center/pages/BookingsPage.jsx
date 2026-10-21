import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Plus, Search } from 'lucide-react';
import { centerServices } from '../services';
import { Badge, Button, EmptyState, ErrorState, Skeleton, cx } from '../../portal/ui';
import { fmtDate, relativeTime } from '../../portal/lib/format';
import { BOOKING_FILTERS } from '../domain/model';
import { useCenter } from '../layout/CenterContext';
import ResponsiveTable from '../features/ResponsiveTable';
import { BookingBadge, PriorityBadge, WoBadge } from '../features/badges';

export default function BookingsPage() {
  const { can } = useCenter();
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ items: [], total: 0, next: null, loading: true, more: false, error: null });
  const req = useRef(0);
  useEffect(() => { const t = setTimeout(() => setQuery(text), 300); return () => clearTimeout(t); }, [text]);
  const load = useCallback(async ({ cursor = 0, append = false } = {}) => {
    const id = ++req.current;
    setState((s) => ({ ...s, loading: !append, more: append, error: null }));
    try {
      const r = await centerServices.bookings.list({ status, query, cursor, limit: 8 });
      if (id === req.current) setState((s) => ({ items: append ? [...s.items, ...r.items] : r.items, total: r.total, next: r.nextCursor, loading: false, more: false, error: null }));
    } catch (error) { if (id === req.current) setState((s) => ({ ...s, loading: false, more: false, error })); }
  }, [status, query]);
  useEffect(() => { load(); }, [load]);

  const cols = [
    { key: 'ref', header: 'Booking', render: (b) => <span className="inline-flex flex-wrap items-center gap-2">{b.reference}<PriorityBadge priority={b.priority} />{b.demo && <Badge tone="amber">Demo</Badge>}</span> },
    { key: 'veh', header: 'Vehicle', render: (b) => <span>{b.vehicle.registration}<span className="block text-xs text-slate-400">{b.vehicle.make} {b.vehicle.model}</span></span> },
    { key: 'cust', header: 'Customer', render: (b) => b.customer.name },
    { key: 'type', header: 'Type', render: (b) => (b.delivery ? 'Pickup + drop' : 'Pickup') },
    { key: 'sched', header: 'Schedule', render: (b) => `${fmtDate(b.schedule.date)}, ${b.schedule.slot}` },
    { key: 'drv', header: 'Driver', render: (b) => b.driver?.name || <span className="text-slate-400">Not assigned</span> },
    { key: 'st', header: 'Status', render: (b) => <span className="flex flex-col items-start gap-1"><BookingBadge statusKey={b.statusKey} />{b.workOrder && <WoBadge status={b.workOrder.status} />}</span> },
    { key: 'upd', header: 'Updated', render: (b) => relativeTime(b.updatedAt) },
  ];
  const filtered = status !== 'all' || query;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reference, customer or registration" aria-label="Search bookings" className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40" /></div>
        {can('bookings.create') && <Button as={Link} to="/service-center/bookings/new"><Plus className="h-4 w-4" aria-hidden="true" />Create booking</Button>}
      </div>
      <div role="tablist" aria-label="Filter bookings" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {BOOKING_FILTERS.map((f) => <button key={f.key} role="tab" aria-selected={status === f.key} type="button" onClick={() => setStatus(f.key)} className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium', status === f.key ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>{f.label}</button>)}
      </div>
      {state.error && <ErrorState error={state.error} onRetry={() => load()} title="Could not load bookings" />}
      {state.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      {!state.loading && !state.error && !state.items.length && <EmptyState icon={ListChecks} title={filtered ? 'No bookings match' : 'No bookings yet'} action={filtered ? <Button variant="secondary" onClick={() => { setStatus('all'); setText(''); }}>Clear filters</Button> : null}>{filtered ? 'Try another status or search.' : 'Bookings for your center appear here.'}</EmptyState>}
      {!state.loading && state.items.length > 0 && (
        <>
          <p className="text-sm text-slate-400" aria-live="polite">{state.total} {state.total === 1 ? 'booking' : 'bookings'}</p>
          <ResponsiveTable caption="Bookings" columns={cols} rows={state.items} href={(b) => `/service-center/bookings/${b.id}`} />
          {state.next != null && <div className="text-center"><Button variant="secondary" loading={state.more} onClick={() => load({ cursor: state.next, append: true })}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
