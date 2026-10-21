import { Check, MapPin } from 'lucide-react';
import { SceneShell, SceneText, TextLayers, Panel, PanelLayers, Field } from './ui';
import { makeQuery, typeInto, sceneOut } from './anim';
import { gsap } from '../../lib/gsap';

export default function BookingScene({ staticMode }) {
  return (
    <SceneShell id="booking" staticMode={staticMode} label="Step 1: the customer books a pickup">
      <TextLayers staticMode={staticMode}>
        <SceneText part="text" title="A pickup is booked in a few taps.">
          Your front desk enters six details from a phone. That is the whole request. Speedy Fix takes it from there.
        </SceneText>
      </TextLayers>
      <PanelLayers staticMode={staticMode}>
        <Panel part="panel">
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">New booking</p>
            <div className="flex rounded-full bg-white/5 p-1 text-xs" aria-hidden="true">
              <span className="rounded-full bg-volt px-3 py-1 text-white">Pickup</span>
              <span className="px-3 py-1 text-silver-dim">Drop</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Field label="Vehicle number" text="TN 10 BX 2046" />
            <Field label="Customer name" text="Priya Raman" />
            <Field label="Phone" text="+91 90000 00000" />
            <Field
              label="Pickup location"
              text="42, Lakeview Avenue"
              icon={<MapPin className="h-3.5 w-3.5 shrink-0 text-volt-glow" aria-hidden="true" />}
            />
            <div className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2">
              <div className="text-xs text-silver-dim">Issue type</div>
              <div className="mt-1 flex gap-1.5 text-xs">
                <span data-chip="issue" className="rounded-full bg-volt px-2.5 py-0.5 text-white">Brakes</span>
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-silver-dim">Service</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2">
              <div className="text-xs text-silver-dim">Priority</div>
              <div className="mt-1 flex gap-1.5 text-xs">
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-silver-dim">Normal</span>
                <span data-chip="priority" className="rounded-full bg-volt px-2.5 py-0.5 text-white">Urgent</span>
              </div>
            </div>
          </div>
          <div
            data-button=""
            className="mt-3 rounded-xl bg-volt py-2.5 text-center text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(31,107,255,.9)]"
            aria-hidden="true"
          >
            Create booking
          </div>
          {!staticMode && (
            <div
              data-confirm=""
              className="absolute inset-0 grid place-items-center rounded-2xl bg-[#0A1226]/95 backdrop-blur-sm"
            >
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok/15 ring-1 ring-ok/50">
                  <Check className="h-6 w-6 text-ok" strokeWidth={3} aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-lg text-white">Pickup booking confirmed</p>
                <p className="mt-1 text-sm text-silver">PK-2041 &middot; A driver is being assigned</p>
              </div>
            </div>
          )}
        </Panel>
      </PanelLayers>
    </SceneShell>
  );
}

/**
 * Timeline for the booking scene (T 0 to 13). This scene is already on screen when the pin starts,
 * so it has no scrubbed fade-in. Its entrance is a one-shot played when the stage scrolls into view.
 */
export function animateBooking({ tl, root, S, T }) {
  const { q, qa } = makeQuery(root);
  const fields = qa('[data-type]');
  const [vehicle, name, phone, place] = fields;

  const confirm = q('[data-confirm]');
  gsap.set(confirm, { autoAlpha: 0 });

  typeInto(tl, vehicle, 0.8, 1.8);
  typeInto(tl, name, 2.8, 1.4);
  typeInto(tl, phone, 4.4, 1.6);
  typeInto(tl, place, 6.2, 1.8);

  const issue = q('[data-chip="issue"]');
  const priority = q('[data-chip="priority"]');
  tl.fromTo(issue, { backgroundColor: 'rgba(255,255,255,.05)', color: '#8C9BB5' }, { backgroundColor: '#1F6BFF', color: '#fff', duration: 0.4 }, 8.2);
  tl.fromTo(priority, { backgroundColor: 'rgba(255,255,255,.05)', color: '#8C9BB5' }, { backgroundColor: '#1F6BFF', color: '#fff', duration: 0.4 }, 8.8);

  const button = q('[data-button]');
  tl.fromTo(button, { scale: 1 }, { scale: 0.95, duration: 0.35, ease: 'power2.in' }, 9.6);
  tl.to(button, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 9.95);
  tl.to(confirm, { autoAlpha: 1, duration: 0.7 }, 10.5);
  tl.to(S, { booked: 1, duration: 0.6, ease: 'none' }, 10.5);

  sceneOut(tl, root, 12.2, 0.8);

  // One-shot entrance when the stage scrolls into view (not tied to scrub).
  const targets = [q('[data-part="text"]'), q('[data-part="panel"]')];
  return gsap.fromTo(targets, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.14, ease: 'power3.out', paused: true });
}
