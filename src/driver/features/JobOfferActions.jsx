import { useState } from 'react';
import { Button, ConfirmDialog, SelectField, useToast } from '../../portal/ui';
import { driverServices } from '../services';
import { notifyChanged } from '../../portal/lib/events';
import { DECLINE_REASONS } from '../domain/jobs';
import PrimaryAction from './PrimaryAction';

/** Accept and Decline for a new offer. Decline asks for a reason and only updates after the server confirms. */
export default function JobOfferActions({ job, onChanged, size = 'md' }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const decline = async () => {
    if (!reason) { setError('Choose a reason.'); return; }
    setBusy(true); setError('');
    try { const u = await driverServices.jobs.transition(job.id, 'decline', { expectedPhase: job.phase, payload: { reason } }); notifyChanged(); toast.push({ title: 'Offer declined' }); setOpen(false); onChanged?.(u); }
    catch (e) { setError(e.message); onChanged?.(); } finally { setBusy(false); }
  };
  return (
    <div className="flex gap-2">
      <PrimaryAction job={job} onChanged={onChanged} size={size} className="flex-1" />
      <Button variant="secondary" size={size} onClick={() => { setReason(''); setError(''); setOpen(true); }}>Decline</Button>
      <ConfirmDialog open={open} danger loading={busy} error={error} title="Decline this job?" confirmLabel="Decline job" cancelLabel="Keep offer" onConfirm={decline} onClose={() => setOpen(false)}
        body={<div className="space-y-3"><p>Declining sends this offer back to operations. You cannot undo it.</p>
          <SelectField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required><option value="">Select a reason</option>{DECLINE_REASONS.map((r) => <option key={r}>{r}</option>)}</SelectField></div>} />
    </div>
  );
}
