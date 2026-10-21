import { useState } from 'react';
import { Power } from 'lucide-react';
import { Button, cx, useToast } from '../../portal/ui';
import { useDriver } from '../layout/DriverContext';

const META = {
  online: { label: 'Online', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  offline: { label: 'Offline', dot: 'bg-slate-500', text: 'text-slate-300' },
  on_job: { label: 'On a job', dot: 'bg-amber-400', text: 'text-amber-300' },
};

export function AvailabilityPill({ state }) {
  const m = META[state] || META.offline;
  return <span className={cx('inline-flex items-center gap-1.5 text-sm font-medium', m.text)}><span className={cx('h-2 w-2 rounded-full', m.dot, state === 'online' && 'animate-pulse')} aria-hidden="true" />{m.label}</span>;
}

/** The UI shows only what the server confirmed; it never flips locally. */
export default function AvailabilityControl({ compact = false }) {
  const { availability, loading, error, setOnline } = useDriver();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const state = availability?.state;
  const toggle = async () => {
    setBusy(true);
    try { await setOnline(state !== 'online'); }
    catch (e) { toast.push({ tone: 'rose', title: 'Could not change availability', message: e.message }); }
    finally { setBusy(false); }
  };
  if (error && !availability) return <span className="text-xs text-rose-300">Status unavailable</span>;
  if (!availability) return <span className="text-xs text-slate-400">{loading ? 'Checking status' : ''}</span>;
  const onJob = state === 'on_job';
  if (compact) {
    return (
      <button type="button" onClick={toggle} disabled={busy || onJob} aria-label={`Availability: ${META[state].label}. ${onJob ? 'Complete your job to change.' : 'Press to change.'}`}
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 hover:bg-white/10 disabled:opacity-70">
        <AvailabilityPill state={state} />
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><AvailabilityPill state={state} /><p className="mt-1 text-xs text-slate-400">{onJob ? 'You are on a job. Finish it to change your availability.' : state === 'online' ? 'You can receive job offers. This does not guarantee a job.' : 'You will not receive new offers while offline.'}</p></div>
      {!onJob && <Button variant={state === 'online' ? 'secondary' : 'primary'} onClick={toggle} loading={busy}><Power className="h-4 w-4" aria-hidden="true" />{state === 'online' ? 'Go offline' : 'Go online'}</Button>}
    </div>
  );
}
