import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ListChecks, Search, X } from 'lucide-react';
import { services } from '../services';
import { TABS } from '../domain/status';
import { Button, EmptyState, ErrorState, Skeleton, cx } from '../ui';
import BookingListItem from '../features/booking/BookingListItem';

const PAGE = 6;

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const vehicleId = params.get('vehicle') || '';
  const [tab, setTab] = useState(params.get('tab') || 'all');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ items: [], total: 0, next: null, loading: true, more: false, error: null });
  const req = useRef(0);

  useEffect(() => { const t = setTimeout(() => setQuery(text), 300); return () => clearTimeout(t); }, [text]);

  const load = useCallback(async ({ cursor = 0, limit = PAGE, append = false, silent = false } = {}) => {
    const id = ++req.current;
    setState((s) => ({ ...s, loading: !append && !silent, more: append, error: null }));
    try {
      const r = await services.bookings.list({ tab, query, vehicleId, cursor, limit });
      if (id !== req.current) return;
      setState((s) => ({ items: append ? [...s.items, ...r.items] : r.items, total: r.total, next: r.nextCursor, loading: false, more: false, error: null }));
    } catch (error) {
      if (id === req.current) setState((s) => ({ ...s, loading: false, more: false, error }));
    }
  }, [tab, query, vehicleId]);

  useEffect(() => { load(); }, [load]);
  const refresh = () => load({ limit: Math.max(state.items.length, PAGE), silent: true });
  const filtered = Boolean(query || vehicleId || tab !== 'all');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Filter bookings" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => setTab(t.key)}
              className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium transition-colors', tab === t.key ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search reference, vehicle, center" aria-label="Search bookings"
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40" />
        </div>
      </div>

      {vehicleId && (
        <p className="flex items-center gap-2 text-sm text-slate-300">
          Showing bookings for one vehicle.
          <button type="button" onClick={() => setParams({})} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/15"><X className="h-3 w-3" aria-hidden="true" /> Clear</button>
        </p>
      )}

      {state.error && <ErrorState error={state.error} onRetry={() => load()} title="Could not load your bookings" />}
      {state.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>}

      {!state.loading && !state.error && state.items.length === 0 && (
        <EmptyState icon={ListChecks} title={filtered ? 'No bookings match' : 'No bookings yet'}
          action={filtered ? <Button variant="secondary" onClick={() => { setTab('all'); setText(''); setParams({}); }}>Clear filters</Button> : <Button as={Link} to="/customer/bookings/new">Book a pickup</Button>}>
          {filtered ? 'Try a different tab or search term.' : 'When you book a pickup, it will appear here with its live status.'}
        </EmptyState>
      )}

      {!state.loading && state.items.length > 0 && (
        <>
          <p className="text-sm text-slate-400" aria-live="polite">{state.total} {state.total === 1 ? 'booking' : 'bookings'}</p>
          <ul className="space-y-3">{state.items.map((b) => <li key={b.id}><BookingListItem booking={b} onChanged={refresh} /></li>)}</ul>
          {state.next != null && <div className="text-center"><Button variant="secondary" loading={state.more} onClick={() => load({ cursor: state.next, append: true })}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
