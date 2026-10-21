import { Check } from 'lucide-react';
import { cx } from '../../portal/ui';
import { WORKFLOWS, phaseIndex } from '../domain/jobs';

/** Progress through the job's workflow. The current step is highlighted; finished steps carry a check. */
export default function Workflow({ job, compact = false }) {
  const steps = WORKFLOWS[job.type];
  const done = ['handed_over', 'completed'].includes(job.phase);
  const cur = ['offered', 'declined', 'cancelled'].includes(job.phase) ? -1 : phaseIndex(job.type, job.phase);
  return (
    <ol aria-label="Job progress">
      {steps.map((s, i) => {
        const ok = done || i < cur;
        const active = !done && i === cur;
        return (
          <li key={s.phase} aria-current={active ? 'step' : undefined} className={cx('relative flex gap-3', compact ? 'pb-2.5' : 'pb-4', 'last:pb-0')}>
            {i < steps.length - 1 && <span aria-hidden="true" className={cx('absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5', ok ? 'bg-volt/70' : 'bg-white/10')} />}
            <span className={cx('relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border', ok && 'border-volt bg-volt text-white', active && 'border-volt-glow bg-[#0f2a66] ring-4 ring-volt/25', !ok && !active && 'border-white/15 bg-[#0A1226]')}>
              {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : active ? <span className="h-2 w-2 rounded-full bg-volt-glow" /> : null}
            </span>
            <p className={cx('text-sm', active ? 'font-semibold text-white' : ok ? 'text-slate-200' : 'text-slate-400')}>{s.label}<span className="sr-only">{ok ? ', completed' : active ? ', current step' : ', not reached'}</span></p>
          </li>
        );
      })}
    </ol>
  );
}
