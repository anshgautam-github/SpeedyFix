import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { services } from '../services';
import { useAsync } from '../hooks/useAsync';
import { Button, Card, EmptyState, ErrorState, InlineAlert, Skeleton, cx, useToast } from '../ui';
import { relativeTime } from '../lib/format';
import { notifyChanged } from '../lib/events';

export default function NotificationsPage() {
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, error, loading, reload } = useAsync(() => services.notifications.list({ limit: 100 }), []);
  const items = (data || []).filter((n) => !unreadOnly || !n.read);
  const unread = (data || []).filter((n) => !n.read).length;

  const markAll = async () => { try { await services.notifications.markAllRead(); notifyChanged(); reload(true); } catch (e) { toast.push({ tone: 'rose', title: 'Could not update', message: e.message }); } };
  const open = async (n) => { if (!n.read) { await services.notifications.markRead(n.id).catch(() => {}); notifyChanged(); } };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <InlineAlert tone="blue">These are in-app updates. SMS, email and push notifications are not connected.</InlineAlert>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Filter notifications">
          {[['All', false], [`Unread (${unread})`, true]].map(([l, v]) => <button key={l} type="button" aria-pressed={unreadOnly === v} onClick={() => setUnreadOnly(v)} className={cx('min-h-[44px] rounded-full px-4 text-sm font-medium', unreadOnly === v ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>{l}</button>)}
        </div>
        <Button variant="secondary" size="sm" onClick={markAll} disabled={!unread}>Mark all as read</Button>
      </div>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && !items.length && <EmptyState icon={Bell} title={unreadOnly ? 'You are all caught up' : 'No notifications yet'}>Updates about your bookings appear here.</EmptyState>}
      {items.length > 0 && (
        <Card><ul className="divide-y divide-white/10">
          {items.map((n) => (
            <li key={n.id}><Link to={`/customer/bookings/${n.bookingId}`} onClick={() => open(n)} className={cx('flex gap-3 px-5 py-4 hover:bg-white/5', !n.read && 'bg-volt/[.06]')}>
              <span className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-volt-glow')} aria-label={n.read ? undefined : 'Unread'} />
              <span className="min-w-0 flex-1"><span className="block text-sm text-slate-100">{n.message}</span><span className="text-xs text-slate-400">{n.reference} &middot; {relativeTime(n.createdAt)}</span></span>
            </Link></li>
          ))}
        </ul></Card>
      )}
    </div>
  );
}
