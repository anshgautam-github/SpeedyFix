import { useState } from 'react';
import { Badge, Button, InlineAlert, Modal, TextAreaField, useToast, cx } from '../../portal/ui';
import { adminServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { notifyChanged } from '../../portal/lib/events';

/**
 * Pick a driver for a job. Eligibility (approved, active, online, under the job limit) is decided by the server;
 * ineligible drivers are shown with the reason and cannot be chosen. No distances are shown because no mapping
 * integration exists in this build.
 */
export default function AssignModal({ job, open, onClose, onDone }) {
  const toast = useToast();
  const { data, error, loading } = useAsync(() => (open ? adminServices.dispatch.eligibleDrivers(job.jobId) : Promise.resolve([])), [open, job?.jobId]);
  const [pick, setPick] = useState('');
  const [mode, setMode] = useState('assign');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const reassign = Boolean(job?.assignee);
  const go = async () => {
    if (!pick) { setErr('Choose a driver.'); return; }
    if (reassign && !reason.trim()) { setErr('A reason is required to reassign a job.'); return; }
    setBusy(true); setErr('');
    try {
      if (mode === 'offer' && !reassign) await adminServices.dispatch.offer(job.jobId, pick);
      else await adminServices.dispatch.assign(job.jobId, pick, { reason, expectedDriverId: job.assignee?.id || null });
      notifyChanged(); toast.push({ title: mode === 'offer' && !reassign ? 'Offer sent to the driver' : reassign ? 'Job reassigned' : 'Driver assigned', message: job.booking.reference }); onDone(); onClose();
    } catch (e) { setErr(e.message); if (e.code === 'STALE') onDone(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={reassign ? 'Reassign job' : 'Assign a driver'} size="lg" footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={go} loading={busy} disabled={!pick}>{reassign ? 'Reassign' : mode === 'offer' ? 'Send offer' : 'Assign'}</Button></>}>
      {job && (
        <div className="space-y-4">
          <p className="text-sm text-slate-300"><strong className="text-white">{job.booking.reference}</strong> · {job.type === 'pickup' ? 'Pickup' : 'Delivery'} · {job.pickupAddress} → {job.destination}</p>
          {reassign && <InlineAlert tone="amber">Currently assigned to {job.assignee.name}. Reassigning clears their progress on this job and issues the new driver a fresh handover.</InlineAlert>}
          {error && <InlineAlert>{error.message}</InlineAlert>}{err && <InlineAlert>{err}</InlineAlert>}
          {!reassign && <div className="flex gap-1 rounded-full bg-white/5 p-1" role="tablist" aria-label="Assignment mode">{[['assign', 'Assign directly'], ['offer', 'Send an offer']].map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} type="button" onClick={() => setMode(k)} className={cx('min-h-[44px] flex-1 rounded-full text-sm font-semibold', mode === k ? 'bg-volt text-white' : 'text-slate-300')}>{l}</button>)}</div>}
          {loading ? <p className="text-sm text-slate-400">Loading drivers</p> : (
            <fieldset><legend className="sr-only">Drivers</legend><ul className="max-h-72 space-y-2 overflow-y-auto">{(data || []).map((d) => (
              <li key={d.id}><label className={cx('flex items-start gap-3 rounded-xl border p-3 text-sm', !d.eligible ? 'cursor-not-allowed border-white/10 opacity-60' : pick === d.id ? 'cursor-pointer border-volt-glow bg-volt/10' : 'cursor-pointer border-white/10 hover:bg-white/5')}>
                <input type="radio" name="driver" disabled={!d.eligible || d.id === job.assignee?.id} checked={pick === d.id} onChange={() => setPick(d.id)} className="mt-1 h-4 w-4 accent-[#1F6BFF]" />
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-white">{d.name}<Badge tone={d.availability === 'online' ? 'green' : d.availability === 'on_job' ? 'amber' : 'slate'}>{d.availability === 'on_job' ? 'On a job' : d.availability}</Badge>{d.id === job.assignee?.id && <Badge tone="blue">Current</Badge>}</span>
                  <span className="text-xs text-slate-400">{d.activeJobs} active · {d.completedJobs} completed{d.phone ? ` · ${d.phone}` : ''}</span>{!d.eligible && <span className="block text-xs text-rose-300">{d.reasons.join('. ')}</span>}</span></label></li>))}
              {!(data || []).length && <li className="text-sm text-slate-400">There are no drivers.</li>}</ul></fieldset>
          )}
          {reassign && <TextAreaField label="Reason for reassigning" value={reason} onChange={(e) => setReason(e.target.value)} required />}
        </div>
      )}
    </Modal>
  );
}
