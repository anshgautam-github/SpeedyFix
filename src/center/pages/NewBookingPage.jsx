import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { centerServices } from '../services';
import { Badge, Button, Card, DemoNotice, EmptyState, ErrorState, InlineAlert, SelectField, Skeleton, TextAreaField, TextField, cx, useToast } from '../../portal/ui';
import { useAsync } from '../../portal/hooks/useAsync';
import { fmtDate, todayISO } from '../../portal/lib/format';
import { isPhone, normalizeReg, isRegistration } from '../../portal/lib/validate';
import { notifyChanged } from '../../portal/lib/events';
import { ISSUE_TYPES } from '../domain/model';
import { useCenter } from '../layout/CenterContext';
import DeliveryRequestForm from '../features/DeliveryRequestForm';

const SLOTS = ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00'];
const DRAFT = 'sf-center-booking-draft';
const blank = { registration: '', make: '', model: '', customerName: '', customerPhone: '', address: '', city: '', postalCode: '', landmark: '', issueType: '', priority: 'normal', date: '', slot: '', instructions: '' };

function Done({ booking, kind }) {
  return (
    <Card className="mx-auto max-w-xl overflow-hidden text-center">
      <div className="bg-gradient-to-b from-emerald-400/10 to-transparent px-6 pb-2 pt-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/40"><CheckCircle2 className="h-8 w-8 text-emerald-300" aria-hidden="true" /></span>
        <h2 className="mt-5 font-display text-2xl text-white">{kind === 'pickup' ? 'Pickup booking submitted' : 'Delivery requested'}</h2>
        <p className="mt-2 text-slate-400">Booking reference</p>
        <p className="mt-1 font-display text-3xl text-white" data-testid="booking-ref">{booking.reference}</p>
        {booking.demo && <div className="mt-3"><Badge tone="amber">Demo</Badge></div>}
      </div>
      <div className="space-y-4 px-6 pb-8 pt-4 text-left">
        <DemoNotice>This is a simulated booking stored in this browser. No real driver has been assigned and no customer has been contacted.</DemoNotice>
        <p className="text-sm text-slate-300">Status: <strong className="text-white">{kind === 'pickup' ? 'Pending driver assignment' : 'Awaiting a delivery driver'}</strong>. You can follow it from the booking page.</p>
        <div className="flex flex-wrap gap-2"><Button as={Link} to={`/service-center/bookings/${booking.id}`}>View booking</Button><Button as={Link} to="/service-center/bookings/new" variant="secondary">Create another</Button></div>
      </div>
    </Card>
  );
}

