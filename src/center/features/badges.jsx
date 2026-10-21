import { Badge } from '../../portal/ui';
import { BOOKING_TONE, WO_STATUS, bookingLabel, money as fmt } from '../domain/model';

export const BookingBadge = ({ statusKey }) => <Badge tone={BOOKING_TONE[statusKey] || 'slate'}>{bookingLabel(statusKey)}</Badge>;
export const WoBadge = ({ status }) => (status ? <Badge tone={WO_STATUS[status]?.tone || 'slate'}>{WO_STATUS[status]?.label || status}</Badge> : <span className="text-slate-400">No work order</span>);
export const PriorityBadge = ({ priority }) => (priority === 'urgent' ? <Badge tone="rose">Urgent</Badge> : null);
export const money = fmt;
