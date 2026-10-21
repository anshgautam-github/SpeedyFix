import { Check, MapPin, Wrench } from 'lucide-react';
import { SceneShell, SceneText, TextLayers, Panel, PanelLayers, StatusRow, OtpRow } from './ui';
import { makeQuery, sceneIn, partIn, partOut, activateRow, otpSequence } from './anim';
import { gsap } from '../../lib/gsap';

const HANDOVERS = [
  ['Pickup from customer', 'Pickup booking'],
  ['Handover at your center', 'Pickup booking'],
  ['Pickup from your center', 'Drop booking'],
  ['Delivery to customer', 'Drop booking'],
];

export default function ReturnJourneyScene({ staticMode }) {
  const layer = !staticMode;
  return (
    <SceneShell id="return" staticMode={staticMode} label="Steps 6 and 7: the car returns to the customer with a verified handover">
      <TextLayers staticMode={staticMode}>
        <SceneText part="go-text" layer={layer} title="Then it goes home.">
          Raise a drop booking. A driver collects the car from your team and returns it, and the customer confirms with a code.
        </SceneText>
        <SceneText part="done-text" layer={layer} title="Delivered, verified, on record.">
          Every handover shows on the booking as verified, with its time. Your front desk reads the answer off the screen.
        </SceneText>
      </TextLayers>
      <PanelLayers staticMode={staticMode}>
        <Panel part="go-panel" layer={layer}>
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">Drop booking DP-2041</p>
            <span className="rounded-full bg-volt/20 px-2.5 py-0.5 text-xs font-medium text-volt-glow">Drop</span>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[.04] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-white"><Wrench className="h-3.5 w-3.5 text-volt-glow" aria-hidden="true" />Service center</span>
              <span className="flex items-center gap-1.5 text-white"><MapPin className="h-3.5 w-3.5 text-volt-glow" aria-hidden="true" />42, Lakeview Avenue</span>
            </div>
            <div className="relative mt-2.5 h-1.5 rounded-full bg-white/10">
              <div data-leg="" className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-volt to-volt-glow" />
              <span data-leg-dot="" className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-volt bg-white" style={{ left: '100%' }} />
            </div>
          </div>
          <ul className="mt-2.5" aria-label="Delivery progress">
            <StatusRow label="Driver assigned" />
            <StatusRow label="Collected from your team" />
            <StatusRow label="In transit to the customer" />
          </ul>
          <div className="mt-2">
            <OtpRow okText="Delivered, verified with OTP" />
          </div>
        </Panel>

        <Panel part="done-panel" layer={layer}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0" aria-hidden="true">
              <circle data-ring="" cx="28" cy="28" r="25" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 28 28)" />
              <path data-tick="" d="M 17 29 L 25 37 L 40 21" fill="none" stroke="#34D399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="font-display text-xl text-white">Journey complete</p>
              <p className="text-xs text-silver">Four handovers, all verified</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5" aria-label="Verified handovers">
            {HANDOVERS.map(([label, type]) => (
              <li key={label} data-handover="" className="flex items-center gap-2 rounded-lg bg-white/[.04] px-2.5 py-1.5 text-xs text-white">
                <Check className="h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={3} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <span className="text-xs text-silver-dim">{type}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </PanelLayers>
    </SceneShell>
  );
}

/** T 78 to 107. The final confirmation lands at T 101 and holds while the pin is still active. */
export function animateReturn({ tl, root, S }) {
  const { q, qa } = makeQuery(root);
  const rows = qa('[data-row]');
  const goText = q('[data-part="go-text"]');
  const goPanel = q('[data-part="go-panel"]');
  const doneText = q('[data-part="done-text"]');
  const donePanel = q('[data-part="done-panel"]');
  const leg = q('[data-leg]');
  const dot = q('[data-leg-dot]');
  const ring = q('[data-ring]');
  const tick = q('[data-tick]');
  const handovers = qa('[data-handover]');

  sceneIn(tl, root, 78.4);

  activateRow(tl, rows[0], 79.6);
  activateRow(tl, rows[1], 80.8);
  activateRow(tl, rows[2], 83);

  const otpEnd = otpSequence(tl, goPanel, 96.4, { digitGap: 0.4, verifyAt: 99 });

  partOut(tl, [goText, goPanel], 100.6, 0.9);
  partIn(tl, [doneText, donePanel], 101.6, 1.1);

  gsap.set(ring, { strokeDasharray: 157, strokeDashoffset: 157 });
  gsap.set(tick, { strokeDasharray: 40, strokeDashoffset: 40 });
  tl.to(ring, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out' }, 102);
  tl.to(tick, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, 103);
  tl.fromTo(handovers, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.35, ease: 'power2.out' }, 102.6);

  const tickFn = () => {
    const f = Math.min(1, Math.max(0, (S.dist - S.distBay) / (S.distDrop - S.distBay)));
    leg.style.transform = `scaleX(${f})`;
    dot.style.left = `${f * 100}%`;
  };
  tickFn();
  return { tick: tickFn, otpEnd };
}
