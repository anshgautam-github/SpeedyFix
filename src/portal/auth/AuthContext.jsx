import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { services } from '../services';
import { Spinner } from '../ui/primitives';

const AuthCtx = createContext(null);

/** Where each role lands after sign-in. Roles come from the server session; the client can never grant itself one. */
/** Each portal has its own sign-in screen. */
export const LOGIN_FOR = { customer: '/login', driver: '/driver/login', center: '/service-center/login', admin: '/admin/login' };
export const homeFor = (user) => (user?.role === 'driver' ? '/driver/dashboard' : user?.role === 'center' ? '/service-center/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard');
export const useAuth = () => useContext(AuthCtx);

const fromSession = (s) => (s ? { status: 'authed', user: s.user } : { status: 'guest', user: null });

/** Wraps whatever auth the active adapter provides (demo store, or your real provider via the remote adapter). */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let alive = true;
    services.auth.getSession().then((s) => alive && setState(fromSession(s))).catch(() => alive && setState(fromSession(null)));
    const off = services.auth.subscribe((s) => setState(fromSession(s)));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      // Authentication is not configured in this build: these reject with NOT_CONFIGURED.
      signIn: (c) => services.auth.signIn(c),
      signInWithGoogle: () => services.auth.signInWithGoogle(),
      signUp: (c) => services.auth.signUp(c),
      requestPasswordReset: (c) => services.auth.requestPasswordReset(c),
      // Preview mode: explore a portal with demo data. Not authentication.
      enterPreview: services.auth.enterPreview ? (portal, level) => services.auth.enterPreview(portal, level) : null,
      signOut: () => services.auth.signOut(),
    }),
    [state]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

function FullScreenLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-midnight text-slate-300" role="status" aria-live="polite">
      <div className="flex items-center gap-3"><Spinner /> Loading your account</div>
    </div>
  );
}

/** With `role`, only that role may pass; everyone else is sent to their own home. (The backend must enforce this too.) */
export function RequireAuth({ children, role, denied }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoading />;
  if (status === 'guest') return <Navigate to={LOGIN_FOR[role || 'customer']} replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (role && (user?.role || 'customer') !== role) return denied || <Navigate to={homeFor(user)} replace />;
  return children;
}

export function GuestOnly({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoading />;
  if (status === 'authed') {
    const from = location.state?.from;
    const prefix = user.role === 'driver' ? '/driver' : user.role === 'center' ? '/service-center' : user.role === 'admin' ? '/admin' : '/customer';
    const allowed = from && from.startsWith(prefix);
    return <Navigate to={allowed ? from : homeFor(user)} replace />;
  }
  return children;
}
