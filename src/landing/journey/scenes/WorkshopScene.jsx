import { Wrench } from 'lucide-react';
import { SceneShell, SceneText, TextLayers, Panel, PanelLayers, Avatar } from './ui';
import { makeQuery, sceneIn, sceneOut, fmtINR } from './anim';

const STATUSES = ['Accepted', 'In progress', 'Quality check', 'Ready for drop'];

export default function WorkshopScene({ staticMode }) {
  return (
    <SceneShell id="workshop" staticMode={staticMode} label="Step 5: the workshop services the vehicle">
      <TextLayers staticMode={staticMode}>
        <SceneText title="Then the workshop takes over.">
          Accept the work order, assign a technician, add parts as you use them. Labour and the total fill themselves in.
        </SceneText>
      </TextLayers>
      <PanelLayers staticMode={staticMode}>
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display text-base text-white">
                <Wrench className="h-4 w-4 shrink-0 text-volt-glow" aria-hidden="true" />
                Work order WO-2041
              </p>
              <p className="mt-0.5 truncate text-xs text-silver-dim">TN 10 BX 2046 &middot; Brake service</p>
            </div>
            <div className="relative h-6 w-[7.6rem] shrink-0 text-right text-xs font-medium">
              {STATUSES.map((s, i) => (
                <span
                  key={s}
                  data-status={i}
                  className={`absolute right-0 top-0 rounded-full px-2.5 py-0.5 ${i === 3 ? 'bg-ok/15 text-ok' : i === 2 ? 'bg-amber-400/15 text-amber-300' : 'bg-volt/20 text-volt-glow'}`}
                  style={i < 3 ? { opacity: 0, visibility: 'hidden' } : undefined}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-2.5">
              <div data-tech="" className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.04] p-2.5">
                <Avatar initials="RM" className="h-9 w-9 text-xs" />
                <div>
                  <p className="text-xs text-silver-dim">Technician</p>
                  <p className="text-sm text-white">Ravi M.</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.04] p-2.5">
                <div className="flex items-center justify-between text-xs text-silver-dim">
                  <span>Service progress</span>
                  <span data-pct="" className="tabular-nums text-white">100%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div data-bar="" className="h-full origin-left rounded-full bg-gradient-to-r from-volt to-volt-glow" />
                </div>
                <p data-eta="" className="mt-2 text-xs text-silver [@media(max-height:760px)]:hidden">
                  Estimated completion: <span className="text-white">today, 4:30 PM</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-xs">
              <p className="text-xs text-silver-dim">Parts and labour</p>
              <ul className="mt-1.5 space-y-1.5">
                <li data-part-row="" className="flex justify-between gap-2 text-white">
                  <span>Brake pads, front<span className="text-silver-dim"> &times; 1</span></span>
                  <span className="tabular-nums">{fmtINR(1850)}</span>
                </li>
                <li data-part-row="" className="flex justify-between gap-2 text-white">
                  <span>Oil filter<span className="text-silver-dim"> &times; 1</span></span>
                  <span className="tabular-nums">{fmtINR(320)}</span>
                </li>
                <li data-labour="" className="flex justify-between gap-2 text-white">
                  <span>Labour<span className="text-silver-dim"> 1.5 h &times; {fmtINR(600)}</span></span>
                  <span className="tabular-nums">{fmtINR(900)}</span>
                </li>
              </ul>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-silver">Total</span>
                <span data-total="" className="font-display text-lg text-white tabular-nums">{fmtINR(3070)}</span>
              </div>
            </div>
          </div>
        </Panel>
      </PanelLayers>
    </SceneShell>
  );
}

/** T 58 to 78. S.work (0 to 1) also drives the progress readout and the monitor on the bay wall. */
export function animateWorkshop({ tl, root, S }) {
  const { q, qa } = makeQuery(root);
  const statuses = qa('[data-status]');
  const tech = q('[data-tech]');
  const parts = qa('[data-part-row]');
  const labour = q('[data-labour]');
  const total = q('[data-total]');
  const bar = q('[data-bar]');
  const pct = q('[data-pct]');
  const est = q('[data-eta]');

  sceneIn(tl, root, 58.6);

  // Status chips stack; the right one is shown at each stage.
  const showStatus = (i, at) => {
    statuses.forEach((el, j) => {
      if (j === i) tl.fromTo(el, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at);
      else if (j < i) tl.to(el, { autoAlpha: 0, y: -6, duration: 0.4 }, at);
    });
  };
  showStatus(0, 59.4);
  showStatus(1, 62);
  showStatus(2, 73);
  showStatus(3, 75.2);

  tl.fromTo(tech, { opacity: 0.2, x: -10 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out' }, 60.6);
  tl.fromTo(est, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 60.2);

  parts.forEach((el, i) => tl.fromTo(el, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, 64.4 + i * 1.8));
  tl.fromTo(labour, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, 68.4);

  // Progress and total are driven by plain numbers so they stay in sync with the bay monitor.
  tl.fromTo(S, { work: 0 }, { work: 1, duration: 11, ease: 'none', immediateRender: false }, 62);
  const money = { n: 0 };
  total.textContent = fmtINR(0);
  tl.fromTo(
    money,
    { n: 0 },
    {
      n: 3070,
      duration: 3.2,
      ease: 'power2.out',
      onUpdate() {
        total.textContent = fmtINR(money.n);
      },
    },
    69.2
  );

  const tick = () => {
    bar.style.transform = `scaleX(${S.work})`;
    pct.textContent = `${Math.round(S.work * 100)}%`;
  };
  tick();

  sceneOut(tl, root, 77, 1);
  return { tick };
}
