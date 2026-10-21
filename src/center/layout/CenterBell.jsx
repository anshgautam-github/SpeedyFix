import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { centerServices } from '../services';
import { usePolling } from '../../portal/hooks/useAsync';
import { onDataChanged } from '../../portal/lib/events';
import { relativeTime } from '../../portal/lib/format';
import { cx } from '../../portal/ui';

/** Activity from real booking and work-order records. "Unread" means newer than the last time this person opened it. */
export default function CenterBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const load = useCallback(() => centerServices.activity.list().then(setData).catch(() => {}), []);
  useEffect(() => { load(); return onDataChanged(load); }, [load]);
  usePolling(load, 20000);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const toggle = async () => { const next = !open; setOpen(next); if (next && data.unread) { await centerServices.activity.markSeen().catch(() => {}); setTimeout(load, 400); } };
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="true" aria-label={data.unread ? `Activity, ${data.unread} new` : 'Activity'} className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {data.unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-volt px-1 text-xs font-bold text-white">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0A1226] shadow-2xl">
          <p className="border-b border-white/10 px-4 py-3 font-display text-sm text-white">Recent activity</p>
          <ul className="max-h-96 overflow-y-auto">
            {data.items.slice(0, 8).map((n) => (
              <li key={n.id}><Link to={`/service-center/bookings/${n.bookingId}`} onClick={() => setOpen(false)} className={cx('block px-4 py-3 hover:bg-white/5')}><span className="block text-sm text-slate-100">{n.text}</span><span className="text-xs text-slate-400">{relativeTime(n.at)}</span></Link></li>
            ))}
            {!data.items.length && <li className="px-4 py-8 text-center text-sm text-slate-400">No activity yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
