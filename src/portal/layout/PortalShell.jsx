import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarPlus, ChevronRight, LogOut, Menu, X, LayoutDashboard, ListChecks, Navigation } from 'lucide-react';
import Logo from '../../landing/components/Logo';
import { useReducedMotion } from '../../landing/hooks/useReducedMotion';
import { useAuth } from '../auth/AuthContext';
import { PreviewBanner, DemoBadge, cx, useToast } from '../ui';
import { initials } from '../lib/format';
import { NAV, isActive, pageMeta } from './nav';
import NotificationBell from './NotificationBell';

function NavItems({ pathname, onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <li key={item.to}>
            <Link to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={cx('flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors', active ? 'bg-volt/15 text-white ring-1 ring-inset ring-volt/30' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
              <Icon className={cx('h-[18px] w-[18px]', active ? 'text-volt-glow' : 'text-slate-400')} aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ pathname, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/customer/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5">
        <Logo className="h-9 w-9" />
        <span className="font-display text-lg leading-none text-white">Speedy Fix</span>
      </Link>
      <nav aria-label="Customer portal" className="flex-1 overflow-y-auto px-3"><NavItems pathname={pathname} onNavigate={onNavigate} /></nav>
      <div className="border-t border-white/10 p-3">
        <button type="button" onClick={onLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          <LogOut className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  );
}

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label="Account menu"
        className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-volt-soft to-[#0b2f8f] font-display text-sm text-white ring-2 ring-white/10 hover:ring-white/30">
        {initials(user?.name)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1226] shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <Link role="menuitem" to="/customer/profile" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-white/5">Profile & settings</Link>
          <Link role="menuitem" to="/customer/help" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-white/5">Help & support</Link>
          <button role="menuitem" type="button" onClick={onLogout} className="block w-full border-t border-white/10 px-4 py-2.5 text-left text-sm text-rose-200 hover:bg-white/5">Log out</button>
        </div>
      )}
    </div>
  );
}

const BOTTOM = [
  { to: '/customer/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/customer/bookings', label: 'Bookings', icon: ListChecks },
  { to: '/customer/bookings/new', label: 'Book', icon: CalendarPlus, primary: true },
  { to: '/customer/tracking', label: 'Track', icon: Navigation },
];

export default function PortalShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [drawer, setDrawer] = useState(false);
  const meta = pageMeta(pathname);

  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = `${meta.title} | Speedy Fix`; }, [meta.title]);
  useEffect(() => {
    if (!drawer) return undefined;
    const esc = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [drawer]);

  const logout = async () => {
    try { await signOut(); navigate('/login', { replace: true }); }
    catch (e) { toast.push({ tone: 'rose', title: 'Could not log out', message: e.message }); }
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 bg-[#070c19] lg:block"><SidebarBody pathname={pathname} onLogout={logout} /></aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)} style={{ background: 'rgba(0,0,0,.65)' }}>
          <aside className="h-full w-72 max-w-[85vw] border-r border-white/10 bg-[#070c19]" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><X className="h-5 w-5" aria-hidden="true" /></button>
            <SidebarBody pathname={pathname} onNavigate={() => setDrawer(false)} onLogout={logout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <PreviewBanner />
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-midnight/85 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-xl text-slate-300 hover:bg-white/10 lg:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></button>
          <div className="min-w-0 flex-1">
            {meta.crumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
                {meta.crumbs.map((c) => (<span key={c.to} className="flex items-center gap-1"><Link to={c.to} className="hover:text-white">{c.label}</Link><ChevronRight className="h-3 w-3" aria-hidden="true" /></span>))}
              </nav>
            )}
            <h1 className="truncate font-display text-lg leading-tight text-white sm:text-xl">{meta.title}</h1>
          </div>
          <DemoBadge className="hidden sm:inline-flex" />
          <NotificationBell />
          <AccountMenu user={user} onLogout={logout} />
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <motion.div key={pathname} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#070c19]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {BOTTOM.map((b) => {
          const active = isActive(b, pathname);
          const Icon = b.icon;
          return (
            <Link key={b.to} to={b.to} aria-current={active ? 'page' : undefined} className={cx('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium', active ? 'text-white' : 'text-slate-400')}>
              <span className={cx('grid h-7 w-7 place-items-center rounded-full', b.primary ? 'bg-volt text-white' : active ? 'text-volt-glow' : '')}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              {b.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium text-slate-400">
          <span className="grid h-7 w-7 place-items-center"><Menu className="h-[18px] w-[18px]" aria-hidden="true" /></span>More
        </button>
      </nav>
    </div>
  );
}
