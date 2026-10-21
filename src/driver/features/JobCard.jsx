import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { Badge, Card, DemoBadge, cx } from '../../portal/ui';
import { fmtDate } from '../../portal/lib/format';
import { TYPE_LABEL, groupOf, phaseLabel } from '../domain/jobs';
import JobOfferActions from './JobOfferActions';
import PrimaryAction from './PrimaryAction';

const TONE = { offers: 'amber', assigned: 'slate', in_progress: 'blue', completed: 'green', cancelled: 'rose', declined: 'slate' };
export const PhaseBadge = ({ job }) => <Badge tone={TONE[groupOf(job.phase)]}>{phaseLabel(job.type, job.phase)}</Badge>;
export const TypeBadge = ({ type }) => <Badge tone={type === 'pickup' ? 'blue' : 'slate'}>{TYPE_LABEL[type]}</Badge>;

export function Route({ job, dense }) {
  return (
    <div className={cx('relative space-y-3 pl-6', dense && 'space-y-2')}>
      <span aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-white/15" />
      {[['From', job.origin], ['To', job.destination]].map(([k, p], i) => (
        <div key={k} className="relative">
          <span aria-hidden="true" className={cx('absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2', i === 0 ? 'border-volt-glow bg-[#0A1226]' : 'border-volt bg-volt')} />
          <p className="text-xs text-slate-400">{k}{p.name ? ` · ${p.name}` : ''}</p>
          <p className={cx('text-base leading-snug', p.redacted ? 'text-slate-400' : 'text-white')}>{p.address || 'Not provided'}</p>
          {p.landmark && <p className="text-sm text-slate-400">{p.landmark}</p>}
        </div>
      ))}
    </div>
  );
}

/** A job summary. Offers carry Accept/Decline; accepted and active jobs carry their next step. */
export default function JobCard({ job, onChanged, showAction = true }) {
  const group = groupOf(job.phase);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={job.type} /><PhaseBadge job={job} />{job.demo && <DemoBadge />}
        <Link to={`/driver/jobs/${job.id}`} className="ml-auto font-display text-sm text-white hover:text-volt-glow">{job.reference}</Link>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg text-white">{job.vehicle.make} {job.vehicle.model}</p>
        <p className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-sm tracking-wider text-white">{job.vehicle.registration}</p>
      </div>
      <div className="mt-4"><Route job={job} dense /></div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
        <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />{fmtDate(job.schedule.date)}, {job.schedule.slot}</span>
        {job.customer && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />{job.customer.name}</span>}
      </div>
      {job.instructions && <p className="mt-3 line-clamp-2 rounded-lg bg-white/[.04] px-3 py-2 text-sm text-slate-300">{job.instructions}</p>}
      {showAction && ['offers', 'assigned', 'in_progress'].includes(group) && (
        <div className="mt-4 space-y-2">
          {group === 'offers' ? <JobOfferActions job={job} onChanged={onChanged} /> : <PrimaryAction job={job} onChanged={onChanged} />}
          <Link to={`/driver/jobs/${job.id}`} className="flex items-center justify-center gap-1 text-sm text-volt-glow hover:underline">Job details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      )}
    </Card>
  );
}
