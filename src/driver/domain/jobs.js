/**
 * Driver job model used by the UI. A "job" is one leg of a booking: a pickup (customer -> service center)
 * or a delivery (service center -> customer). The phase names below are what the backend adapter returns.
 * Map your real statuses onto them in services/remoteAdapter.js. The backend must enforce the transitions.
 */
export const WORKFLOWS = {
  pickup: [
    { phase: 'accepted', label: 'Accepted' },
    { phase: 'en_route', label: 'En route to pickup' },
    { phase: 'arrived', label: 'Arrived at pickup' },
    { phase: 'inspected', label: 'Vehicle inspected' },
    { phase: 'verified', label: 'Pickup verified' },
    { phase: 'collected', label: 'Collection confirmed' },
    { phase: 'to_center', label: 'En route to service center' },
    { phase: 'at_center', label: 'Arrived at service center' },
    { phase: 'handed_over', label: 'Handover completed' },
  ],
  delivery: [
    { phase: 'accepted', label: 'Accepted' },
    { phase: 'en_route', label: 'En route to customer' },
    { phase: 'arrived', label: 'Arrived at customer' },
    { phase: 'inspected', label: 'Condition recorded' },
    { phase: 'verified', label: 'Delivery verified' },
    { phase: 'completed', label: 'Job completed' },
  ],
};

const EXTRA = { offered: 'New offer', cancelled: 'Cancelled', declined: 'Declined' };
export const phaseLabel = (type, phase) => EXTRA[phase] || WORKFLOWS[type]?.find((s) => s.phase === phase)?.label || phase;
export const phaseIndex = (type, phase) => WORKFLOWS[type].findIndex((s) => s.phase === phase);
export const TYPE_LABEL = { pickup: 'Vehicle pickup', delivery: 'Vehicle delivery' };

export const groupOf = (phase) =>
  phase === 'offered' ? 'offers' : phase === 'accepted' ? 'assigned' : ['handed_over', 'completed'].includes(phase) ? 'completed' : phase === 'cancelled' ? 'cancelled' : phase === 'declined' ? 'declined' : 'in_progress';

export const GROUP_TABS = [
  { key: 'offers', label: 'New offers' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

/**
 * The next valid step for each phase. kind "action" calls jobs.transition; "page" opens the handover screen.
 * These are UI hints only: the backend validates every transition against the job's real phase.
 */
const NEXT = {
  pickup: {
    offered: { kind: 'action', action: 'accept', label: 'Accept job' },
    accepted: { kind: 'action', action: 'start', label: 'Start journey to pickup' },
    en_route: { kind: 'action', action: 'arrive', label: 'Arrived at pickup' },
    arrived: { kind: 'page', label: 'Inspect vehicle' },
    inspected: { kind: 'page', label: 'Verify pickup OTP' },
    verified: { kind: 'action', action: 'confirm_collection', label: 'Confirm collection' },
    collected: { kind: 'action', action: 'start_to_center', label: 'Start journey to service center' },
    to_center: { kind: 'action', action: 'arrive_center', label: 'Confirm arrival at service center' },
    at_center: { kind: 'page', label: 'Hand over to service center' },
  },
  delivery: {
    offered: { kind: 'action', action: 'accept', label: 'Accept job' },
    accepted: { kind: 'action', action: 'start', label: 'Start delivery' },
    en_route: { kind: 'action', action: 'arrive', label: 'Arrived at customer' },
    arrived: { kind: 'page', label: 'Record vehicle condition' },
    inspected: { kind: 'page', label: 'Verify delivery OTP' },
    verified: { kind: 'action', action: 'complete', label: 'Complete job' },
  },
};
export const nextStep = (job) => NEXT[job.type][job.phase] || null;

/** Where the driver is heading right now. Returns an address string from the backend; coordinates are never invented. */
export function currentTarget(job) {
  const toCenter = job.type === 'pickup' && ['collected', 'to_center', 'at_center'].includes(job.phase);
  return toCenter ? { label: 'Service center', ...job.destination } : { label: job.type === 'pickup' ? 'Pickup' : 'Customer', ...(job.type === 'pickup' ? job.origin : job.destination) };
}

export const mapsUrl = (address) => (address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : null);

export const DECLINE_REASONS = ['Too far from my location', 'Not available at that time', 'Vehicle type not suitable', 'Other'];

export const INSPECTION_REQUIRED = ['exterior', 'scratches', 'visibleDamage'];
