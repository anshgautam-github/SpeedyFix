import { useState } from 'react';
import { Link } from 'react-router-dom';
import { services } from '../../services';
import { Button, ConfirmDialog, useToast } from '../../ui';
import { canCancelHint, canScheduleDeliveryHint, isTrackable, isOpen } from '../../domain/status';
import { notifyChanged } from '../../lib/events';
import ScheduleDeliveryModal from './ScheduleDeliveryModal';

/**
 * Action buttons depend on booking status. They are hints only: cancellation and delivery scheduling are
 * checked again by the backend, and a rejection is shown to the customer and the booking is refreshed.
 */
export default function BookingActions({ booking, onChanged, hideView = false, size = 'sm' }) {
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancel = async () => {
    setBusy(true); setError('');
    try {
      const updated = await services.bookings.cancel(booking.id);
      notifyChanged();
      toast.push({ title: 'Booking cancelled', message: booking.reference });
      setCancelOpen(false);
      onChanged?.(updated);
    } catch (e) {
      setError(e.message);
      onChanged?.();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!hideView && <Button as={Link} to={`/customer/bookings/${booking.id}`} variant="secondary" size={size}>View details</Button>}
      {isTrackable(booking) && isOpen(booking) && <Button as={Link} to={`/customer/tracking/${booking.id}`} variant="secondary" size={size}>Track vehicle</Button>}
      {canScheduleDeliveryHint(booking) && <Button size={size} onClick={() => setSchedOpen(true)}>Schedule delivery</Button>}
      {canCancelHint(booking) && <Button variant="danger" size={size} onClick={() => { setError(''); setCancelOpen(true); }}>Cancel booking</Button>}
      {!isOpen(booking) && <Button as={Link} to={`/customer/bookings/new?from=${booking.id}`} variant="ghost" size={size}>Book again</Button>}
      <Button as={Link} to={`/customer/help?booking=${encodeURIComponent(booking.reference)}`} variant="ghost" size={size}>Contact support</Button>

      <ConfirmDialog open={cancelOpen} danger loading={busy} error={error} title="Cancel this booking?" confirmLabel="Cancel booking" cancelLabel="Keep booking"
        body={<>Booking <strong className="text-white">{booking.reference}</strong> for {booking.vehicle.make} {booking.vehicle.model} will be cancelled. You can only cancel before the pickup has started.</>}
        onConfirm={cancel} onClose={() => setCancelOpen(false)} />
      <ScheduleDeliveryModal booking={booking} open={schedOpen} onClose={() => setSchedOpen(false)} onDone={onChanged} />
    </div>
  );
}
