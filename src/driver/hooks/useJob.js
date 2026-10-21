import { driverServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { groupOf } from '../domain/jobs';

/** Loads one job from the server and keeps it fresh while it is open. The UI always shows server-confirmed state. */
export function useJob(jobId) {
  const q = useAsync(() => driverServices.jobs.get(jobId), [jobId]);
  const open = q.data && ['offers', 'assigned', 'in_progress'].includes(groupOf(q.data.phase));
  usePolling(() => q.reload(true), 10000, Boolean(open));
  const apply = (updated) => (updated ? q.setData(updated) : q.reload(true));
  return { job: q.data, error: q.error, loading: q.loading, reload: q.reload, apply };
}
