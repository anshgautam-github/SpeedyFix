import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Search } from 'lucide-react';
import { driverServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Button, Card, EmptyState, ErrorState, Skeleton, TextField, SelectField } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { TYPE_LABEL } from '../domain/jobs';
import { PhaseBadge } from '../features/JobCard';

export default function HistoryPage() {
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [state, setState] = useState({ items: [], total: 0, next: null, loading: true, more: false, error: null });
  const stats = useAsync(() => driverServices.jobs.stats(), []);
  const req = useRef(0);
  useEffect(() => { const t = setTimeout(() => setQuery(text), 300); return () => clearTimeout(t); }, [text]);

  const load = useCallback(async ({ cursor = 0, append = false } = {}) => {
    const id = ++req.current;
    setState((s) => ({ ...s, loading: !append, more: append, error: null }));
    try {
      const r = await driverServices.jobs.list({ groups: status === 'all' ? ['completed', 'cancelled', 'declined'] : [status], query, from, to, cursor, limit: 8 });
      if (id === req.current) setState((s) => ({ items: append ? [...s.items, ...r.items] : r.items, total: r.total, next: r.nextCursor, loading: false, more: false, error: null }));
    } catch (error) { if (id === req.current) setState((s) => ({ ...s, loading: false, more: false, error })); }
  }, [status, query, from, to]);
  useEffect(() => { load(); }, [load]);

  const filtered = status !== 'all' || query || from || to;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-sm text-slate-400">Completed jobs</p><p className="mt-1 font-display text-3xl text-white tabular-nums">{stats.data ? stats.data.completed : '–'}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-400">Completed today</p><p className="mt-1 font-display text-3xl text-white tabular-nums">{stats.data ? stats.data.completedToday : '–'}</p></Card>
      </div>
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2"><Search className="pointer-events-none absolute left-3 top-[2.4rem] h-4 w-4 text-slate-400" aria-hidden="true" /><TextField label="Search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Booking reference or registration" inputClassName="pl-9" /></div>
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="declined">Declined</option></SelectField>
          <div className="grid grid-cols-2 gap-2"><TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </Card>
      {state.error && <ErrorState error={state.error} onRetry={() => load()} title="Could not load history" />}
      {state.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}
      {!state.loading && !state.error && !state.items.length && (
        <EmptyState icon={HistoryIcon} title={filtered ? 'No jobs match' : 'No history yet'} action={filtered ? <Button variant="secondary" onClick={() => { setStatus('all'); setText(''); setFrom(''); setTo(''); }}>Clear filters</Button> : null}>{filtered ? 'Try different filters.' : 'Completed and cancelled jobs appear here.'}</EmptyState>
      )}
      {!state.loading && state.items.length > 0 && (
        <>
          <p className="text-sm text-slate-400" aria-live="polite">{state.total} {state.total === 1 ? 'job' : 'jobs'}</p>
          <ul className="space-y-3">{state.items.map((j) => (
            <li key={j.id}><Card className="p-4"><Link to={`/driver/jobs/${j.id}`} className="block">
              <div className="flex flex-wrap items-center gap-2"><span className="font-display text-white">{j.reference}</span><PhaseBadge job={j} /><span className="ml-auto text-xs text-slate-400">{fmtDateTime(j.timestamps.completedAt || j.timestamps.handedOverAt || j.updatedAt)}</span></div>
              <p className="mt-2 text-sm text-slate-200">{j.vehicle.make} {j.vehicle.model} · {j.vehicle.registration} · {TYPE_LABEL[j.type]}</p>
              <p className="mt-1 text-sm text-slate-400">{j.origin.address} → {j.destination.address}</p>
            </Link></Card></li>))}</ul>
          {state.next != null && <div className="text-center"><Button variant="secondary" loading={state.more} onClick={() => load({ cursor: state.next, append: true })}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
