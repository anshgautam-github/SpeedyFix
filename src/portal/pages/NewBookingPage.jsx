import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { services } from '../services';
import { useAsync } from '../hooks/useAsync';
import { Button, Card, DemoBadge, DemoNotice, ErrorState, InlineAlert, Skeleton, cx } from '../ui';
import { hasErrors, normalizeReg, validatePickup, validateVehicle } from '../lib/validate';
import { todayISO } from '../lib/format';
import { notifyChanged } from '../lib/events';
import { emptyVehicle } from '../features/vehicle/VehicleFields';
import VehicleStep from '../features/booking/steps/VehicleStep';
import ServiceStep from '../features/booking/steps/ServiceStep';
import PickupStep from '../features/booking/steps/PickupStep';
import CenterStep from '../features/booking/steps/CenterStep';
import ReviewStep from '../features/booking/steps/ReviewStep';

const STEPS = [
  { key: 'vehicle', label: 'Vehicle', title: 'Which vehicle should we pick up?' },
  { key: 'service', label: 'Service', title: 'What does it need?' },
  { key: 'pickup', label: 'Pickup', title: 'Where and when should the driver arrive?' },
  { key: 'center', label: 'Center', title: 'Choose a service center' },
  { key: 'review', label: 'Review', title: 'Review and confirm' },
];

