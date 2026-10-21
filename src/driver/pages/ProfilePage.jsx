import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, ErrorState, Skeleton } from '../../portal/ui';
import { useAuth } from '../../portal/auth/AuthContext';
import { driverServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { initials } from '../../portal/lib/format';
import AvailabilityControl from '../features/AvailabilityControl';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;

export default function ProfilePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: p, error, loading, reload } = useAsync(() => driverServices.profile.get(), []);
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load your profile" />;
  if (loading || !p) return <Skeleton className="h-96" />;
  const tone = p.accountStatus === 'approved' ? 'green' : p.accountStatus === 'suspended' ? 'rose' : 'amber';
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="flex items-center gap-4 p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt-soft to-[#0b2f8f] font-display text-xl text-white">{initials(p.name)}</span>
        <div className="min-w-0"><h2 className="truncate font-display text-xl text-white">{p.name}</h2><Badge tone={tone}>Account {p.accountStatus}</Badge></div>
      </Card>
      <Card><CardHeader title="Account details" />
        <dl className="divide-y divide-white/10 px-5">
          <Row k="Phone">{p.phone}</Row><Row k="Email">{p.email}</Row><Row k="Service area">{p.serviceArea}</Row>
        </dl>
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Your details, approval and service area are managed by operations. Contact them to change anything here.</p>
      </Card>
      <Card><CardHeader title="Availability" /><div className="px-5 py-5"><AvailabilityControl /></div></Card>
      <Card><CardHeader title="Session" /><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5"><p className="text-sm text-slate-400">Log out of this device.</p><Button variant="danger" onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}>Log out</Button></div></Card>
    </div>
  );
}
