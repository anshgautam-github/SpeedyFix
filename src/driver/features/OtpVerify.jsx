import { useEffect, useState } from 'react';
import { Button, DemoNotice, InlineAlert, OtpInput, useToast } from '../../portal/ui';
import { driverServices, driverDemo } from '../services';
import { notifyChanged } from '../../portal/lib/events';

/**
 * Submits the customer's 6-digit code to the server. The browser never knows the correct code: verification,
 * expiry and attempt limits are enforced server-side, and the job only advances on a confirmed success.
 */
export default function OtpVerify({ job, onVerified, onRefresh }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoCode, setDemoCode] = useState(null);
  const locked = job.handover.status === 'locked' || job.handover.status === 'expired';
  useEffect(() => { setCode(''); setError(''); setDemoCode(null); }, [job.id, job.phase]);

  const submit = async (value = code) => {
    if (busy) return;
    if (!/^\d{6}$/.test(value)) { setError('Enter all 6 digits.'); return; }
    setBusy(true); setError('');
    try { const u = await driverServices.handover.verify(job.id, value, { expectedPhase: job.phase }); notifyChanged(); toast.push({ title: 'Handover verified' }); onVerified(u); }
    catch (e) { setError(e.message); setCode(''); onRefresh?.(); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
        <li>Ask the customer for their 6-digit handover code.</li>
        <li>Enter it below. Only continue if the vehicle and customer are in front of you.</li>
        <li>The code is checked on the server. Do not change the job any other way.</li>
      </ol>
      <div>
        <p className="mb-2 text-sm font-medium text-white">Customer's handover code</p>
        <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={busy || locked} invalid={Boolean(error)} label="Handover code" />
        {job.handover.attemptsLeft != null && !locked && <p className="mt-2 text-xs text-slate-400">{job.handover.attemptsLeft} attempts left.</p>}
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      {locked && <InlineAlert tone="amber">This code is {job.handover.status === 'expired' ? 'expired' : 'locked'}. The customer needs to request a new one. Contact operations if you cannot proceed.</InlineAlert>}
      <Button size="lg" className="w-full" onClick={() => submit()} loading={busy} disabled={locked || code.length !== 6}>Verify {job.type === 'pickup' ? 'pickup' : 'delivery'}</Button>
      {driverDemo && (
        <DemoNotice>
          <p className="font-semibold">Demo only.</p>
          <p className="mt-0.5">In production the customer reads the code from their own device. Here you can reveal the simulated code to try the flow.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={async () => setDemoCode(await driverDemo.peekCode(job.id))}>Reveal demo code</Button>
            {demoCode && <><code data-testid="demo-code" className="rounded-md bg-black/40 px-2 py-1 font-display tracking-[.25em] text-white">{demoCode}</code><Button size="sm" variant="ghost" onClick={() => setCode(demoCode)}>Fill in</Button></>}
          </div>
        </DemoNotice>
      )}
    </div>
  );
}
