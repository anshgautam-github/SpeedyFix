import { Check, Circle } from 'lucide-react';
import { Card, CardHeader, DemoNotice, ErrorState, Skeleton, cx } from '../../ui';
import { useAsync } from '../../hooks/useAsync';
import { services } from '../../services';

/** Shows only what the backend returns. Nothing about repairs, diagnostics or technician notes is invented here. */
export default function ServiceProgress({ bookingId, status, refreshKey }) {
  const { data, error, loading, reload } = useAsync(() => services.serviceProgress.get(bookingId), [bookingId, status, refreshKey]);
  return (
    <Card>
      <CardHeader title="Service progress" action={data?.workOrderRef ? <span className="text-xs text-slate-400">Work order {data.workOrderRef}</span> : null} />
      <div className="space-y-4 px-5 py-5">
        {loading && <><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/3" /></>}
        {error && <ErrorState error={error} onRetry={reload} title="Could not load service progress" />}
        {!loading && !error && !data && <p className="text-sm text-slate-400">Service progress appears here once the service center receives your vehicle.</p>}
        {data && (
          <>
            {data.source === 'demo' && <DemoNotice>Demonstration data. In production this panel shows your service center's work order, only if it is connected to the portal.</DemoNotice>}
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-400"><span>Overall</span><span className="tabular-nums text-white">{data.percent}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={data.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Service progress"><div className="h-full rounded-full bg-gradient-to-r from-volt to-volt-glow transition-[width] duration-700" style={{ width: `${data.percent}%` }} /></div>
            </div>
            <ul className="space-y-3">
              {data.items.map((i) => (
                <li key={i.key} className="flex items-start gap-3">
                  <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border', i.state === 'done' ? 'border-volt bg-volt text-white' : i.state === 'active' ? 'border-volt-glow ring-4 ring-volt/20' : 'border-white/15 text-slate-400')}>
                    {i.state === 'done' ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : i.state === 'active' ? <span className="h-1.5 w-1.5 rounded-full bg-volt-glow" /> : <Circle className="h-2 w-2" aria-hidden="true" />}
                  </span>
                  <div className="text-sm"><p className={i.state === 'todo' ? 'text-slate-400' : 'text-slate-100'}>{i.label}<span className="sr-only">{i.state === 'done' ? ', done' : i.state === 'active' ? ', in progress' : ', not started'}</span></p>{i.detail && <p className="text-xs text-slate-400">{i.detail}</p>}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