function PickupForm() {
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(false);
  const [recognized, setRecognized] = useState(null);
  const [draft, setDraft] = useState(() => { try { return JSON.parse(localStorage.getItem(DRAFT)); } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const key = useRef(`bk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  const busyRef = useRef(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'registration' ? e.target.value.toUpperCase() : e.target.value }));

  const lookup = async () => {
    if (!isRegistration(f.registration)) return;
    try {
      const v = await centerServices.bookings.lookupVehicle(f.registration);
      setRecognized(v);
      if (v) setF((x) => ({ ...x, make: x.make || v.make, model: x.model || v.model, customerName: x.customerName || v.customerName, customerPhone: x.customerPhone || v.customerPhone, address: x.address || v.address, city: x.city || v.city, postalCode: x.postalCode || v.postalCode, landmark: x.landmark || v.landmark }));
    } catch { /* lookup is a convenience only */ }
  };
  const validate = () => ({
    registration: !f.registration.trim() ? 'Enter the registration number.' : !isRegistration(f.registration) ? 'Use letters and numbers, for example KA01AB1234.' : '',
    customerName: f.customerName.trim() ? '' : 'Enter the customer name.',
    customerPhone: !f.customerPhone.trim() ? 'Enter the customer phone number.' : !isPhone(f.customerPhone) ? 'Enter a valid phone number.' : '',
    address: f.address.trim() ? '' : 'Enter the pickup address.', city: f.city.trim() ? '' : 'Enter the city.',
    issueType: f.issueType ? '' : 'Choose a service or issue type.',
    date: !f.date ? 'Choose a pickup date.' : f.date < todayISO() ? 'Choose today or a later date.' : '', slot: f.slot ? '' : 'Choose a time slot.',
  });
  const toReview = (e) => { e.preventDefault(); const v = validate(); setErrors(v); if (Object.values(v).some(Boolean)) return; setReview(true); };
  const saveDraft = () => { localStorage.setItem(DRAFT, JSON.stringify(f)); setDraft(f); toast.push({ title: 'Draft saved on this device' }); };
  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { const b = await centerServices.bookings.createPickup(f, key.current); localStorage.removeItem(DRAFT); notifyChanged(); setResult(b); }
    catch (e) { setError(e.message); setReview(e.code === 'DUPLICATE_OPEN_BOOKING' ? false : true); } finally { busyRef.current = false; setBusy(false); }
  };
  if (result) return <Done booking={result} kind="pickup" />;

  if (review) {
    const rows = [['Vehicle', `${normalizeReg(f.registration)}${f.make ? ` · ${f.make} ${f.model}` : ''}`], ['Customer', `${f.customerName} · ${f.customerPhone}`], ['Pickup address', [f.address, f.city, f.postalCode].filter(Boolean).join(', ')], ['Landmark', f.landmark], ['Service or issue', f.issueType], ['Priority', f.priority === 'urgent' ? 'Urgent' : 'Normal'], ['Preferred pickup', `${fmtDate(f.date)}, ${f.slot}`], ['Instructions', f.instructions], ['Drop-off at', 'Your service center']];
    return (
      <Card className="mx-auto max-w-2xl"><div className="border-b border-white/10 px-5 py-4"><h2 className="font-display text-lg text-white">Review and submit</h2></div>
        <div className="space-y-4 px-5 py-5">
          <DemoNotice>Submitting creates a simulated booking in this browser. It is not sent to a real driver.</DemoNotice>
          {error && <InlineAlert>{error}</InlineAlert>}
          <dl className="space-y-1.5 text-sm">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3"><dt className="text-slate-400">{k}</dt><dd className="text-slate-100">{v}</dd></div>)}</dl>
          <div className="flex justify-between gap-2"><Button variant="ghost" onClick={() => setReview(false)} disabled={busy}>Edit</Button><Button onClick={submit} loading={busy}>{busy ? 'Submitting' : 'Submit booking'}</Button></div>
        </div></Card>
    );
  }
  return (
    <Card className="mx-auto max-w-2xl">
      <form onSubmit={toReview} noValidate className="space-y-5 px-5 py-5">
        {draft && <InlineAlert tone="blue">You have a saved draft. <button type="button" className="font-semibold underline" onClick={() => { setF({ ...blank, ...draft }); setDraft(null); }}>Restore it</button></InlineAlert>}
        {error && <InlineAlert>{error}</InlineAlert>}
        <fieldset className="space-y-4"><legend className="font-display text-sm text-white">Vehicle</legend>
          <TextField label="Registration number" value={f.registration} onChange={set('registration')} onBlur={lookup} error={errors.registration} autoCapitalize="characters" placeholder="KA01AB1234" required />
          {recognized && <InlineAlert tone="green">Returning vehicle (last booking {recognized.lastReference}). Customer and address details were filled in from your records. Check them before submitting.</InlineAlert>}
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="Make (optional)" value={f.make} onChange={set('make')} /><TextField label="Model (optional)" value={f.model} onChange={set('model')} /></div>
        </fieldset>
        <fieldset className="space-y-4"><legend className="font-display text-sm text-white">Customer</legend>
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="Customer name" value={f.customerName} onChange={set('customerName')} error={errors.customerName} required /><TextField label="Phone" type="tel" value={f.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone} required /></div>
        </fieldset>
        <fieldset className="space-y-4"><legend className="font-display text-sm text-white">Pickup</legend>
          <TextField label="Pickup address" value={f.address} onChange={set('address')} error={errors.address} required />
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="City" value={f.city} onChange={set('city')} error={errors.city} required /><TextField label="Postal code (optional)" value={f.postalCode} onChange={set('postalCode')} /></div>
          <TextField label="Landmark (optional)" value={f.landmark} onChange={set('landmark')} hint="Helps the driver find the customer. Map coordinates are not collected in this build." />
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="Preferred pickup date" type="date" min={todayISO()} value={f.date} onChange={set('date')} error={errors.date} required />
            <SelectField label="Time slot" value={f.slot} onChange={set('slot')} error={errors.slot} required><option value="">Select a slot</option>{SLOTS.map((s) => <option key={s}>{s}</option>)}</SelectField></div>
        </fieldset>
        <fieldset className="space-y-4"><legend className="font-display text-sm text-white">Job</legend>
          <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Service or issue type" value={f.issueType} onChange={set('issueType')} error={errors.issueType} required><option value="">Select a type</option>{ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}</SelectField>
            <SelectField label="Priority" value={f.priority} onChange={set('priority')}><option value="normal">Normal</option><option value="urgent">Urgent</option></SelectField></div>
          <TextAreaField label="Additional instructions (optional)" value={f.instructions} onChange={set('instructions')} />
        </fieldset>
        <div className="flex flex-wrap justify-between gap-2"><Button variant="ghost" onClick={saveDraft}>Save draft</Button><Button type="submit">Review booking</Button></div>
      </form>
    </Card>
  );
}

function DropForm() {
  const { data, error, loading, reload } = useAsync(() => centerServices.deliveries.list({ stage: 'ready' }), []);
  const [pick, setPick] = useState('');
  const [result, setResult] = useState(null);
  if (result) return <Done booking={result} kind="drop" />;
  if (loading) return <Skeleton className="h-64" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const chosen = data.find((b) => b.id === pick);
  return (
    <Card className="mx-auto max-w-2xl"><div className="space-y-5 px-5 py-5">
      <p className="text-sm text-slate-300">A drop booking returns a vehicle from your center to the customer. Choose a vehicle whose work order is completed. The route starts at your registered address.</p>
      {!data.length ? <EmptyState title="No vehicles are ready for delivery">A vehicle can be returned once its work order has passed the quality check.</EmptyState> : (
        <>
          <SelectField label="Vehicle" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Select a vehicle</option>{data.map((b) => <option key={b.id} value={b.id}>{b.vehicle.registration} · {b.customer.name} · {b.reference}</option>)}</SelectField>
          {chosen && <DeliveryRequestForm key={chosen.id} booking={chosen} defaults={chosen.deliveryDefaults} onDone={setResult} />}
        </>
      )}
    </div></Card>
  );
}

export default function NewBookingPage() {
  const { can } = useCenter();
  const [params] = useSearchParams();
  const [kind, setKind] = useState(params.get('type') === 'drop' ? 'drop' : 'pickup');
  if (!can('bookings.create')) return <ErrorState error={{ message: 'Your role cannot create bookings.' }} title="Not allowed" />;
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Booking type" className="mx-auto flex max-w-2xl gap-1 rounded-full bg-white/5 p-1">
        {[['pickup', 'Pickup booking'], ['drop', 'Drop booking']].map(([k, l]) => <button key={k} role="tab" aria-selected={kind === k} type="button" onClick={() => setKind(k)} className={cx('min-h-[44px] flex-1 rounded-full text-sm font-semibold', kind === k ? 'bg-volt text-white' : 'text-slate-300 hover:text-white')}>{l}</button>)}
      </div>
      {kind === 'pickup' ? <PickupForm /> : <DropForm />}
    </div>
  );
}
