import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Phone } from 'lucide-react';
import { Button, Card, CardHeader, DemoBadge, InlineAlert } from '../../portal/ui';
import { fmtDate, fmtDateTime } from '../../portal/lib/format';
import { TYPE_LABEL, groupOf, mapsUrl } from '../domain/jobs';
import { useJob } from '../hooks/useJob';
import JobGate, { StickyAction } from '../features/JobGate';
import { PhaseBadge, Route, TypeBadge } from '../features/JobCard';
import PrimaryAction from '../features/PrimaryAction';
import JobOfferActions from '../features/JobOfferActions';
import Workflow from '../features/Workflow';
import { InspectionSummary } from '../features/InspectionForm';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not provided</span>}</dd></div>;

export default function JobDetailPage() {
  const { jobId } = useParams();
  const { job, error, loading, reload, apply } = useJob(jobId);
  return (
    <JobGate {...{ job, error, loading, reload }}>
      {job && <Detail job={job} apply={apply} />}
    </JobGate>
  );
}

function Detail({ job, apply }) {
  const group = groupOf(job.phase);
  const open = ['offers', 'assigned', 'in_progress'].includes(group);
  const dest = mapsUrl(job.destination.redacted ? '' : job.destination.address);
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2"><TypeBadge type={job.type} /><PhaseBadge job={job} />{job.demo && <DemoBadge />}</div>
        <h2 className="mt-3 font-display text-2xl text-white">{job.reference}</h2>
        <p className="text-slate-300">{job.vehicle.make} {job.vehicle.model} · <span className="font-mono tracking-wider">{job.vehicle.registration}</span> · {job.vehicle.type}</p>
        {group === 'cancelled' && <InlineAlert className="mt-4">The customer cancelled this booking. No further action is needed.</InlineAlert>}
        {group === 'offers' && <InlineAlert tone="amber" className="mt-4">This is a new offer. Full address and customer contact are shown after you accept.</InlineAlert>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Route" action={open && group !== 'offers' ? <Button as="a" href={mapsUrl(job.type === 'pickup' ? job.origin.address : job.destination.address) || undefined} target="_blank" rel="noreferrer" variant="secondary" size="sm"><ExternalLink className="h-4 w-4" aria-hidden="true" />Open maps</Button> : null} />
            <div className="px-5 py-5"><Route job={job} /></div></Card>
          <Card><CardHeader title="Job information" />
            <dl className="divide-y divide-white/10 px-5">
              <Row k="Job type">{TYPE_LABEL[job.type]}</Row>
              <Row k="Scheduled">{job.schedule.date ? `${fmtDate(job.schedule.date)}, ${job.schedule.slot}` : null}</Row>
              <Row k="Service center">{job.center.name}<span className="block text-slate-400">{job.center.address}</span></Row>
              <Row k="Customer">{job.customer ? <span className="flex flex-wrap items-center gap-3">{job.customer.name}{job.customer.phone && <a href={`tel:${job.customer.phone.replace(/\s/g, '')}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-white hover:bg-white/10"><Phone className="h-4 w-4 text-volt-glow" aria-hidden="true" />Call</a>}</span> : null}</Row>
              <Row k="Instructions">{job.instructions}</Row>
              <Row k="Handover">Customer's 6-digit code, checked by the server. Vehicle condition must be recorded first.</Row>
            </dl></Card>
          <Card><CardHeader title="Vehicle condition" /><div className="px-5 py-5"><InspectionSummary inspection={job.inspection} /></div></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Progress" /><div className="px-5 py-5"><Workflow job={job} /></div></Card>
          <Card><CardHeader title="History" />
            <ul className="divide-y divide-white/10">{job.history.length ? job.history.map((h, i) => <li key={i} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="text-slate-100">{h.label}</span><span className="shrink-0 text-xs text-slate-400">{fmtDateTime(h.at)}</span></li>) : <li className="px-5 py-6 text-center text-sm text-slate-400">No events yet.</li>}</ul></Card>
        </div>
      </div>

      {open && (
        <StickyAction>
          {group === 'offers' ? <JobOfferActions job={job} onChanged={apply} /> : (
            <div className="space-y-2"><PrimaryAction job={job} onChanged={apply} />{group === 'in_progress' && <Link to={`/driver/navigation/${job.id}`} className="block text-center text-sm text-volt-glow hover:underline">Open journey screen</Link>}</div>
          )}
        </StickyAction>
      )}
    </div>
  );
}
