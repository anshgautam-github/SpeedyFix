import { ShieldCheck } from 'lucide-react';
import { SceneShell, SceneText, TextLayers, Panel, PanelLayers, StatusRow, OtpRow } from './ui';
import { makeQuery, sceneIn, sceneOut, partIn, partOut, activateRow, otpSequence } from './anim';

const MAP_PATH = 'M 28 68 C 110 68 130 22 214 26 S 330 62 410 30 L 452 24';

export default function TrackingScene({ staticMode }) {
  const layer = !staticMode;
  return (
    <SceneShell id="tracking" staticMode={staticMode} label="Steps 3 and 4: live tracking and OTP verified handover">
      <TextLayers staticMode={staticMode}>
        <SceneText part="track-text" layer={layer} title="Every stage, time‑stamped.">
          Open any booking and the timeline shows who has the vehicle and since when. A job that runs late is flagged.
        </SceneText>
        <SceneText part="otp-text" layer={layer} title="No code, no handover.">
          A six-digit code goes to the customer by SMS. The driver types it in, and the handover is recorded only when it matches.
        </SceneText>
      </TextLayers>
      <PanelLayers staticMode={staticMode}>
        <Panel part="track-panel" layer={layer}>
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">PK-2041 &middot; TN 10 BX 2046</p>
            <span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok">On time</span>
          </div>
          <svg viewBox="0 0 480 90" preserveAspectRatio="xMidYMid slice" className="mt-2.5 h-[88px] w-full rounded-xl border border-white/10 bg-[#070d1c] [@media(max-height:700px)]:hidden" role="img" aria-label="Sample route from the customer to the service center">
            {[22, 45, 68].map((y) => <line key={y} x1="0" x2="480" y1={y} y2={y} stroke="#16264a" strokeWidth="1" />)}
            {[80, 160, 240, 320, 400].map((x) => <line key={x} y1="0" y2="90" x1={x} x2={x} stroke="#16264a" strokeWidth="1" />)}
            <path d={MAP_PATH} fill="none" stroke="#25396b" strokeWidth="5" strokeLinecap="round" />
            <path data-route="" d={MAP_PATH} fill="none" stroke="#5BA2FF" strokeWidth="4" strokeLinecap="round" />
            <circle cx="28" cy="68" r="5" fill="#cfe3ff" />
            <rect x="446" y="18" width="12" height="12" rx="3" fill="#cfe3ff" />
            <g data-minimarker="">
              <circle r="9" fill="#1F6BFF" opacity=".35" />
              <circle r="5" fill="#fff" stroke="#1F6BFF" strokeWidth="2" />
            </g>
          </svg>
          <ul className="mt-2" aria-label="Booking timeline">
            <StatusRow label="Driver assigned" time="10:02" />
            <StatusRow label="On the way" time="10:06" />
            <StatusRow label="Vehicle picked up" time="10:21" />
            <StatusRow label="In transit" time="10:22" />
            <StatusRow label="Reached service center" time="10:48" />
          </ul>
        </Panel>

        <Panel part="otp-panel" layer={layer}>
          <div className="flex items-center justify-between">
            <p className="font-display text-base text-white">Handover at your center</p>
            <ShieldCheck className="h-5 w-5 text-volt-glow" aria-hidden="true" />
          </div>
          <p className="mt-1 text-xs text-silver">The driver hands the car to your team. The customer&apos;s code confirms it.</p>
          <div className="mt-4">
            <OtpRow okText="Verified with OTP · 10:48" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-2.5">
              <p className="font-display text-xl text-white">2</p>
              <p className="text-silver-dim">handovers per booking</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-2.5">
              <p className="font-display text-xl text-white">4</p>
              <p className="text-silver-dim">per round trip</p>
            </div>
          </div>
        </Panel>
      </PanelLayers>
    </SceneShell>
  );
}

/** T 29.5 to 58. The mini map marker follows the same S.dist that moves the car in the world. */
export function animateTracking({ tl, root, S, T }) {
  const { q, qa } = makeQuery(root);
  const rows = qa('[data-row]');
  const trackText = q('[data-part="track-text"]');
  const otpText = q('[data-part="otp-text"]');
  const trackPanel = q('[data-part="track-panel"]');
  const otpPanel = q('[data-part="otp-panel"]');

  sceneIn(tl, root, 29.6);

  activateRow(tl, rows[0], 30.4);
  activateRow(tl, rows[1], 30.8);
  activateRow(tl, rows[2], 31.4);
  activateRow(tl, rows[3], 32.6);
  activateRow(tl, rows[4], 48.6);

  // Swap tracking for the OTP block as the car reaches the bay door.
  partOut(tl, [trackText, trackPanel], 49.4, 0.9);
  partIn(tl, [otpText, otpPanel], 50.4, 1.1);
  const end = otpSequence(tl, otpPanel, 52.2, { digitGap: 0.45, verifyAt: 55.6 });
  sceneOut(tl, root, 57.6, 0.9);

  const route = q('[data-route]');
  const marker = q('[data-minimarker]');
  // The mini map is display:none on very short screens, where length lookups can throw.
  let len = 0;
  try {
    len = route.getTotalLength();
  } catch (e) {
    len = 0;
  }
  if (len) {
    route.style.strokeDasharray = `${len} ${len}`;
    route.style.strokeDashoffset = `${len}`;
  }

  const tick = () => {
    if (!len) return;
    const f = Math.min(1, Math.max(0, (S.dist - S.distHome) / (S.distDoor - S.distHome)));
    route.style.strokeDashoffset = `${len * (1 - f)}`;
    const pt = route.getPointAtLength(len * f);
    marker.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
  };
  tick();
  return { tick, end };
}
