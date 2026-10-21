import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import Logo from '../../landing/components/Logo';
import { useReducedMotion } from '../../landing/hooks/useReducedMotion';
import { useAuth } from '../../portal/auth/AuthContext';
import { PreviewBanner, Badge, DemoBadge, cx, useToast } from '../../portal/ui';
import { initials } from '../../portal/lib/format';
import { usePolling } from '../../portal/hooks/useAsync';
import { onDataChanged } from '../../portal/lib/events';
import { adminServices } from '../services';
import { AdminProvider, useAdmin } from './AdminContext';
import { NAV, isActive, pageTitle } from './nav';
import { ADMIN_LABEL } from '../domain/model';

function SideBody({ pathname, onNavigate, onLogout }) {
  const { can } = useAdmin();
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5"><Logo className="h-9 w-9" /><span className="font-display text-lg leading-tight text-white">Speedy Fix<span className="block text-xs font-normal text-slate-400">Admin</span></span></Link>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3"><ul className="space-y-0.5">{NAV.filter((n) => !n.perm || can(n.perm)).map((item) => { const a = isActive(item, pathname); const Icon = item.icon; return (
        <li key={item.to}><Link to={item.to} onClick={onNavigate} aria-current={a ? 'page' : undefined} className={cx('flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium', a ? 'bg-volt/15 text-white ring-1 ring-inset ring-volt/30' : 'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon className={cx('h-[18px] w-[18px]', a ? 'text-volt-glow' : 'text-slate-400')} aria-hidden="true" />{item.label}</Link></li>); })}</ul></nav>
      <div className="border-t border-white/10 p-3"><button type="button" onClick={onLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/5"><LogOut className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />Log out</button></div>
    </div>
  );
}

function Frame() {
  const { signOut } = useAuth();
  const { user } = useAdmin();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(0);
  const box = useRef(null);
  const loadCount = () => adminServices.alerts.count().then(setOpen).catch(() => {});
  useEffect(() => { loadCount(); return onDataChanged(loadCount); }, []);
  usePolling(loadCount, 20000);
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); document.title = `${pageTitle(pathname)} | Speedy Fix Admin`; }, [pathname]);
  useEffect(() => {
    if (!menu) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setMenu(false);
    const esc = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [menu]);
  const logout = async () => { try { await signOut(); navigate('/login', { replace: true }); } catch (e) { toast.push({ tone: 'rose', title: 'Could not log out', message: e.message }); } };
  const bottom = ['Dashboard', 'Bookings', 'Assignments', 'Alerts'];
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/10 bg-[#070c19] lg:block"><SideBody pathname={pathname} onLogout={logout} /></aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ background: 'rgba(0,0,0,.65)' }} onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-white/10 bg-[#070c19]" role="dialog" aria-modal="true" aria-label="Menu"><button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><X className="h-5 w-5" aria-hidden="true" /></button><SideBody pathname={pathname} onNavigate={() => setDrawer(false)} onLogout={logout} /></aside>
        </div>
      )}
      <div className="lg:pl-60">
        <PreviewBanner />
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-white/10 bg-midnight/90 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 lg:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></button>
          <div className="min-w-0 flex-1"><h1 className="truncate font-display text-lg leading-tight text-white">{pageTitle(pathname)}</h1><p className="hidden text-xs text-slate-400 sm:block">Platform operations · {new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</p></div>
          <DemoBadge className="hidden sm:inline-flex" />
          <Badge tone="blue" className="hidden sm:inline-flex">{ADMIN_LABEL[user.adminLevel]}</Badge>
          <Link to="/admin/notifications" aria-label={open ? `Alerts, ${open} need attention` : 'Alerts'} className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"><Bell className="h-5 w-5" aria-hidden="true" />{open > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-700 px-1 text-xs font-bold text-white">{open > 9 ? '9+' : open}</span>}</Link>
          <div className="relative" ref={box}>
            <button type="button" onClick={() => setMenu((o) => !o)} aria-expanded={menu} aria-haspopup="true" aria-label="Admin menu" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-volt-soft to-[#0b2f8f] font-display text-sm text-white ring-2 ring-white/10">{initials(user.name)}</button>
            {menu && <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1226] shadow-2xl"><div className="border-b border-white/10 px-4 py-3"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="truncate text-xs text-slate-400">{ADMIN_LABEL[user.adminLevel]}</p></div><Link role="menuitem" to="/admin/settings" onClick={() => setMenu(false)} className="block px-4 py-3 text-sm hover:bg-white/5">Settings</Link><button role="menuitem" type="button" onClick={logout} className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm text-rose-200 hover:bg-white/5">Log out</button></div>}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12"><motion.div key={pathname} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}><Outlet /></motion.div></main>
      </div>
      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#070c19]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {NAV.filter((n) => bottom.includes(n.label)).map((item) => { const a = isActive(item, pathname); const Icon = item.icon; return <Link key={item.to} to={item.to} aria-current={a ? 'page' : undefined} className={cx('flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium', a ? 'text-white' : 'text-slate-400')}><Icon className={cx('h-5 w-5', a && 'text-volt-glow')} aria-hidden="true" />{item.label}</Link>; })}
        <button type="button" onClick={() => setDrawer(true)} className="flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-slate-400"><Menu className="h-5 w-5" aria-hidden="true" />More</button>
      </nav>
    </div>
  );
}

export default function AdminShell() {
  const { user } = useAuth();
  // Keyed by user so a different signed-in person never inherits cached permissions.
  return <AdminProvider key={user?.id}><Frame /></AdminProvider>;
}
