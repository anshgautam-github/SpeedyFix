import { Bell, History, LayoutDashboard, Truck, UserRound } from 'lucide-react';

export const NAV = [
  { to: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/driver/jobs', label: 'Jobs', icon: Truck },
  { to: '/driver/history', label: 'History', icon: History },
  { to: '/driver/notifications', label: 'Notifications', icon: Bell, desktopOnly: true },
  { to: '/driver/profile', label: 'Profile', icon: UserRound },
];
export const isActive = (item, p) => (item.to === '/driver/jobs' ? ['/driver/jobs', '/driver/navigation', '/driver/handover'].some((x) => p === x || p.startsWith(`${x}/`)) : p === item.to || p.startsWith(`${item.to}/`));
export function pageTitle(p) {
  if (p.startsWith('/driver/jobs/')) return 'Job details';
  if (p.startsWith('/driver/navigation/')) return 'Journey';
  if (p.startsWith('/driver/handover/')) return 'Handover';
  return { '/driver/dashboard': 'Dashboard', '/driver/jobs': 'Jobs', '/driver/history': 'History', '/driver/notifications': 'Notifications', '/driver/profile': 'Profile' }[p.replace(/\/$/, '')] || 'Driver portal';
}
