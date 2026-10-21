import { useRef } from 'react';
import { gsap } from '../lib/gsap';
import { useIsoLayoutEffect, useReducedMotion } from '../hooks/useReducedMotion';

const STEPS = [
  { title: 'You book', body: 'Create a pickup booking from your phone in a few taps.', who: 'You' },
  { title: 'We assign', body: 'Speedy Fix allocates a driver. You see the name and number.', who: 'Speedy Fix' },
  { title: 'Driver picks up', body: 'The driver collects the vehicle. The customer confirms with an OTP.', who: 'Driver' },
  { title: 'Your team services the vehicle', body: 'The vehicle is handed over at your center and you service it.', who: 'You' },
  { title: 'Driver returns it', body: 'Raise a drop booking and a driver returns it to the customer.', who: 'You and the driver' },
];

export default function WorkflowTimeline() {
  const reduced = useReducedMotion();
  const root = useRef(null);

  useIsoLayoutEffect(() => {
    if (reduced) return undefined;
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023px)' }, (mctx) => {
      const wide = Boolean(mctx.conditions.wide);
      const q = gsap.utils.selector(root.current);
      const nodes = q('[data-node]');
      const copy = q('[data-copy]');
      const fill = q('[data-fill]');
      const axis = wide ? 'scaleX' : 'scaleY';

      // Activates in order when the section enters the viewport; the line fills as it goes.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 62%', toggleActions: 'play none none none' },
      });
      tl.fromTo(fill, { [axis]: 0 }, { [axis]: 1, duration: STEPS.length * 0.62, ease: 'none' }, 0);
      nodes.forEach((node, i) => {
        const at = i * 0.62;
        tl.fromTo(node, { backgroundColor: '#e7edf8', color: '#16264A', scale: 0.9 }, { backgroundColor: '#1F6BFF', color: '#ffffff', scale: 1, duration: 0.4, ease: 'back.out(2)' }, at);
        tl.fromTo(copy[i], { opacity: 0.35, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at);
      });
    });
    return () => mm.revert();
  }, [reduced]);

  return (
    <section id="how" ref={root} aria-labelledby="how-heading" className="bg-white py-24 text-midnight md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="max-w-2xl">
          <h2 id="how-heading" className="font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.03]">
            Five steps. Two bookings.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-navy-700/80">
            You raise a pickup booking and a drop booking. Speedy Fix handles the drivers in between, and every step is time-stamped.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-10 lg:mt-20 lg:grid-cols-5 lg:gap-6">
          <span aria-hidden="true" className="absolute bottom-5 left-[19px] top-5 w-0.5 bg-navy-700/15 lg:bottom-auto lg:left-[10%] lg:right-[10%] lg:top-[19px] lg:h-0.5 lg:w-auto">
            <span data-fill="" className="absolute inset-0 origin-top bg-volt lg:origin-left" />
          </span>
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-6 lg:text-center">
              <span
                data-node=""
                className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-volt font-display text-base text-white ring-4 ring-white"
              >
                {i + 1}
              </span>
              <div data-copy="" className="min-w-0">
                <h3 className="font-display text-xl leading-tight">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-navy-700/80">{step.body}</p>
                <p className="mt-3 inline-block rounded-full bg-paper px-3 py-1 text-xs font-semibold text-navy-700">{step.who}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
