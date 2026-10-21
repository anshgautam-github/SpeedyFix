import { Check } from 'lucide-react';
import { CANCELLED, JOURNEY, STAGES, journeyIndex, stageIndex, statusMeta } from '../domain/status';
import { Badge, cx } from './primitives';
import { fmtDateTime } from '../lib/format';

const GROUP_TONE = { upcoming: 'slate', active: 'blue', completed: 'green', cancelled: 'rose' };

export function StatusBadge({ status }) {
  const m = statusMeta(status);
  return <Badge tone={GROUP_TONE[m.group] || 'slate'}>{m.short}</Badge>;
}

/** Seven-step overview. Vertical on narrow screens, horizontal from md up. */
export function JourneyStrip({ status }) {
  const delivered = status === 'delivered';
  const cur = status === 'cancelled' ? -1 : journeyIndex(status);
  return (
    <ol className="grid gap-0 md:grid-cols-7" aria-label="Service journey">
      {JOURNEY.map((step, i) => {
        const done = delivered || i < cur;
        const active = !delivered && i === cur;
        return (
          <li key={step.label} aria-current={active ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0 md:block md:pb-0 md:text-center">
            {i < JOURNEY.length - 1 && (
              <>
                <span aria-hidden="true" className={cx('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:hidden', done ? 'bg-volt' : 'bg-white/10')} />
                <span aria-hidden="true" className={cx('absolute left-1/2 top-[15px] hidden h-0.5 w-full md:block', done ? 'bg-volt' : 'bg-white/10')} />
              </>
            )}
            <span className={cx('relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors md:mx-auto',
              done && 'border-volt bg-volt text-white', active && 'border-volt-glow bg-[#0f2a66] text-white ring-4 ring-volt/25', !done && !active && 'border-white/15 bg-[#0A1226] text-slate-400')}>
              {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className={cx('pt-1 text-sm leading-snug md:mt-2.5 md:block md:px-1 md:pt-0', active ? 'font-semibold text-white' : done ? 'text-slate-200' : 'text-slate-400')}>
              {step.label}
              <span className="sr-only">{done ? ', completed' : active ? ', current step' : ', not reached yet'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Detailed stage list with the timestamps the backend has recorded. Never shows a time a status did not reach. */
export function StageTimeline({ booking }) {
  const idx = stageIndex(booking.status);
  const cancelled = booking.status === 'cancelled';
  const at = Object.fromEntries((booking.statusHistory || []).map((h) => [h.status, h.at]));
  return (
    <ol aria-label="Booking progress">
      {STAGES.map((s, i) => {
        const done = !cancelled && i < idx || booking.status === 'delivered';
        const active = !cancelled && i === idx && booking.status !== 'delivered';
        const reachedBeforeCancel = cancelled && at[s.key];
        const ok = done || reachedBeforeCancel;
        return (
          <li key={s.key} aria-current={active ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
            {i < STAGES.length - 1 && <span aria-hidden="true" className={cx('absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5', ok ? 'bg-volt/70' : 'bg-white/10')} />}
            <span className={cx('relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border', ok && 'border-volt bg-volt text-white', active && 'border-volt-glow bg-[#0f2a66] ring-4 ring-volt/25', !ok && !active && 'border-white/15 bg-[#0A1226]')}>
              {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : active ? <span className="h-2 w-2 rounded-full bg-volt-glow" /> : null}
            </span>
            <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
              <p className={cx('text-sm', active ? 'font-semibold text-white' : ok ? 'text-slate-200' : 'text-slate-400')}>
                {s.label}
                <span className="sr-only">{ok ? ', completed' : active ? ', current step' : ', not reached yet'}</span>
              </p>
              {at[s.key] ? <p className="text-xs tabular-nums text-slate-400">{fmtDateTime(at[s.key])}</p> : active ? <p className="text-xs text-volt-glow">In progress</p> : null}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="mt-1 flex gap-3 border-t border-white/10 pt-4 text-sm text-rose-200">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500/20 text-rose-200">!</span>
          <div className="flex flex-1 flex-wrap justify-between gap-2"><span>{CANCELLED.label}</span><span className="text-xs text-slate-400">{fmtDateTime(at.cancelled)}</span></div>
        </li>
      )}
    </ol>
  );
}
