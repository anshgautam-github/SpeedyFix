import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, InlineAlert } from '../ui';
import { SITE, hasContact } from '../../landing/config';
import { ContactList } from '../../landing/components/PartnerCTA';

const FAQ = [
  ['How do I book a pickup?', 'Open Book a Pickup, choose your vehicle and service, enter the pickup address and time, pick a service center, then review and confirm.'],
  ['What is a handover code?', 'A six-digit one-time code that confirms your vehicle is changing hands, either to the pickup driver or back to you on delivery. Only enter it when the driver is with you.'],
  ['Can I cancel a booking?', 'You can cancel before the pickup has started. After that, the booking cannot be cancelled from the portal. Contact support instead.'],
  ['Why does tracking show a status, not a map?', 'Tracking shows the last known status of your booking. Live vehicle location is not part of this portal.'],
  ['How do I arrange delivery?', 'When service is completed, a Schedule delivery action appears on the booking. Choose a date, time and address.'],
];

export default function HelpPage() {
  const [params] = useSearchParams();
  const ref = params.get('booking');
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {ref && <InlineAlert tone="blue">You are asking about booking <strong>{ref}</strong>. Quote this reference when you contact support.</InlineAlert>}
      <Card>
        <CardHeader title="Contact support" />
        <div className="px-5 py-5">
          {hasContact() ? <ContactList /> : <p className="text-sm text-slate-400">Support contact details have not been set up yet. Add them in <code className="rounded bg-white/10 px-1">src/landing/config.js</code>.</p>}
          <p className="mt-3 text-xs text-slate-400">{SITE.name}</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="Common questions" />
        <div className="divide-y divide-white/10">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white">{q}<span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-sm text-slate-300">{a}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
