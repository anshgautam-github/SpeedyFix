import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { driverServices } from '../services';
import { usePolling } from '../../portal/hooks/useAsync';
import { onDataChanged } from '../../portal/lib/events';

export default function DriverBell() {
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => driverServices.notifications.list().then((l) => setUnread(l.filter((n) => !n.read).length)).catch(() => {}), []);
  useEffect(() => { load(); return onDataChanged(load); }, [load]);
  usePolling(load, 20000);
  return (
    <Link to="/driver/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white">
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-volt px-1 text-xs font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}
