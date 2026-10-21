import { Outlet } from 'react-router-dom';
import '../portal.css';
import { AuthProvider } from '../auth/AuthContext';
import { ToastProvider } from '../ui';

/** Layout route: gives every portal screen auth state and toasts. */
export default function PortalProviders() {
  return (
    <div className="sf-portal min-h-screen bg-midnight font-sans text-slate-200 antialiased">
      <AuthProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AuthProvider>
    </div>
  );
}
