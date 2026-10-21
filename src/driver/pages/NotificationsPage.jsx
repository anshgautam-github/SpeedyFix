import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { driverServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Button, Card, EmptyState, ErrorState, InlineAlert, Skeleton, cx, useToast } from '../../portal/ui';
import { relativeTime } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';

export default function NotificationsPage() {
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, error, loading, reload } = useAsync(() => driverServices.notifications.list(), []);
  const items = (data || []).filter((n) => !unreadOnly || !n.read);
  const unread = (data || []).filter((n) => !n.read).length;
  const markAll = async () => { try { await driverServices.notifications.markAllRead(); notifyChanged(); reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Could not update', message: e.message }); } };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <InlineAlert tone="blue">These are in-app updates. Push notifications, SMS and email are not connected.</InlineAlert>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Filter">{[['All', false], [`Unread (${unread})`, true]].map(([l, v]) => <button key={l} type="button" aria-pressed={unreadOnly === v} onClick={() => setUnreadOnly(v)} className={cx('min-h-[44px] rounded-full px-4 text-sm font-medium', unreadOnly === v ? 'bg-volt text-white' : 'bg-white/5 text-slate-300')}>{l}</button>)}</div>
        <Button variant="secondary" size="sm" onClick={markAll} disabled={!unread}>Mark all as read</Button>
      </div>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-48" />}
      {data && !items.length && <EmptyState icon={Bell} title={unreadOnly ? 'All caught up' : 'No notifications yet'}>Job offers and updates appear here.</EmptyState>}
      {items.length > 0 && <Card><ul className="divide-y divide-white/10">{items.map((n) => (
        <li key={n.id}><Link to={`/driver/jobs/${n.jobId}`} onClick={async () => { if (!n.read) { await driverServices.notifications.markRead(n.id); notifyChanged(); } }} className={cx('flex gap-3 px-5 py-4 hover:bg-white/5', !n.read && 'bg-volt/[.06]')}>
          <span className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-volt-glow')} />
          <span className="min-w-0 flex-1"><span className="block text-sm text-slate-100">{n.message}</span><span className="text-xs text-slate-400">{n.reference} · {relativeTime(n.createdAt)}</span></span></Link></li>))}</ul></Card>}
    </div>
  );
}
