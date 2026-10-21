import { Link, useParams } from 'react-router-dom';
import { ExternalLink, MapPin, Phone } from 'lucide-react';
import { Button, Card, CardHeader, InlineAlert } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { currentTarget, groupOf, mapsUrl, nextStep, phaseLabel } from '../domain/jobs';
import { useJob } from '../hooks/useJob';
import JobGate, { StickyAction } from '../features/JobGate';
import { PhaseBadge, TypeBadge } from '../features/JobCard';
import PrimaryAction from '../features/PrimaryAction';
import Workflow from '../features/Workflow';

const STAMPS = [['offeredAt', 'Offered'], ['acceptedAt', 'Accepted'], ['startedAt', 'Journey started'], ['arrivedAt', 'Arrived'], ['collectedAt', 'Collection confirmed'], ['toCenterAt', 'Left for service center'], ['centerArrivedAt', 'Arrived at service center'], ['handedOverAt', 'Handed over'], ['completedAt', 'Completed']];

export default function NavigationPage() {
  const { jobId } = useParams();
  const { job, error, loading, reload, apply } = useJob(jobId);
  return <JobGate {...{ job, error, loading, reload }}>{job && <Journey job={job} apply={apply} />}</JobGate>;
}

function Journey({ job, apply }) {
  const t = currentTarget(job);
  const open = ['assigned', 'in_progress'].includes(groupOf(job.phase));
  const link = open ? mapsUrl(t.address) : null;
  const phone = job.customer?.phone;
  const step = nextStep(job);
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><TypeBadge type={job.type} /><PhaseBadge job={job} /><Link to={`/driver/jobs/${job.id}`} className="ml-auto font-display text-sm text-white hover:text-volt-glow">{job.reference}</Link></div>
        <p className="mt-3 text-sm text-slate-400">{job.vehicle.make} {job.vehicle.model} · {job.vehicle.registration}</p>
      </Card>
      {!open && <InlineAlert tone="blue">This job is {phaseLabel(job.type, job.phase).toLowerCase()}. Navigation is available for assigned and active jobs.</InlineAlert>}
      {open && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-volt/[.14] to-transparent px-5 py-4"><p className="text-xs text-slate-300">Next stop · {t.label}</p><p className="mt-1 font-display text-xl leading-snug text-white">{t.name}</p><p className="mt-1 flex items-start gap-2 text-base text-slate-200"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-volt-glow" aria-hidden="true" />{t.address}</p>{t.landmark && <p className="mt-1 pl-6 text-sm text-slate-400">{t.landmark}</p>}</div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Button as="a" size="lg" href={link || undefined} target="_blank" rel="noreferrer" aria-disabled={!link}><ExternalLink className="h-5 w-5" aria-hidden="true" />Open in maps</Button>
            {phone ? <Button as="a" size="lg" variant="secondary" href={`tel:${phone.replace(/\s/g, '')}`}><Phone className="h-5 w-5" aria-hidden="true" />Call customer</Button> : <p className="self-center text-sm text-slate-400">Customer contact is not shown for this leg.</p>}
          </div>
        </Card>
      )}
      <InlineAlert tone="blue">Live location sharing is not part of this build and no GPS is captured. This screen shows the status and times confirmed by the server.</InlineAlert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Progress" /><div className="px-5 py-5"><Workflow job={job} /></div></Card>
        <Card><CardHeader title="Timestamps" />
          <ul className="divide-y divide-white/10">{STAMPS.filter(([k]) => job.timestamps[k]).map(([k, l]) => <li key={k} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="text-slate-100">{l}</span><span className="text-xs text-slate-400">{fmtDateTime(job.timestamps[k])}</span></li>)}
            {!STAMPS.some(([k]) => job.timestamps[k]) && <li className="px-5 py-6 text-center text-sm text-slate-400">No timestamps yet.</li>}</ul></Card>
      </div>
      {open && step && <StickyAction><div className="space-y-1.5"><p className="text-center text-xs text-slate-400">Next required action</p><PrimaryAction job={job} onChanged={apply} /></div></StickyAction>}
    </div>
  );
}
