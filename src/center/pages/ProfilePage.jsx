import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardHeader } from '../../portal/ui';
import { useAuth } from '../../portal/auth/AuthContext';
import { initials } from '../../portal/lib/format';
import { ROLE_LABEL } from '../domain/model';
import { useCenter } from '../layout/CenterContext';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;

export default function ProfilePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { user, center } = useCenter();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="flex items-center gap-4 p-5"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt-soft to-[#0b2f8f] font-display text-xl text-white">{initials(user.name)}</span><div className="min-w-0"><h2 className="truncate font-display text-xl text-white">{user.name}</h2><div className="mt-1 flex flex-wrap gap-2"><Badge tone="blue">{ROLE_LABEL[user.staffRole] || user.staffRole}</Badge><Badge tone="green">Account active</Badge></div></div></Card>
      <Card><CardHeader title="Your account" /><dl className="divide-y divide-white/10 px-5"><Row k="Email">{user.email}</Row><Row k="Role">{ROLE_LABEL[user.staffRole]}</Row><Row k="Service center">{center.name}</Row></dl><p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Your role and center are assigned by an administrator. They cannot be changed here.</p></Card>
      <Card><CardHeader title="Session" /><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5"><p className="text-sm text-slate-400">Log out of this device.</p><Button variant="danger" onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}>Log out</Button></div></Card>
    </div>
  );
}
