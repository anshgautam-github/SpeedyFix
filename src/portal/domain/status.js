/**
 * Booking statuses the portal understands. Map your backend's statuses onto these in the remote adapter.
 * Not every status has to exist: the UI only shows what a booking has actually reached.
 */
export const STAGES = [
  { key: 'confirmed', label: 'Booking confirmed', short: 'Confirmed', group: 'upcoming' },
  { key: 'driver_assigned', label: 'Driver assigned', short: 'Driver assigned', group: 'upcoming' },
  { key: 'driver_en_route', label: 'Driver en route to pickup', short: 'Driver en route', group: 'active' },
  { key: 'picked_up', label: 'Vehicle picked up', short: 'Picked up', group: 'active' },
  { key: 'in_transit', label: 'Vehicle in transit', short: 'In transit', group: 'active' },
  { key: 'received_at_center', label: 'Received at service center', short: 'At service center', group: 'active' },
  { key: 'service_in_progress', label: 'Service in progress', short: 'In service', group: 'active' },
  { key: 'service_completed', label: 'Service completed', short: 'Service done', group: 'active' },
  { key: 'delivery_driver_assigned', label: 'Driver assigned for delivery', short: 'Delivery driver', group: 'active' },
  { key: 'out_for_delivery', label: 'Vehicle out for delivery', short: 'Out for delivery', group: 'active' },
  { key: 'delivered', label: 'Delivered', short: 'Delivered', group: 'completed' },
];

export const CANCELLED = { key: 'cancelled', label: 'Cancelled', short: 'Cancelled', group: 'cancelled' };

const BY_KEY = Object.fromEntries([...STAGES, CANCELLED].map((s) => [s.key, s]));
export const stageIndex = (status) => STAGES.findIndex((s) => s.key === status);
export const statusMeta = (status) => BY_KEY[status] || { key: status, label: status, short: status, group: 'active' };

/** The seven-step overview shown on the dashboard. */
export const JOURNEY = [
  { label: 'Booking confirmed', statuses: ['confirmed'] },
  { label: 'Driver assigned', statuses: ['driver_assigned', 'driver_en_route'] },
  { label: 'Vehicle picked up', statuses: ['picked_up', 'in_transit'] },
  { label: 'At service center', statuses: ['received_at_center'] },
  { label: 'Service in progress', statuses: ['service_in_progress'] },
  { label: 'Ready for delivery', statuses: ['service_completed', 'delivery_driver_assigned', 'out_for_delivery'] },
  { label: 'Delivered', statuses: ['delivered'] },
];
export const journeyIndex = (status) => JOURNEY.findIndex((j) => j.statuses.includes(status));

export const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];
export const matchesTab = (booking, tab) => tab === 'all' || statusMeta(booking.status).group === tab;

export const isOpen = (b) => !['delivered', 'cancelled'].includes(b.status);
export const isTrackable = (b) => b.status !== 'cancelled';

/** Hints for the UI only. The backend must enforce these rules independently. */
export const canCancelHint = (b) => ['confirmed', 'driver_assigned'].includes(b.status);
export const canScheduleDeliveryHint = (b) => b.status === 'service_completed' && !b.delivery;

/** Which customer handover (if any) is waiting on the customer right now. */
export function pendingHandover(b) {
  const h = b.handovers || {};
  if (b.status === 'driver_en_route' && h.pickup && h.pickup.status !== 'verified') return 'pickup';
  if (b.status === 'out_for_delivery' && h.delivery && h.delivery.status !== 'verified') return 'delivery';
  return null;
}

export const HANDOVER_COPY = {
  pickup: {
    title: 'Hand your vehicle to the pickup driver',
    short: 'Pickup handover',
    done: 'You handed the vehicle to the pickup driver.',
  },
  delivery: {
    title: 'Receive your vehicle from the delivery driver',
    short: 'Delivery handover',
    done: 'You received the vehicle from the delivery driver.',
  },
};
