import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { services } from '../services';
import { onDataChanged } from '../lib/events';
import { relativeTime } from '../lib/format';
import { usePolling } from '../hooks/useAsync';
import { cx } from '../ui';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const load = useCallback(() => services.notifications.list({ limit: 20 }).then(setItems).catch(() => {}), []);
  useEffect(() => { load(); return onDataChanged(load); }, [load]);
  usePolling(load, 20000);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;
  const read = async (n) => { if (!n.read) { await services.notifications.markRead(n.id); load(); } setOpen(false); };

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-volt px-1 text-xs font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0A1226] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="font-display text-sm text-white">Notifications</p>
            {unread > 0 && <button type="button" className="text-xs text-volt-glow hover:underline" onClick={async () => { await services.notifications.markAllRead(); load(); }}>Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.slice(0, 6).map((n) => (
              <li key={n.id}>
                <Link to={`/customer/bookings/${n.bookingId}`} onClick={() => read(n)} className={cx('flex gap-3 px-4 py-3 hover:bg-white/5', !n.read && 'bg-volt/[.06]')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-volt-glow')} aria-hidden="true" />
                  <span className="min-w-0 text-sm"><span className="block text-slate-100">{n.message}</span><span className="text-xs text-slate-400">{n.reference} &middot; {relativeTime(n.createdAt)}</span></span>
                </Link>
              </li>
            ))}
            {!items.length && <li className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</li>}
          </ul>
          <Link to="/customer/notifications" onClick={() => setOpen(false)} className="block border-t border-white/10 px-4 py-3 text-center text-sm text-volt-glow hover:bg-white/5">View all</Link>
        </div>
      )}
    </div>
  );
}
