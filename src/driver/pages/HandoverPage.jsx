import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card, CardHeader, DemoNotice, InlineAlert, useToast } from '../../portal/ui';
import { driverServices } from '../services';
import { notifyChanged } from '../../portal/lib/events';
import { TYPE_LABEL, phaseLabel } from '../domain/jobs';
import { useJob } from '../hooks/useJob';
import JobGate from '../features/JobGate';
import { PhaseBadge, TypeBadge } from '../features/JobCard';
import InspectionForm, { InspectionSummary } from '../features/InspectionForm';
import OtpVerify from '../features/OtpVerify';
import PrimaryAction from '../features/PrimaryAction';

function Complete({ job }) {
  return (
    <Card className="mx-auto max-w-xl overflow-hidden text-center">
      <div className="bg-gradient-to-b from-emerald-400/10 to-transparent px-6 pb-2 pt-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/40"><CheckCircle2 className="h-8 w-8 text-emerald-300" aria-hidden="true" /></span>
        <h2 className="mt-5 font-display text-2xl text-white">{job.type === 'pickup' ? 'Handover completed' : 'Job complete'}</h2>
        <p className="mt-2 text-slate-300">{job.type === 'pickup' ? `${job.vehicle.make} ${job.vehicle.model} was handed to ${job.center.name}. The center confirms receipt in its own portal.` : `${job.vehicle.make} ${job.vehicle.model} was delivered and verified.`}</p>
        <p className="mt-1 text-sm text-slate-400">{job.reference}</p>
      </div>
      <div className="space-y-3 px-6 pb-8 pt-5">
        <p className="text-sm text-slate-400">The job has left your active work and is in your history. The customer's booking shows the same update.</p>
        <div className="flex flex-wrap justify-center gap-2"><Button as={Link} to="/driver/dashboard">Back to dashboard</Button><Button as={Link} to="/driver/history" variant="secondary">View history</Button></div>
      </div>
    </Card>
  );
}

function CenterHandover({ job, apply }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try { const u = await driverServices.jobs.transition(job.id, 'handover_center', { expectedPhase: job.phase }); notifyChanged(); toast.push({ title: 'Handover recorded' }); apply(u); }
    catch (e) { toast.push({ tone: 'rose', title: 'Could not record handover', message: e.message }); apply(); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-slate-400">Service center</dt><dd className="text-white">{job.center.name}</dd><dd className="text-slate-400">{job.center.address}</dd></div>
        <div><dt className="text-xs text-slate-400">Vehicle</dt><dd className="text-white">{job.vehicle.make} {job.vehicle.model} · {job.vehicle.registration}</dd><dd className="text-slate-400">Pickup job {job.reference}</dd></div>
        {job.timestamps.centerArrivedAt && <div><dt className="text-xs text-slate-400">Arrival confirmed</dt><dd className="text-white">{new Date(job.timestamps.centerArrivedAt).toLocaleString()}</dd></div>}
      </dl>
      <div><h3 className="mb-2 font-display text-sm text-white">Condition record from pickup</h3><InspectionSummary inspection={job.inspection} /></div>
      <DemoNotice>No service-center code is required in this workflow. Your confirmation records your side of the handover. The service center then confirms receipt in its own portal, and the booking shows "received" only after that.</DemoNotice>
      <Button size="lg" className="w-full" onClick={run} loading={busy}>Confirm handover to service center</Button>
    </div>
  );
}

export default function HandoverPage() {
  const { jobId } = useParams();
  const { job, error, loading, reload, apply } = useJob(jobId);
  return <JobGate {...{ job, error, loading, reload }}>{job && <Body job={job} apply={apply} reload={reload} />}</JobGate>;
}

function Body({ job, apply, reload }) {
  if (['handed_over', 'completed'].includes(job.phase)) return <Complete job={job} />;
  const titles = { arrived: 'Record vehicle condition', inspected: `Verify ${job.type === 'pickup' ? 'pickup' : 'delivery'} code`, verified: 'Handover verified', collected: 'Collection confirmed', at_center: 'Hand over to the service center' };
  const t = titles[job.phase];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><TypeBadge type={job.type} /><PhaseBadge job={job} /></div>
        <h2 className="mt-3 font-display text-xl text-white">{job.reference}</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div><dt className="sr-only">Vehicle</dt><dd className="text-slate-200">{job.vehicle.make} {job.vehicle.model} · {job.vehicle.registration}</dd></div>
          <div><dt className="sr-only">Handover</dt><dd className="text-slate-400">{TYPE_LABEL[job.type]} handover{job.customer ? ` · ${job.customer.name}` : ''}</dd></div>
        </dl>
      </Card>

      {t ? (
        <Card><CardHeader title={t} /><div className="px-5 py-5">
          {job.phase === 'arrived' && <InspectionForm job={job} onSaved={apply} />}
          {job.phase === 'inspected' && <OtpVerify job={job} onVerified={apply} onRefresh={reload} />}
          {job.phase === 'verified' && <div className="space-y-4"><InlineAlert tone="green">Verified by the server{job.handover.verifiedAt ? ` at ${new Date(job.handover.verifiedAt).toLocaleTimeString()}` : ''}.</InlineAlert><PrimaryAction job={job} onChanged={apply} /></div>}
          {job.phase === 'collected' && <div className="space-y-4"><InlineAlert tone="green">Collection confirmed. The vehicle is with you.</InlineAlert><Button as={Link} to={`/driver/navigation/${job.id}`} size="lg" className="w-full">Go to journey screen</Button></div>}
          {job.phase === 'at_center' && <CenterHandover job={job} apply={apply} />}
        </div></Card>
      ) : (
        <InlineAlert tone="blue">Nothing to record or verify at this step ({phaseLabel(job.type, job.phase).toLowerCase()}). <Link to={`/driver/jobs/${job.id}`} className="font-semibold underline">Back to the job</Link></InlineAlert>
      )}
    </div>
  );
}
