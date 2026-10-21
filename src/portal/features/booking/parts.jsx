import { Phone } from 'lucide-react';
import { Avatar } from '../../../landing/journey/scenes/ui';
import { cx } from '../../ui';

export function DetailRow({ label, children, className }) {
  return (
    <div className={cx('grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4', className)}>
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd>
    </div>
  );
}

/** Driver details are shown only when the booking actually has a driver, with a call link only if a number exists. */
export function DriverBlock({ driver, title = 'Driver' }) {
  if (!driver) return <p className="text-sm text-slate-400">No driver assigned yet. You will be notified when one is.</p>;
  const initials = driver.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={initials} className="h-11 w-11" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{title}</p>
        <p className="truncate text-sm font-semibold text-white">{driver.name}</p>
      </div>
      {driver.phone && (
        <a href={`tel:${driver.phone.replace(/\s/g, '')}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-white hover:bg-white/10">
          <Phone className="h-4 w-4 text-volt-glow" aria-hidden="true" /> Call
        </a>
      )}
    </div>
  );
}
