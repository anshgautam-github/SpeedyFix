import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import Logo from '../../landing/components/Logo';
import { useReducedMotion } from '../../landing/hooks/useReducedMotion';
import { useAuth } from '../../portal/auth/AuthContext';
import { PreviewBanner, DemoBadge, cx, useToast } from '../../portal/ui';
import { initials } from '../../portal/lib/format';
import { NAV, isActive, pageTitle } from './nav';
import { DriverProvider } from './DriverContext';
import AvailabilityControl from '../features/AvailabilityControl';
import DriverBell from './DriverBell';

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label="Profile menu"
        className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-volt-soft to-[#0b2f8f] font-display text-sm text-white ring-2 ring-white/10">{initials(user?.name)}</button>
      {open && (
        <div role="menu" className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1226] shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3"><p className="truncate text-sm font-semibold text-white">{user?.name}</p><p className="truncate text-xs text-slate-400">Driver</p></div>
          <Link role="menuitem" to="/driver/profile" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm hover:bg-white/5">Profile</Link>
          <button role="menuitem" type="button" onClick={onLogout} className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm text-rose-200 hover:bg-white/5">Log out</button>
        </div>
      )}
    </div>
  );
}

export default function DriverShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const reduced = useReducedMotion();
  useEffect(() => { window.scrollTo(0, 0); document.title = `${pageTitle(pathname)} | Speedy Fix Driver`; }, [pathname]);
  const logout = async () => { try { await signOut(); navigate('/login', { replace: true }); } catch (e) { toast.push({ tone: 'rose', title: 'Could not log out', message: e.message }); } };

  return (
    <DriverProvider key={user?.id}>
      <div className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-[#070c19] lg:flex">
          <Link to="/driver/dashboard" className="flex items-center gap-2.5 px-5 py-5"><Logo className="h-9 w-9" /><span className="font-display text-lg text-white">Speedy Fix<span className="block text-xs font-normal text-slate-400">Driver</span></span></Link>
          <nav aria-label="Driver portal" className="flex-1 px-3">
            <ul className="space-y-1">{NAV.map((item) => { const a = isActive(item, pathname); const Icon = item.icon; return (
              <li key={item.to}><Link to={item.to} aria-current={a ? 'page' : undefined} className={cx('flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium', a ? 'bg-volt/15 text-white ring-1 ring-inset ring-volt/30' : 'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon className={cx('h-[18px] w-[18px]', a ? 'text-volt-glow' : 'text-slate-400')} aria-hidden="true" />{item.label}</Link></li>); })}</ul>
          </nav>
          <div className="border-t border-white/10 p-3"><button type="button" onClick={logout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/5"><LogOut className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />Log out</button></div>
        </aside>

        <div className="lg:pl-64">
        <PreviewBanner />
          <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-white/10 bg-midnight/90 px-4 backdrop-blur-xl sm:px-6">
            <AccountMenu user={user} onLogout={logout} />
            <div className="min-w-0 flex-1 pl-1"><h1 className="truncate font-display text-lg leading-tight text-white">{pageTitle(pathname)}</h1><p className="hidden truncate text-xs text-slate-400 sm:block">{user?.name}</p></div>
            <DemoBadge className="hidden sm:inline-flex" />
            <AvailabilityControl compact />
            <DriverBell />
          </header>
          <main className="mx-auto max-w-5xl px-4 pb-40 pt-5 sm:px-6 lg:pb-12">
            <motion.div key={pathname} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}><Outlet /></motion.div>
          </main>
        </div>

        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-[#070c19]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          {NAV.filter((n) => !n.desktopOnly).map((item) => { const a = isActive(item, pathname); const Icon = item.icon; return (
            <Link key={item.to} to={item.to} aria-current={a ? 'page' : undefined} className={cx('flex min-h-[60px] flex-col items-center justify-center gap-1 text-xs font-medium', a ? 'text-white' : 'text-slate-400')}>
              <Icon className={cx('h-5 w-5', a && 'text-volt-glow')} aria-hidden="true" />{item.label}</Link>); })}
        </nav>
      </div>
    </DriverProvider>
  );
}
