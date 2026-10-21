import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../portal/ui';
import { useAuth, homeFor } from '../../portal/auth/AuthContext';

/** Shown to signed-in users whose role cannot use the service-center area (the backend refuses them as well). */
export default function AccessDenied() {
  const { user } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div role="alert" className="max-w-md rounded-2xl border border-white/10 bg-[#0A1226] p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-300"><ShieldAlert className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-4 font-display text-2xl text-white">Access denied</h1>
        <p className="mt-2 text-slate-300">The service center area is only for authorized staff of a service center. Your account does not have access.</p>
        <Button as={Link} to={homeFor(user)} className="mt-6">Go to my dashboard</Button>
      </div>
    </div>
  );
}