function Progress({ current, onJump }) {
  return (
    <nav aria-label="Booking steps">
      <p className="mb-3 text-sm text-slate-400 sm:hidden">Step {current + 1} of {STEPS.length}: <span className="text-white">{STEPS[current].label}</span></p>
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} aria-current={active ? 'step' : undefined} className={cx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
              <button type="button" disabled={!done} onClick={() => onJump(i)} aria-label={`${s.label}${done ? ', completed. Go back to edit' : active ? ', current step' : ''}`}
                className="group flex items-center gap-2.5 disabled:cursor-default">
                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors', done && 'border-volt bg-volt text-white', active && 'border-volt-glow bg-[#0f2a66] text-white ring-4 ring-volt/25', !done && !active && 'border-white/15 text-slate-400')}>
                  {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className={cx('hidden text-sm sm:block', active ? 'font-semibold text-white' : done ? 'text-slate-200' : 'text-slate-400')}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span aria-hidden="true" className={cx('mx-2 h-0.5 flex-1 rounded sm:mx-3', done ? 'bg-volt' : 'bg-white/10')} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const newDraft = (phone = '') => ({
  vehicleMode: 'saved', vehicleId: '', newVehicle: { ...emptyVehicle },
  serviceType: '', serviceNotes: '',
  pickup: { address: '', city: '', postalCode: '', landmark: '', phone, date: '', slot: '', instructions: '' },
  centerId: '',
});

function Confirmation({ booking }) {
  return (
    <Card className="mx-auto max-w-2xl overflow-hidden text-center">
      <div className="bg-gradient-to-b from-emerald-400/10 to-transparent px-6 pb-2 pt-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/40"><CheckCircle2 className="h-8 w-8 text-emerald-300" aria-hidden="true" /></span>
        <h2 className="mt-5 font-display text-2xl text-white">{booking.demo ? 'Demo booking created' : 'Booking confirmed'}</h2>
        <p className="mt-2 text-slate-400">Booking reference</p>
        <p className="mt-1 font-display text-3xl tracking-wide text-white" data-testid="booking-ref">{booking.reference}</p>
        {booking.demo && <div className="mt-3"><DemoBadge /></div>}
      </div>
      <div className="space-y-5 px-6 pb-8 pt-4 text-left">
        {booking.demo && <DemoNotice>This is a simulated booking stored in this browser. It was not sent to a real service center or driver.</DemoNotice>}
        <div>
          <h3 className="font-display text-sm text-white">What happens next</h3>
          <ol className="mt-3 space-y-3 text-sm text-slate-300">
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-volt/20 text-xs text-volt-glow">1</span>A driver is assigned to your pickup. Their name and number appear on the booking once assigned.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-volt/20 text-xs text-volt-glow">2</span>When the driver arrives, you verify the handover with a one-time code.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-volt/20 text-xs text-volt-glow">3</span>Follow your vehicle and the service progress from the tracking page.</li>
          </ol>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={`/customer/bookings/${booking.id}`}>View booking</Button>
          <Button as={Link} to={`/customer/tracking/${booking.id}`} variant="secondary">Track vehicle</Button>
          <Button as={Link} to="/customer/dashboard" variant="ghost">Back to overview</Button>
        </div>
      </div>
    </Card>
  );
}

export default function NewBookingPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => newDraft(user?.phone || ''));
  const [errors, setErrors] = useState({});
  const [centers, setCenters] = useState([]);
  const [prefillNote, setPrefillNote] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const idemKey = useRef(`bk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  const createdVehicleId = useRef(null);
  const heading = useRef(null);

  const vehicles = useAsync(() => services.vehicles.list(), []);
  const types = useAsync(() => services.bookings.serviceTypes(), []);

  // Prefill once vehicles are known: ?vehicle=ID, or "book again" with ?from=BOOKING_ID.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!vehicles.data || !types.data || prefilled.current) return;
    prefilled.current = true;
    const pick = params.get('vehicle');
    const from = params.get('from');
    setDraft((d) => ({ ...d, vehicleMode: vehicles.data.length ? 'saved' : 'new', vehicleId: pick && vehicles.data.some((v) => v.id === pick) ? pick : vehicles.data.length === 1 ? vehicles.data[0].id : '' }));
    if (from) {
      services.bookings.get(from).then((b) => {
        const st = types.data.items.find((t) => t.label === b.serviceType);
        setDraft((d) => ({
          ...d,
          vehicleMode: vehicles.data.some((v) => v.id === b.vehicleId) ? 'saved' : d.vehicleMode,
          vehicleId: vehicles.data.some((v) => v.id === b.vehicleId) ? b.vehicleId : d.vehicleId,
          serviceType: st?.id || '', serviceNotes: b.serviceNotes || '', centerId: b.centerId,
          pickup: { ...d.pickup, ...b.pickup, date: '', slot: '' },
        }));
        setPrefillNote(`Details copied from ${b.reference}. Choose a new pickup date and time.`);
      }).catch(() => {});
    }
  }, [vehicles.data, types.data, params]);

  useEffect(() => { heading.current?.focus(); }, [step, result]);

  const saved = vehicles.data || [];
  const validate = (i) => {
    if (i === 0) {
      if (draft.vehicleMode === 'saved') return { vehicleId: draft.vehicleId ? '' : 'Choose a vehicle or add a new one.' };
      const nv = validateVehicle(draft.newVehicle);
      if (!nv.registration && saved.some((v) => normalizeReg(v.registration) === normalizeReg(draft.newVehicle.registration))) nv.registration = 'You already saved a vehicle with this registration. Choose it from the list instead.';
      return { newVehicle: nv, _bad: hasErrors(nv) };
    }
    if (i === 1) return { serviceType: draft.serviceType ? '' : 'Choose a service type.' };
    if (i === 2) return validatePickup(draft.pickup, todayISO());
    if (i === 3) return { centerId: draft.centerId ? '' : 'Choose a service center.' };
    return {};
  };
  const bad = (e) => (e._bad !== undefined ? e._bad : hasErrors(e));

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (bad(e)) return;
    setStep((s) => s + 1);
  };
  const jump = (i) => { setErrors({}); setStep(i); };

  const summary = useMemo(() => {
    const v = draft.vehicleMode === 'saved' ? saved.find((x) => x.id === draft.vehicleId) || {} : { ...draft.newVehicle, registration: normalizeReg(draft.newVehicle.registration), isNew: true };
    const t = types.data?.items.find((x) => x.id === draft.serviceType);
    const c = centers.find((x) => x.id === draft.centerId) || { name: draft.centerId, address: '' };
    return { vehicle: v, service: { label: t?.label || '', notes: draft.serviceNotes }, pickup: draft.pickup, center: c };
  }, [draft, saved, types.data, centers]);

  const confirm = async () => {
    if (submittingRef.current) return; // blocks double clicks and repeated Enter presses
    submittingRef.current = true;
    setSubmitting(true); setSubmitError('');
    try {
      let vehicleId = draft.vehicleId;
      if (draft.vehicleMode === 'new') {
        if (!createdVehicleId.current) createdVehicleId.current = (await services.vehicles.create(draft.newVehicle)).id;
        vehicleId = createdVehicleId.current;
      }
      // The idempotency key is reused on retry, so a repeated submit can never create a second booking.
      const booking = await services.bookings.create({ vehicleId, serviceType: draft.serviceType, serviceNotes: draft.serviceNotes, pickup: draft.pickup, centerId: draft.centerId }, idemKey.current);
      notifyChanged();
      setResult(booking);
    } catch (e) { setSubmitError(e.message); } finally { submittingRef.current = false; setSubmitting(false); }
  };

  if (result) return <Confirmation booking={result} />;

  const loadError = vehicles.error || types.error;
  const loading = (vehicles.loading && !vehicles.data) || (types.loading && !types.data);
  const cur = STEPS[step];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Progress current={step} onJump={jump} />
      {prefillNote && <InlineAlert tone="blue">{prefillNote}</InlineAlert>}
      {loadError && <ErrorState error={loadError} onRetry={() => { vehicles.reload(); types.reload(); }} title="Could not start a booking" />}
      {loading && <Skeleton className="h-96" />}
      {!loading && !loadError && (
        <Card>
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 ref={heading} tabIndex={-1} className="font-display text-xl text-white outline-none">{cur.title}</h2>
          </div>
          <div className="px-5 py-5 sm:px-6">
            {step === 0 && <VehicleStep draft={draft} setDraft={setDraft} vehicles={saved} errors={errors} />}
            {step === 1 && <ServiceStep draft={draft} setDraft={setDraft} types={types.data} errors={errors} />}
            {step === 2 && <PickupStep draft={draft} setDraft={setDraft} slots={types.data.slots} saved={user?.addresses || []} errors={errors} />}
            {step === 3 && <CenterStep draft={draft} setDraft={setDraft} errors={errors} onLoaded={setCenters} />}
            {step === 4 && <ReviewStep summary={summary} goTo={jump} error={submitError} />}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
            <Button variant="ghost" onClick={() => jump(step - 1)} disabled={step === 0 || submitting}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</Button>
            {step < STEPS.length - 1
              ? <Button onClick={next}>Continue <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              : <Button onClick={confirm} loading={submitting}>{submitting ? 'Confirming' : 'Confirm booking'}</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}
