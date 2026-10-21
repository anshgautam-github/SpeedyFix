import { Link } from 'react-router-dom';
import { CalendarClock, Building2 } from 'lucide-react';
import { Card, DemoBadge, StatusBadge, Badge } from '../../ui';
import { pendingHandover } from '../../domain/status';
import { fmtDate, relativeTime } from '../../lib/format';
import BookingActions from './BookingActions';

export default function BookingListItem({ booking, onChanged, compact = false }) {
  const needs = pendingHandover(booking);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link to={`/customer/bookings/${booking.id}`} className="font-display text-base text-white hover:text-volt-glow">{booking.reference}</Link>
        <StatusBadge status={booking.status} />
        {needs && <Badge tone="amber">Action needed</Badge>}
        {booking.demo && <DemoBadge />}
        <span className="ml-auto text-xs text-slate-400">Updated {relativeTime(booking.updatedAt)}</span>
      </div>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold text-white">{booking.vehicle.make} {booking.vehicle.model}</p>
          <p className="text-slate-400">{booking.vehicle.registration} &middot; {booking.serviceType}</p>
        </div>
        <div className="flex items-start gap-2 text-slate-300"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><div><p>Pickup {fmtDate(booking.pickup.date)}</p><p className="text-slate-400">{booking.pickup.slot} &middot; booked {fmtDate(booking.createdAt)}</p></div></div>
        <div className="flex items-start gap-2 text-slate-300"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><p>{booking.center.name}</p></div>
      </div>
      {!compact && <div className="mt-4 border-t border-white/10 pt-4"><BookingActions booking={booking} onChanged={onChanged} /></div>}
    </Card>
  );
}
