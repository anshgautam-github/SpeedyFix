import { Button, DemoNotice, InlineAlert } from '../../../ui';
import { fmtDate } from '../../../lib/format';

function Block({ title, onEdit, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[.02] p-4">
      <div className="flex items-center justify-between"><h3 className="font-display text-sm text-white">{title}</h3><Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button></div>
      <dl className="mt-2 space-y-1 text-sm">{children}</dl>
    </section>
  );
}
const Row = ({ k, v }) => v ? <div className="grid grid-cols-[7.5rem_1fr] gap-3"><dt className="text-slate-400">{k}</dt><dd className="text-slate-100">{v}</dd></div> : null;

export default function ReviewStep({ summary, goTo, error }) {
  const { vehicle, service, pickup, center } = summary;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">Check everything before you confirm. You can edit any section.</p>
      <DemoNotice>Demo booking: confirming creates a simulated booking in this browser. It is not sent to a real service center or driver.</DemoNotice>
      {error && <InlineAlert>{error}</InlineAlert>}
      <Block title="Vehicle" onEdit={() => goTo(0)}><Row k="Vehicle" v={`${vehicle.make} ${vehicle.model} (${vehicle.year})`} /><Row k="Registration" v={vehicle.registration} /><Row k="Type" v={vehicle.type} />{vehicle.isNew && <Row k="" v="Will be saved to My Vehicles" />}</Block>
      <Block title="Service" onEdit={() => goTo(1)}><Row k="Service" v={service.label} /><Row k="Notes" v={service.notes} /></Block>
      <Block title="Pickup" onEdit={() => goTo(2)}>
        <Row k="Address" v={`${pickup.address}, ${pickup.city} ${pickup.postalCode}`} /><Row k="Landmark" v={pickup.landmark} />
        <Row k="Date and time" v={`${fmtDate(pickup.date)}, ${pickup.slot}`} /><Row k="Contact phone" v={pickup.phone} /><Row k="Instructions" v={pickup.instructions} />
      </Block>
      <Block title="Service center" onEdit={() => goTo(3)}><Row k="Center" v={center.name} /><Row k="Address" v={center.address} /></Block>
    </div>
  );
}
