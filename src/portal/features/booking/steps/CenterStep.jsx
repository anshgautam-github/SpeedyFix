import { Clock } from 'lucide-react';
import ChoiceCard from './ChoiceCard';
import { services } from '../../../services';
import { useAsync } from '../../../hooks/useAsync';
import { Badge, DemoBadge, DemoNotice, EmptyState, ErrorState, InlineAlert, Skeleton } from '../../../ui';

export default function CenterStep({ draft, setDraft, errors, onLoaded }) {
  const { data, error, loading, reload } = useAsync(async () => { const c = await services.centers.list(); onLoaded?.(c); return c; }, []);
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load service centers" />;
  if (!data.length) return <EmptyState title="No service centers available">There are no service centers to choose from right now. Please try again later or contact support.</EmptyState>;
  return (
    <div className="space-y-4">
      <DemoNotice>These are demo entries, not real, verified or available service centers. A demo booking is never sent to any of them.</DemoNotice>
      {errors.centerId && <InlineAlert>{errors.centerId}</InlineAlert>}
      <fieldset className="space-y-3">
        <legend className="sr-only">Service center</legend>
        {data.map((c) => (
          <ChoiceCard key={c.id} name="center" value={c.id} checked={draft.centerId === c.id} onChange={(id) => setDraft((d) => ({ ...d, centerId: id }))} title={c.name} badge={c.demo ? <DemoBadge /> : null}>
            <span className="block">{c.address}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">{c.services.map((s) => <Badge key={s}>{s}</Badge>)}</span>
            {c.hours && <span className="mt-2 flex items-center gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{c.hours}</span>}
          </ChoiceCard>
        ))}
      </fieldset>
    </div>
  );
}
