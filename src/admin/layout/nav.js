import { Activity, BarChart3, Bell, Building2, CarFront, ClipboardList, KeyRound, LayoutDashboard, ListChecks, Navigation, ScrollText, Settings, ShieldCheck, Truck, UserRound, Users } from 'lucide-react';

/** `perm` hides links the level cannot use. The server enforces access regardless. */
export const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/bookings', label: 'Bookings', icon: ListChecks },
  { to: '/admin/assignments', label: 'Assignments', icon: Truck },
  { to: '/admin/journeys', label: 'Journeys', icon: Navigation },
  { to: '/admin/handovers', label: 'Handovers', icon: KeyRound },
  { to: '/admin/work-orders', label: 'Work orders', icon: ClipboardList },
  { to: '/admin/vehicles', label: 'Vehicles', icon: CarFront },
  { to: '/admin/drivers', label: 'Drivers', icon: ShieldCheck },
  { to: '/admin/service-centers', label: 'Service centers', icon: Building2 },
  { to: '/admin/customers', label: 'Customers', icon: UserRound },
  { to: '/admin/users', label: 'Users', icon: Users, perm: 'users.manage' },
  { to: '/admin/notifications', label: 'Alerts', icon: Bell },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
  { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText, perm: 'audit.view' },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];
export const isActive = (item, p) => p === item.to || p.startsWith(`${item.to}/`);
export const ICON_ACTIVITY = Activity;
export function pageTitle(p) {
  if (p.startsWith('/admin/bookings/')) return 'Booking';
  if (p.startsWith('/admin/users/')) return 'User';
  if (p.startsWith('/admin/service-centers/')) return 'Service center';
  const m = NAV.find((n) => n.to === p.replace(/\/$/, ''));
  return m ? m.label : 'Admin';
}
