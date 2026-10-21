import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { adminServices } from '../services';
import { usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, EmptyState, ErrorState, InlineAlert, Skeleton, useToast } from '../../portal/ui';
import { relativeTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import { SEVERITY_TONE } from '../domain/model';
import { useAdmin } from '../layout/AdminContext';
import { Chips, usePagedList } from '../features/common';

const TYPE = { new_booking: 'New booking', unassigned: 'Unassigned job', delayed_pickup: 'Delayed pickup', failed_handover: 'Handover problem', vehicle_received: 'Vehicle received', stalled_work_order: 'Work order stalled', service_completed: 'Service completed', delivery_pending: 'Delivery pending', delivery_completed: 'Delivery completed', account_approval: 'Approval request', awaiting_receipt: 'Awaiting receipt', driver_rejection: 'Driver declined' };
const STATUS = [{ key: 'open', label: 'Open' }, { key: 'acknowledged', label: 'Acknowledged' }, { key: 'resolved', label: 'Resolved' }, { key: 'all', label: 'All' }];

export default function NotificationsPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const [status, setStatus] = useState('open');
  const [meta, setMeta] = useState(null);
  const l = usePagedList(async () => { const r = await adminServices.alerts.list({ status }); setMeta(r.channels); return { items: r.items, total: r.items.length, nextCursor: null }; }, [status]);
  usePolling(() => l.reload(true), 15000);
  const ack = async (a, resolved) => { try { await adminServices.alerts.acknowledge(a.id, resolved); notifyChanged(); l.reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Not done', message: e.message }); } };
  const link = (a) => (a.link.bookingId ? `/admin/bookings/${a.link.bookingId}` : a.link.userId ? `/admin/users/${a.link.userId}` : `/admin/service-centers/${a.link.centerId}`);
  return (
    <div className="space-y-5">
      <InlineAlert tone="blue">These are in-app alerts built from live records. SMS, email and push delivery are not configured, so nothing is sent outside this portal. Severity follows platform defaults and the thresholds in Settings.</InlineAlert>
      <Chips options={STATUS} value={status} onChange={setStatus} label="Alert status" />
      {l.error && <ErrorState error={l.error} onRetry={() => l.reload()} title="Could not load alerts" />}
      {l.loading && <Skeleton className="h-40" />}
      {!l.loading && !l.error && !l.items.length && <EmptyState icon={Bell} title={status === 'open' ? 'No open alerts' : 'Nothing here'}>{status === 'open' ? 'Everything is running normally.' : 'No alerts with this status.'}</EmptyState>}
      {l.items.length > 0 && <ul className="space-y-2">{l.items.map((a) => (
        <li key={a.id}><Card className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
          <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge><Badge>{TYPE[a.type] || a.type}</Badge>
          <Link to={link(a)} className="min-w-0 basis-full text-sm text-slate-100 hover:text-volt-glow sm:flex-1 sm:basis-0">{a.text}</Link>
          <span className="text-xs text-slate-400">{relativeTime(a.at)}</span>
          {a.status !== 'open' && <Badge tone="green">{a.status} by {a.ack.by}</Badge>}
          {a.status === 'open' && can('alerts.manage') && <span className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => ack(a, false)}>Acknowledge</Button><Button size="sm" variant="ghost" onClick={() => ack(a, true)}>Resolve</Button></span>}
        </Card></li>))}</ul>}
      {meta && <p className="text-xs text-slate-400">Delivery channels: in-app on · SMS off · email off · push off</p>}
    </div>
  );
}
