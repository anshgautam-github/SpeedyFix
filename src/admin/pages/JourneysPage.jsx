import { useState } from 'react';
import { Navigation } from 'lucide-react';
import { adminServices } from '../services';
import { usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, EmptyState, ErrorState, InlineAlert, Skeleton } from '../../portal/ui';
import { fmtDateTime, relativeTime } from '../../portal/lib/format';
import { JOURNEY_STAGES, stageName } from '../domain/model';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { Chips, FlagBadges, StatusBadge, usePagedList } from '../features/common';

const HV = { verified: 'Verified', pending: 'Waiting for code', locked: 'Locked', expired: 'Expired', waiting: 'Not started' };

export default function JourneysPage() {
  const [stage, setStage] = useState('all');
  const l = usePagedList(async ({ cursor }) => { const r = await adminServices.bookings.list({ cursor, limit: 15 }); const items = r.items.filter((b) => b.statusKey !== 'cancelled' || stage === 'completed').filter((b) => stage === 'all' || (stage === 'exception' ? b.flags.length : b.stage === stage)); return { items, total: items.length, nextCursor: null }; }, [stage]);
  usePolling(() => l.reload(true), 12000);
  const cols = [
    { key: 'ref', header: 'Booking', render: (b) => b.reference },
    { key: 'veh', header: 'Vehicle', render: (b) => b.vehicle.registration },
    { key: 'drv', header: 'Driver', render: (b) => b.deliveryDriver?.name || b.driver?.name || <span className="text-slate-400">None</span> },
    { key: 'cust', header: 'Customer', render: (b) => b.customer.name },
    { key: 'c', header: 'Service center', render: (b) => b.center.name },
    { key: 'st', header: 'Stage', render: (b) => <span className="flex flex-col items-start gap-1"><Badge tone="blue">{stageName(b.stage)}</Badge><StatusBadge statusKey={b.statusKey} /><FlagBadges flags={b.flags} /></span> },
    { key: 'u', header: 'Last confirmed update', render: (b) => <span title={fmtDateTime(b.updatedAt)}>{relativeTime(b.updatedAt)}</span> },
  ];
  return (
    <div className="space-y-5">
      <InlineAlert tone="blue">Live GPS tracking is not part of this build. Each row shows the last confirmed operational status and when it was recorded. No vehicle positions are shown.</InlineAlert>
      <Chips options={JOURNEY_STAGES} value={stage} onChange={setStage} label="Journey stage" />
      {l.error && <ErrorState error={l.error} onRetry={() => l.reload()} title="Could not load journeys" />}
      {l.loading && <Skeleton className="h-48" />}
      {!l.loading && !l.error && !l.items.length && <EmptyState icon={Navigation} title="No journeys in this stage">Vehicles appear here as bookings progress.</EmptyState>}
      {l.items.length > 0 && <ResponsiveTable caption="Vehicle journeys" columns={cols} rows={l.items} href={(b) => `/admin/bookings/${b.id}`} />}
    </div>
  );
}
