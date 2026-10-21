/**
 * Service-center domain model used by the UI. Map your backend's statuses to these keys in services/remoteAdapter.js.
 * Everything here is display logic and hints: the backend must enforce transitions and permissions.
 */

/** Booking filter keys, derived from the shared booking record. */
export const BOOKING_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'driver_assigned', label: 'Driver assigned' },
  { key: 'pickup_in_progress', label: 'Pickup in progress' },
  { key: 'received', label: 'Vehicle received' },
  { key: 'service_in_progress', label: 'Service in progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'delivery_pending', label: 'Delivery pending' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];
export const bookingLabel = (key) => BOOKING_FILTERS.find((f) => f.key === key)?.label || key;
export const BOOKING_TONE = { pending: 'amber', driver_assigned: 'slate', pickup_in_progress: 'blue', received: 'blue', service_in_progress: 'blue', completed: 'green', delivery_pending: 'amber', delivered: 'green', cancelled: 'rose' };

export const WO_STATUS = {
  new: { label: 'New', tone: 'amber' },
  accepted: { label: 'Accepted', tone: 'slate' },
  assigned: { label: 'Assigned', tone: 'slate' },
  in_progress: { label: 'In progress', tone: 'blue' },
  waiting_parts: { label: 'Waiting for parts', tone: 'amber' },
  quality_check: { label: 'Quality check', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'rose' },
};
export const WO_FILTERS = [{ key: 'all', label: 'All' }, ...Object.entries(WO_STATUS).map(([key, v]) => ({ key, label: v.label }))];

/** The next step per work-order status (label for the primary button). Valid actions come from the server per user. */
export const WO_ACTIONS = {
  accept: { label: 'Accept work order' },
  assign: { label: 'Assign technician' },
  start: { label: 'Start work' },
  hold_parts: { label: 'Waiting for parts' },
  resume: { label: 'Resume work' },
  complete_service: { label: 'Complete servicing' },
  pass_qc: { label: 'Pass quality check' },
  fail_qc: { label: 'Fail quality check' },
  cancel: { label: 'Cancel work order' },
};
export const WO_STEPS = [
  { key: 'new', label: 'Accepted' }, { key: 'assigned', label: 'Technician assigned' }, { key: 'in_progress', label: 'Work started' },
  { key: 'quality_check', label: 'Quality check' }, { key: 'completed', label: 'Ready for delivery' },
];
export const woStepIndex = (status) => ({ new: -1, accepted: 0, assigned: 1, in_progress: 2, waiting_parts: 2, quality_check: 3, completed: 4 }[status] ?? -1);

export const DELIVERY_STAGES = [
  { key: 'all', label: 'All' }, { key: 'ready', label: 'Ready for delivery' }, { key: 'awaiting_driver', label: 'Awaiting driver' },
  { key: 'driver_assigned', label: 'Driver assigned' }, { key: 'out_for_delivery', label: 'Out for delivery' }, { key: 'delivered', label: 'Delivered' },
];
export const stageLabel = (k) => DELIVERY_STAGES.find((s) => s.key === k)?.label || k;

export const PRIORITIES = [['normal', 'Normal'], ['urgent', 'Urgent']];
export const ISSUE_TYPES = ['General servicing', 'Repair and maintenance', 'Inspection', 'Brakes', 'Engine', 'AC', 'Other'];

export const ROLE_LABEL = { manager: 'Center manager', advisor: 'Service advisor', technician: 'Technician' };

export const money = (n, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0);
