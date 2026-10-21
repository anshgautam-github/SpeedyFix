import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, DemoNotice, InlineAlert, OtpInput, cx, useToast } from '../../ui';
import { HANDOVER_COPY, pendingHandover } from '../../domain/status';
import { services, demoTools } from '../../services';
import { fmtDateTime } from '../../lib/format';
import { notifyChanged } from '../../lib/events';
import { DriverBlock } from '../booking/parts';

function Summary({ booking }) {
  const rows = ['pickup', 'delivery'].map((t) => ({ t, h: booking.handovers?.[t] }));
  return (
    <Card>
      <CardHeader title="Verified handovers" />
      <ul className="divide-y divide-white/10">
        {rows.map(({ t, h }) => (
          <li key={t} className="flex items-center gap-3 px-5 py-3.5">
            {h?.status === 'verified' ? <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" /> : <KeyRound className="h-5 w-5 text-slate-400" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">{HANDOVER_COPY[t].short}</p>
              <p className="text-xs text-slate-400">{h?.status === 'verified' ? `Verified ${fmtDateTime(h.verifiedAt)}` : booking.status === 'cancelled' ? 'Not needed' : 'Not needed yet. You will be asked to verify when the driver arrives.'}</p>
            </div>
            {h?.status === 'verified' && <Badge tone="green">Verified</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function HandoverPanel({ booking, onChanged }) {
  const type = pendingHandover(booking);
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoCode, setDemoCode] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { setCode(''); setError(''); setDemoCode(null); }, [booking.id, type]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (!type) return booking.status === 'cancelled' ? null : <Summary booking={booking} />;

  const h = booking.handovers[type];
  const driver = type === 'delivery' ? booking.deliveryDriver : booking.driver;
  const blocked = h.status === 'locked' || h.status === 'expired' || h.status === 'waiting';
  const wait = h.canResendAt ? Math.max(0, Math.ceil((new Date(h.canResendAt).getTime() - now) / 1000)) : 0;

  const verify = async (value = code) => {
    if (value.length !== 6) { setError('Enter all 6 digits.'); return; }
    setBusy(true); setError('');
    try {
      const updated = await services.handover.verify(booking.id, type, value);
      notifyChanged();
      toast.push({ title: 'Handover verified', message: HANDOVER_COPY[type].done });
      onChanged?.(updated);
    } catch (e) { setError(e.message); setCode(''); onChanged?.(); } finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError('');
    try { const updated = await services.handover.resend(booking.id, type); setCode(''); onChanged?.(updated); toast.push({ title: 'New code requested' }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Card className="border-amber-400/30 shadow-[0_0_0_1px_rgba(251,191,36,.12),0_20px_60px_-30px_rgba(251,191,36,.35)]">
      <div className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <Badge tone="amber">Action needed</Badge>
          <h2 className="mt-1.5 font-display text-lg leading-snug text-white">{HANDOVER_COPY[type].title}</h2>
        </div>
      </div>
      <div className="space-y-5 px-5 py-5">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-slate-400">Booking</dt><dd className="text-white">{booking.reference}</dd></div>
          <div><dt className="text-xs text-slate-400">Vehicle</dt><dd className="text-white">{booking.vehicle.make} {booking.vehicle.model} &middot; {booking.vehicle.registration}</dd></div>
          <div><dt className="text-xs text-slate-400">Handover</dt><dd className="text-white">{HANDOVER_COPY[type].short}</dd></div>
          <div><dt className="text-xs text-slate-400">Status</dt><dd className={cx(blocked ? 'text-rose-300' : 'text-amber-200')}>{h.status === 'locked' ? 'Locked after too many attempts' : h.status === 'expired' ? 'Code expired' : h.status === 'waiting' ? 'Waiting for a code' : 'Waiting for your code'}</dd></div>
        </dl>
        <DriverBlock driver={driver} title={type === 'delivery' ? 'Delivery driver' : 'Pickup driver'} />

        <div>
          <p className="mb-2 text-sm font-medium text-white" id={`otp-label-${type}`}>Enter the 6-digit verification code</p>
          <OtpInput value={code} onChange={setCode} disabled={busy || blocked} invalid={Boolean(error)} onComplete={verify} label="Verification code" />
          <p className="mt-2 text-xs text-slate-400">Only confirm when the driver is with you and your vehicle is at the handover point. The code is checked on the server.{h.attemptsLeft != null && !blocked ? ` ${h.attemptsLeft} attempts left.` : ''}</p>
        </div>

        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => verify()} loading={busy} disabled={blocked || code.length !== 6}>Verify handover</Button>
          {(blocked || wait === 0) && <Button variant="secondary" onClick={resend} disabled={busy || (!blocked && wait > 0)}>{blocked ? 'Request a new code' : 'Send a new code'}</Button>}
          {!blocked && wait > 0 && <span className="self-center text-xs text-slate-400">New code available in {wait}s</span>}
        </div>

        {demoTools && (
          <DemoNotice>
            <p className="font-semibold">Demo only: no SMS or message is sent.</p>
            <p className="mt-0.5">In production the code comes from your backend. Here you can reveal the simulated code to try the flow.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={async () => setDemoCode(await demoTools.peekOtp(booking.id, type))}>Reveal demo code</Button>
              {demoCode && <><code className="rounded-md bg-black/40 px-2 py-1 font-display tracking-[.25em] text-white" data-testid="demo-code">{demoCode}</code><Button size="sm" variant="ghost" onClick={() => setCode(demoCode)}>Fill in</Button></>}
            </div>
          </DemoNotice>
        )}
      </div>
    </Card>
  );
}
