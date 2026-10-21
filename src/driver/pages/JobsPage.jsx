import { useCallback, useEffect, useRef, useState } from 'react';
import { Truck } from 'lucide-react';
import { driverServices } from '../services';
import { usePolling } from '../../portal/hooks/useAsync';
import { Button, EmptyState, ErrorState, Skeleton, cx } from '../../portal/ui';
import { GROUP_TABS } from '../domain/jobs';
import JobCard from '../features/JobCard';
import { notifyChanged } from '../../portal/lib/events';

export default function JobsPage() {
  const [tab, setTab] = useState('assigned');
  const [state, setState] = useState({ items: [], total: 0, next: null, loading: true, more: false, error: null });
  const req = useRef(0);
  const load = useCallback(async ({ cursor = 0, append = false, silent = false, limit = 8 } = {}) => {
    const id = ++req.current;
    setState((s) => ({ ...s, loading: !append && !silent, more: append, error: null }));
    try {
      const r = await driverServices.jobs.list({ group: tab, cursor, limit });
      if (id === req.current) setState((s) => ({ items: append ? [...s.items, ...r.items] : r.items, total: r.total, next: r.nextCursor, loading: false, more: false, error: null }));
    } catch (error) { if (id === req.current) setState((s) => ({ ...s, loading: false, more: false, error })); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  usePolling(() => load({ silent: true, limit: Math.max(state.items.length, 8) }), 12000);
  const changed = () => { notifyChanged(); load({ silent: true, limit: Math.max(state.items.length, 8) }); };

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Job groups" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {GROUP_TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => setTab(t.key)} className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium', tab === t.key ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>{t.label}</button>)}
      </div>
      {state.error && <ErrorState error={state.error} onRetry={() => load()} title="Could not load jobs" />}
      {state.loading && <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-56" />)}</div>}
      {!state.loading && !state.error && !state.items.length && (
        <EmptyState icon={Truck} title={`No ${GROUP_TABS.find((t) => t.key === tab).label.toLowerCase()}`}>{tab === 'offers' ? 'Offers appear here when operations sends them to you. Make sure you are online.' : 'Nothing here right now.'}</EmptyState>
      )}
      {!state.loading && state.items.length > 0 && (
        <>
          <p className="text-sm text-slate-400" aria-live="polite">{state.total} {state.total === 1 ? 'job' : 'jobs'}</p>
          <ul className="space-y-3">{state.items.map((j) => <li key={j.id}><JobCard job={j} onChanged={changed} /></li>)}</ul>
          {state.next != null && <div className="text-center"><Button variant="secondary" loading={state.more} onClick={() => load({ cursor: state.next, append: true })}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
