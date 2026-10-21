import { Link } from 'react-router-dom';
import { Button, ErrorState, Skeleton } from '../../portal/ui';

/** Shared loading / error handling for pages that show one job. */
export default function JobGate({ job, error, loading, reload, children }) {
  if (loading && !job) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (error) {
    const gone = error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN';
    return <div className="space-y-4"><ErrorState error={error} onRetry={gone ? undefined : reload} title={gone ? 'Job not available' : 'Could not load this job'} /><div className="text-center"><Button as={Link} to="/driver/jobs" variant="secondary">Back to jobs</Button></div></div>;
  }
  return job ? children : null;
}

export function StickyAction({ children }) {
  return <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-20 border-t border-white/10 bg-[#070c19]/95 p-3 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"><div className="mx-auto max-w-5xl">{children}</div></div>;
}
