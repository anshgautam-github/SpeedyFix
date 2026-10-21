import { BarChart3, CarFront, ClipboardList, LayoutDashboard, ListChecks, PackageCheck, Settings, Truck, UserRound, Users } from 'lucide-react';

/** `perm` hides links the role cannot use. The server enforces access regardless. */
export const NAV = [
  { to: '/service-center/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'bookings.manage' },
  { to: '/service-center/bookings', label: 'Bookings', icon: ListChecks, perm: 'bookings.manage' },
  { to: '/service-center/receiving', label: 'Receiving', icon: PackageCheck, perm: 'receive' },
  { to: '/service-center/vehicles', label: 'Vehicles', icon: CarFront, perm: 'bookings.manage' },
  { to: '/service-center/work-orders', label: 'Work orders', icon: ClipboardList, perm: 'wo.progress' },
  { to: '/service-center/technicians', label: 'Technicians', icon: Users, perm: 'wo.assign' },
  { to: '/service-center/deliveries', label: 'Deliveries', icon: Truck, perm: 'bookings.manage' },
  { to: '/service-center/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
  { to: '/service-center/profile', label: 'Profile', icon: UserRound },
  { to: '/service-center/settings', label: 'Settings', icon: Settings },
];
export const isActive = (item, p) => p === item.to || p.startsWith(`${item.to}/`) || (item.to.endsWith('/bookings') && p.startsWith('/service-center/bookings'));
export function pageTitle(p) {
  if (p === '/service-center/bookings/new') return 'Create booking';
  if (p.startsWith('/service-center/bookings/')) return 'Booking details';
  if (p.startsWith('/service-center/work-orders/')) return 'Work order';
  return { '/service-center/dashboard': 'Dashboard', '/service-center/bookings': 'Bookings', '/service-center/receiving': 'Vehicle receiving', '/service-center/vehicles': 'Vehicles', '/service-center/work-orders': 'Work orders', '/service-center/technicians': 'Technicians', '/service-center/deliveries': 'Deliveries', '/service-center/reports': 'Reports', '/service-center/profile': 'Profile', '/service-center/settings': 'Settings' }[p.replace(/\/$/, '')] || 'Service center';
}
