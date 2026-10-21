import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, EmptyState, ErrorState, InlineAlert, Skeleton, useToast } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { HANDOVER_STAGE } from '../domain/model';
import { useAdmin } from '../layout/AdminContext';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { Chips, ReasonDialog, usePagedList } from '../features/common';

const FILTERS = [{ key: 'all', label: 'All' }, { key: 'problem', label: 'Problems' }, { key: 'pending', label: 'Waiting for code' }, { key: 'verified', label: 'Verified' }];
const STATE = { verified: ['green', 'Verified'], pending: ['amber', 'Waiting for code'], waiting: ['slate', 'Not started'], failed_attempts: ['amber', 'Failed attempts'], locked: ['rose', 'Locked'], expired: ['rose', 'Expired'] };

export default function HandoversPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [rec, setRec] = useState(null);
  const l = usePagedList(async () => { const items = await adminServices.handovers.list({ status }); return { items, total: items.length, nextCursor: null }; }, [status]);
  const cols = [
    { key: 'ref', header: 'Booking', render: (h) => h.reference },
    { key: 't', header: 'Handover', render: (h) => HANDOVER_STAGE[h.type] },
    { key: 'v', header: 'Vehicle', render: (h) => h.vehicle },
    { key: 'd', header: 'Driver', render: (h) => h.driver || '–' },
    { key: 's', header: 'Verification', render: (h) => <Badge tone={STATE[h.state][0]}>{STATE[h.state][1]}</Badge> },
    { key: 'a', header: 'Failed attempts', render: (h) => h.attempts, className: 'tabular-nums' },
    { key: 'ts', header: 'Time', render: (h) => (h.verifiedAt ? fmtDateTime(h.verifiedAt) : '–') },
    { key: 'x', header: '', render: (h) => (h.recoverable && can('handovers.recover') ? <Button size="sm" variant="secondary" onClick={() => setRec(h)}>Issue new code</Button> : null) },
  ];
  return (
    <div className="space-y-5">
      <InlineAlert tone="blue">Codes are never shown to administrators and a handover cannot be marked verified from here. Only the driver's server-side check verifies it. For a locked or expired code, a super admin can issue a new code to the customer through an audited recovery action.</InlineAlert>
      <Chips options={FILTERS} value={status} onChange={setStatus} label="Handover status" />
      {l.error && <ErrorState error={l.error} onRetry={() => l.reload()} title="Could not load handovers" />}
      {l.loading && <Skeleton className="h-40" />}
      {!l.loading && !l.error && !l.items.length && <EmptyState icon={KeyRound} title="No handovers here">Handover records appear once drivers are assigned.</EmptyState>}
      {l.items.length > 0 && <ResponsiveTable caption="Handovers" columns={cols} rows={l.items} href={(h) => `/admin/bookings/${h.bookingId}`} />}
      <ReasonDialog open={Boolean(rec)} title="Issue a new handover code?" confirmLabel="Issue new code" onClose={() => setRec(null)}
        body={rec && <>The current {rec.type} code for <strong className="text-white">{rec.reference}</strong> is {rec.state}. A new code is issued to the customer. You will not see it, and the handover is not marked verified.</>}
        onConfirm={async (reason) => { await adminServices.handovers.reissue(rec.id, reason); notifyChanged(); toast.push({ title: 'New code issued', message: rec.reference }); setRec(null); l.reload(true); }} />
    </div>
  );
}
