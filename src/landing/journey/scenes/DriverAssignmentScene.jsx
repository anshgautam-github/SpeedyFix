import { Phone } from 'lucide-react';
import { SceneShell, SceneText, TextLayers, Panel, PanelLayers, StatusRow, Avatar } from './ui';
import { makeQuery, sceneIn, sceneOut, activateRow } from './anim';

export default function DriverAssignmentScene({ staticMode }) {
  return (
    <SceneShell id="assign" staticMode={staticMode} label="Step 2: Speedy Fix assigns a driver and the driver collects the car">
      <TextLayers staticMode={staticMode}>
        <SceneText title="Speedy Fix assigns the driver.">
          Operations picks one. You see the name and number, and can call in one tap. The driver heads to your customer.
        </SceneText>
      </TextLayers>
      <PanelLayers staticMode={staticMode}>
        <Panel>
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">Driver assignment</p>
            <div className="relative h-5 min-w-[9.5rem] text-right text-xs">
              <span data-s1="" className="absolute right-0 top-0 flex items-center gap-1.5 text-silver" style={{ opacity: 0, visibility: 'hidden' }}>
                <span className="sf-ping relative inline-block h-2 w-2 rounded-full bg-volt-glow" />
                Finding a driver
              </span>
              <span data-s2="" className="absolute right-0 top-0 text-ok">Driver assigned</span>
            </div>
          </div>

          <div data-card="" className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-3">
            <Avatar initials="KS" className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white">Karthik S.</p>
              <p className="flex items-center gap-1.5 text-xs text-silver">
                <Phone className="h-3.5 w-3.5 text-volt-glow" aria-hidden="true" />
                +91 90000 11111
              </p>
            </div>
            <div className="text-right">
              <p data-eta="" className="font-display text-lg leading-none text-white">Arrived</p>
              <p className="mt-1 text-xs text-silver-dim">to pickup point</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-silver">
            Pickup: <span className="text-white">42, Lakeview Avenue</span>
          </p>
          <ul className="mt-2" aria-label="Pickup progress">
            <StatusRow label="Driver assigned" />
            <StatusRow label="Driver accepted" />
            <StatusRow label="On the way" />
            <StatusRow label="Arrived at customer" />
            <StatusRow label="Vehicle collected, customer confirms with OTP" />
          </ul>
        </Panel>
      </PanelLayers>
    </SceneShell>
  );
}

/** T 13 to 30. The driver marker in the world is driven by S.driverDist on the same clock. */
export function animateAssign({ tl, root, S, sampler }) {
  const { q, qa } = makeQuery(root);
  const rows = qa('[data-row]');
  const s1 = q('[data-s1]');
  const s2 = q('[data-s2]');
  const eta = q('[data-eta]');
  const card = q('[data-card]');

  sceneIn(tl, root, 13.4);

  // Finding -> assigned
  tl.fromTo(s1, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4 }, 16);
  tl.fromTo(s2, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 16.2);
  tl.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out' }, 15.6);

  // ETA counts down while the driver drives in
  const p = { n: 6 };
  eta.textContent = '6 min';
  tl.fromTo(
    p,
    { n: 6 },
    {
      n: 0,
      duration: 8.6,
      ease: 'none',
      onUpdate() {
        eta.textContent = p.n > 0.4 ? `${Math.ceil(p.n)} min` : 'Arrived';
      },
    },
    16
  );

  activateRow(tl, rows[0], 15.8);
  activateRow(tl, rows[1], 17.2);
  activateRow(tl, rows[2], 18.4);
  activateRow(tl, rows[3], 24.5);
  activateRow(tl, rows[4], 26);

  // Driver marker travels along the road to the car, then boards it.
  tl.to(S, { driverOn: 1, duration: 1, ease: 'power1.out' }, 14.4);
  tl.fromTo(S, { driverDist: sampler.lengthAtX(-140) }, { driverDist: sampler.lengthAtX(690), duration: 9.2, ease: 'power1.inOut', immediateRender: false }, 15.4);
  tl.to(S, { driverOn: 0, duration: 0.8, ease: 'power1.in' }, 24.8);
  tl.to(S, { lights: 1, duration: 1.4, ease: 'power2.out' }, 25.4);

  sceneOut(tl, root, 29, 1);
}
