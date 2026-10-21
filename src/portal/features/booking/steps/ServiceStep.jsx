import ChoiceCard from './ChoiceCard';
import { DemoNotice, InlineAlert, TextAreaField } from '../../../ui';

export default function ServiceStep({ draft, setDraft, types, errors }) {
  return (
    <div className="space-y-4">
      {types.source === 'demo' && <DemoNotice>Illustrative service options. No prices are shown and availability is not guaranteed.</DemoNotice>}
      {errors.serviceType && <InlineAlert>{errors.serviceType}</InlineAlert>}
      <fieldset className="space-y-3">
        <legend className="sr-only">Service type</legend>
        {types.items.map((t) => (
          <ChoiceCard key={t.id} name="service" value={t.id} checked={draft.serviceType === t.id} onChange={(id) => setDraft((d) => ({ ...d, serviceType: id }))} title={t.label}>{t.description}</ChoiceCard>
        ))}
      </fieldset>
      <TextAreaField label="Notes for the service center (optional)" value={draft.serviceNotes} onChange={(e) => setDraft((d) => ({ ...d, serviceNotes: e.target.value }))} hint="Describe the problem or what you would like checked." />
    </div>
  );
}
