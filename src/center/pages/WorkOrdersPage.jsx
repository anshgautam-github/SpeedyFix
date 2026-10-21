import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { centerServices } from '../services';
import { Badge, Button, EmptyState, ErrorState, Skeleton, cx } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { WO_ACTIONS, WO_FILTERS, money } from '../domain/model';
import ResponsiveTable from '../features/ResponsiveTable';
import { WoBadge } from '../features/badges';

const NEXT = { new: 'accept', accepted: 'assign', assigned: 'start', in_progress: 'complete_service', waiting_parts: 'resume', quality_check: 'pass_qc' };

export default function WorkOrdersPage() {
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ items: [], total: 0, next: null, loading: true, more: false, error: null });
  const req = useRef(0);
  useEffect(() => { const t = setTimeout(() => setQuery(text), 300); return () => clearTimeout(t); }, [text]);
  const load = useCallback(async ({ cursor = 0, append = false } = {}) => {
    const id = ++req.current;
    setState((s) => ({ ...s, loading: !append, more: append, error: null }));
    try { const r = await centerServices.workOrders.list({ status, query, cursor, limit: 8 }); if (id === req.current) setState((s) => ({ items: append ? [...s.items, ...r.items] : r.items, total: r.total, next: r.nextCursor, loading: false, more: false, error: null })); }
    catch (error) { if (id === req.current) setState((s) => ({ ...s, loading: false, more: false, error })); }
  }, [status, query]);
  useEffect(() => { load(); }, [load]);

  const cols = [
    { key: 'ref', header: 'Work order', render: (w) => <span className="inline-flex flex-wrap items-center gap-2">{w.reference}{w.demo && <Badge tone="amber">Demo</Badge>}</span> },
    { key: 'bk', header: 'Booking', render: (w) => w.bookingRef },
    { key: 'veh', header: 'Vehicle', render: (w) => <span>{w.vehicle.registration}<span className="block text-xs text-slate-400">{w.customer.name}</span></span> },
    { key: 'tech', header: 'Technician', render: (w) => w.technician?.name || <span className="text-slate-400">Not assigned</span> },
    { key: 'st', header: 'Status', render: (w) => <WoBadge status={w.status} /> },
    { key: 'start', header: 'Started', render: (w) => (w.startedAt ? fmtDateTime(w.startedAt) : '–') },
    { key: 'lab', header: 'Labour', render: (w) => `${w.totals.labourHours} h`, className: 'tabular-nums' },
    { key: 'parts', header: 'Parts', render: (w) => money(w.totals.parts), className: 'tabular-nums' },
    { key: 'tot', header: 'Total', render: (w) => money(w.totals.total), className: 'tabular-nums' },
    { key: 'next', header: 'Next action', render: (w) => (NEXT[w.status] ? <span className={w.allowed.includes(NEXT[w.status]) ? 'text-volt-glow' : 'text-slate-400'}>{WO_ACTIONS[NEXT[w.status]].label}</span> : <span className="text-slate-400">–</span>) },
  ];
  const filtered = status !== 'all' || query;
  return (
    <div className="space-y-5">
      <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Work order, booking, registration" aria-label="Search work orders" className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40" /></div>
      <div role="tablist" aria-label="Filter work orders" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">{WO_FILTERS.map((f) => <button key={f.key} role="tab" aria-selected={status === f.key} type="button" onClick={() => setStatus(f.key)} className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium', status === f.key ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>{f.label}</button>)}</div>
      {state.error && <ErrorState error={state.error} onRetry={() => load()} title="Could not load work orders" />}
      {state.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      {!state.loading && !state.error && !state.items.length && <EmptyState icon={ClipboardList} title={filtered ? 'No work orders match' : 'No work orders yet'} action={filtered ? <Button variant="secondary" onClick={() => { setStatus('all'); setText(''); }}>Clear filters</Button> : null}>{filtered ? 'Try another status or search.' : 'A work order is created when a vehicle is received at your center.'}</EmptyState>}
      {!state.loading && state.items.length > 0 && (<><p className="text-sm text-slate-400" aria-live="polite">{state.total} {state.total === 1 ? 'work order' : 'work orders'}</p><ResponsiveTable caption="Work orders" columns={cols} rows={state.items} href={(w) => `/service-center/work-orders/${w.id}`} />{state.next != null && <div className="text-center"><Button variant="secondary" loading={state.more} onClick={() => load({ cursor: state.next, append: true })}>Load more</Button></div>}</>)}
    </div>
  );
}
