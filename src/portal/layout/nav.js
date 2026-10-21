import { CalendarPlus, CarFront, LayoutDashboard, LifeBuoy, ListChecks, Navigation, UserRound } from 'lucide-react';

export const NAV = [
  { to: '/customer/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/customer/vehicles', label: 'My Vehicles', icon: CarFront },
  { to: '/customer/bookings/new', label: 'Book a Pickup', icon: CalendarPlus },
  { to: '/customer/bookings', label: 'My Bookings', icon: ListChecks },
  { to: '/customer/tracking', label: 'Track Vehicle', icon: Navigation },
  { to: '/customer/profile', label: 'Profile & Settings', icon: UserRound },
  { to: '/customer/help', label: 'Help & Support', icon: LifeBuoy },
];

export function isActive(item, pathname) {
  if (item.to === '/customer/bookings') return pathname.startsWith('/customer/bookings') && !pathname.startsWith('/customer/bookings/new');
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function pageMeta(pathname) {
  const home = { label: 'Overview', to: '/customer/dashboard' };
  const p = pathname.replace(/\/$/, '');
  if (p === '/customer/dashboard') return { title: 'Overview', crumbs: [] };
  if (p === '/customer/vehicles') return { title: 'My vehicles', crumbs: [home] };
  if (p === '/customer/bookings/new') return { title: 'Book a pickup', crumbs: [home, { label: 'My bookings', to: '/customer/bookings' }] };
  if (p === '/customer/bookings') return { title: 'My bookings', crumbs: [home] };
  if (p.startsWith('/customer/bookings/')) return { title: 'Booking details', crumbs: [home, { label: 'My bookings', to: '/customer/bookings' }] };
  if (p === '/customer/tracking') return { title: 'Track vehicle', crumbs: [home] };
  if (p.startsWith('/customer/tracking/')) return { title: 'Track vehicle', crumbs: [home, { label: 'My bookings', to: '/customer/bookings' }] };
  if (p === '/customer/notifications') return { title: 'Notifications', crumbs: [home] };
  if (p === '/customer/profile') return { title: 'Profile & settings', crumbs: [home] };
  if (p === '/customer/help') return { title: 'Help & support', crumbs: [home] };
  return { title: 'Customer portal', crumbs: [] };
}
