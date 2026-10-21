import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Search } from 'lucide-react';
import { centerServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Badge, EmptyState, ErrorState, Skeleton } from '../../portal/ui';
import { fmtDate } from '../../portal/lib/format';
import ResponsiveTable from '../features/ResponsiveTable';
import { WoBadge } from '../features/badges';

export default function VehiclesPage() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(text), 300); return () => clearTimeout(t); }, [text]);
  const { data, error, loading, reload } = useAsync(() => centerServices.vehicles.list({ query }), [query]);
  const cols = [
    { key: 'reg', header: 'Registration', render: (v) => v.registration },
    { key: 'mm', header: 'Make and model', render: (v) => `${v.make} ${v.model}` },
    { key: 'c', header: 'Customer', render: (v) => v.customer },
    { key: 'b', header: 'Latest booking', render: (v) => <Link to={`/service-center/bookings/${v.latestBookingId}`} className="text-volt-glow hover:underline">{v.latestReference}</Link> },
    { key: 'wo', header: 'Work order', render: (v) => <WoBadge status={v.workOrderStatus} /> },
    { key: 'ls', header: 'Last service', render: (v) => (v.lastServiceDate ? fmtDate(v.lastServiceDate) : '–') },
    { key: 'ws', header: 'Workshop status', render: (v) => <Badge tone={v.workshopStatus === 'In workshop' ? 'blue' : v.workshopStatus === 'On the way' ? 'amber' : 'slate'}>{v.workshopStatus}</Badge> },
    { key: 'n', header: 'Visits', render: (v) => v.bookings, className: 'tabular-nums' },
  ];
  return (
    <div className="space-y-5">
      <div className="relative w-full sm:w-96"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Registration, make, model or customer" aria-label="Search vehicles" className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40" /></div>
      <p className="text-sm text-slate-400">Vehicles are grouped by registration number, so a returning vehicle appears once with all its visits.</p>
      {error && <ErrorState error={error} onRetry={reload} title="Could not load vehicles" />}
      {loading && !data && <Skeleton className="h-48" />}
      {data && !data.length && <EmptyState icon={CarFront} title={query ? 'No vehicles match' : 'No vehicles yet'}>{query ? 'Try a different search.' : 'Vehicles appear here once bookings exist for your center.'}</EmptyState>}
      {data && data.length > 0 && <ResponsiveTable caption="Vehicles" columns={cols} rows={data} rowKey="registration" />}
    </div>
  );
}
