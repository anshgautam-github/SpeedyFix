/** Admin domain model (display logic). Map your backend's values to these keys in services/remoteAdapter.js. */
export const BOOKING_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending_assignment', label: 'Pending assignment' },
  { key: 'driver_assigned', label: 'Driver assigned' },
  { key: 'pickup_in_progress', label: 'Pickup in progress' },
  { key: 'received', label: 'Received at center' },
  { key: 'service_in_progress', label: 'Service in progress' },
  { key: 'ready_for_delivery', label: 'Ready for delivery' },
  { key: 'delivery_in_progress', label: 'Delivery in progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'exception', label: 'Exceptions' },
];
export const statusLabel = (k) => BOOKING_FILTERS.find((f) => f.key === k)?.label || k;
export const STATUS_TONE = { pending_assignment: 'amber', driver_assigned: 'slate', pickup_in_progress: 'blue', received: 'blue', service_in_progress: 'blue', ready_for_delivery: 'amber', delivery_in_progress: 'blue', completed: 'green', cancelled: 'rose', exception: 'rose' };

export const JOURNEY_STAGES = [
  { key: 'all', label: 'All' }, { key: 'pickup', label: 'Pickup' }, { key: 'transit', label: 'In transit to center' },
  { key: 'workshop', label: 'Workshop' }, { key: 'delivery', label: 'Delivery' }, { key: 'completed', label: 'Completed' }, { key: 'exception', label: 'Exception' },
];
export const stageName = (k) => JOURNEY_STAGES.find((s) => s.key === k)?.label || k;

export const SEVERITY_TONE = { high: 'rose', medium: 'amber', info: 'slate' };
export const FLAG_LABEL = { unassigned: 'Unassigned', delayed_pickup: 'Delayed pickup', failed_handover: 'Handover problem', awaiting_receipt: 'Awaiting receipt', stalled_work_order: 'Work order stalled', driver_rejection: 'Driver declined' };

export const ROLE_LABEL = { customer: 'Customer', driver: 'Driver', center: 'Service center staff', admin: 'Administrator' };
export const STAFF_LABEL = { manager: 'Center manager', advisor: 'Service advisor', technician: 'Technician' };
export const ADMIN_LABEL = { super: 'Super admin', operations: 'Operations' };
export const roleName = (u) => (u.role === 'center' ? STAFF_LABEL[u.staffRole] || 'Center staff' : u.role === 'admin' ? ADMIN_LABEL[u.adminLevel] || 'Admin' : ROLE_LABEL[u.role] || u.role);

export const HANDOVER_STAGE = { pickup: 'Customer to driver (pickup)', delivery: 'Driver to customer (delivery)' };
export const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
