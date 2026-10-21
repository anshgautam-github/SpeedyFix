import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, useToast } from '../../portal/ui';
import { driverServices } from '../services';
import { notifyChanged } from '../../portal/lib/events';
import { nextStep } from '../domain/jobs';

/**
 * The single next valid step for a job. Actions call the backend and the UI updates from the confirmed response.
 * A repeated tap is ignored while a request is in flight, and every request carries the phase the driver saw so a
 * stale request is rejected by the server instead of overwriting newer state.
 */
export default function PrimaryAction({ job, onChanged, size = 'lg', className = 'w-full' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const step = nextStep(job);
  if (!step) return null;
  if (step.kind === 'page') {
    return <Button as={Link} to={`/driver/handover/${job.id}`} size={size} className={className}>{step.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>;
  }
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await driverServices.jobs.transition(job.id, step.action, { expectedPhase: job.phase });
      notifyChanged();
      onChanged?.(updated);
    } catch (e) {
      toast.push({ tone: 'rose', title: e.code === 'ALREADY_TAKEN' ? 'Job no longer available' : e.code === 'STALE' ? 'Job updated' : 'Could not continue', message: e.message });
      onChanged?.();
    } finally { setBusy(false); }
  };
  return <Button size={size} className={className} onClick={run} loading={busy}>{step.label}</Button>;
}
