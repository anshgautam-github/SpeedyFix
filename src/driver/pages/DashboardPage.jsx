import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CheckCircle2, Flag, Inbox, Navigation } from 'lucide-react';
import { useAuth } from '../../portal/auth/AuthContext';
import { driverServices, driverDemo } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { PageHeader, Button, Card, CardHeader, DemoNotice, EmptyState, ErrorState, Skeleton, useToast } from '../../portal/ui';
import { firstName, greeting } from '../../portal/lib/format';
import { notifyChanged } from '../../portal/lib/events';
import AvailabilityControl from '../features/AvailabilityControl';
import JobCard from '../features/JobCard';
import { useDriver } from '../layout/DriverContext';

const Stat = ({ icon: Icon, label, value, tone }) => (
  <Card className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div><p className="mt-2 font-display text-3xl text-white tabular-nums">{value}</p></Card>
);
const Section = ({ id, title, children, action }) => (
  <section aria-labelledby={id} className="space-y-3"><div className="flex items-center justify-between"><h2 id={id} className="font-display text-base text-white">{title}</h2>{action}</div>{children}</section>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { availability, reload: reloadAvail } = useDriver();
  const [offering, setOffering] = useState(false);
  const q = useAsync(() => driverServices.jobs.stats(), []);
  usePolling(() => q.reload(true), 10000);
  const s = q.data;
  const changed = () => { q.reload(true); reloadAvail(true); notifyChanged(); };

  const simulate = async (type) => {
    setOffering(true);
    try { await driverDemo.simulateOffer(type); notifyChanged(); await q.reload(true); toast.push({ title: 'Simulated offer received' }); }
    catch (e) { toast.push({ tone: 'rose', title: 'No offer created', message: e.message }); } finally { setOffering(false); }
  };

  if (q.error?.code === 'ACCOUNT_NOT_APPROVED') return <ErrorState error={q.error} title="Account not approved" />;
  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}, ${firstName(user?.name)}`} description="Your assignments for today." />
      <Card className="p-4 sm:p-5"><AvailabilityControl /></Card>

      {q.error && <ErrorState error={q.error} onRetry={q.reload} title="Could not load your dashboard" />}
      {q.loading && !s && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={CalendarCheck} label="Assigned today" value={s.assignedToday} tone="bg-volt/15 text-volt-glow" />
            <Stat icon={Inbox} label="Awaiting acceptance" value={s.awaiting} tone="bg-amber-400/10 text-amber-300" />
            <Stat icon={Navigation} label="Active trips" value={s.active} tone="bg-sky-400/10 text-sky-300" />
            <Stat icon={CheckCircle2} label="Completed jobs" value={s.completed} tone="bg-emerald-400/10 text-emerald-300" />
          </div>

          <Section id="cur-h" title="Current job">
            {s.current ? <JobCard job={s.current} onChanged={changed} /> : (
              <EmptyState icon={Flag} title="No active job">{availability?.state === 'online' ? 'You are online. New offers will appear here when operations assigns them.' : 'Go online to receive offers. Assigned jobs appear here.'}</EmptyState>
            )}
          </Section>

          {s.offers.length > 0 && <Section id="off-h" title={`New job offers (${s.offers.length})`}>{s.offers.map((j) => <JobCard key={j.id} job={j} onChanged={changed} />)}</Section>}
          {s.upcoming.length > 0 && <Section id="up-h" title="Upcoming assignments" action={<Link to="/driver/jobs" className="text-sm text-volt-glow hover:underline">All jobs</Link>}>{s.upcoming.filter((j) => j.id !== s.current?.id).map((j) => <JobCard key={j.id} job={j} onChanged={changed} />)}</Section>}
          {s.recent.length > 0 && (
            <Section id="rec-h" title="Recently completed" action={<Link to="/driver/history" className="text-sm text-volt-glow hover:underline">History</Link>}>
              <Card><ul className="divide-y divide-white/10">{s.recent.map((j) => (
                <li key={j.id}><Link to={`/driver/jobs/${j.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5"><span><span className="block text-sm text-white">{j.reference} · {j.vehicle.make} {j.vehicle.model}</span><span className="text-xs text-slate-400">{j.type === 'pickup' ? 'Pickup' : 'Delivery'} · {j.vehicle.registration}</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /></Link></li>))}</ul></Card>
            </Section>
          )}
        </>
      )}

      {driverDemo && (
        <Card className="border-amber-400/25"><CardHeader title="Demo controls" />
          <div className="space-y-3 px-5 py-5">
            <DemoNotice>In production, operations assigns jobs to drivers. Here you can simulate a dispatch offer from bookings made in the customer portal. You must be online.</DemoNotice>
            <div className="flex flex-wrap gap-2"><Button variant="secondary" loading={offering} onClick={() => simulate('pickup')}>Simulate a pickup offer</Button><Button variant="secondary" loading={offering} onClick={() => simulate('delivery')}>Simulate a delivery offer</Button></div>
          </div>
        </Card>
      )}
    </div>
  );
}
