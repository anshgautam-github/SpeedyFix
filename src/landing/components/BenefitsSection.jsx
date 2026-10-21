import { useRef } from 'react';
import { ClipboardList, Eye, ShieldCheck, Users } from 'lucide-react';
import { gsap } from '../lib/gsap';
import { useIsoLayoutEffect, useReducedMotion } from '../hooks/useReducedMotion';

const BENEFITS = [
  {
    icon: Users,
    title: 'Drivers coordinated for you',
    body: 'Speedy Fix supplies the drivers and assigns every job. You raise one booking from your phone and never phone around for someone free.',
    fact: 'Six details to book',
  },
  {
    icon: Eye,
    title: 'Status visible at every stage',
    body: 'Open any booking to see who has the vehicle and since when. Late jobs are flagged, and one tap calls the customer or the driver.',
    fact: 'The answer is on the screen',
  },
  {
    icon: ShieldCheck,
    title: 'OTP-verified handovers and records',
    body: 'The customer confirms each handover with a six-digit code. It is saved with its time, and vehicle photos can be attached to the booking.',
    fact: 'Four verified handovers per round trip',
  },
  {
    icon: ClipboardList,
    title: 'Less administration at the front desk',
    body: 'Paper job cards, handover notes and hand-added totals move into the app. Work orders add up parts and labour on their own.',
    fact: 'No paper job cards to chase',
  },
];

export default function BenefitsSection() {
  const reduced = useReducedMotion();
  const root = useRef(null);

  useIsoLayoutEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root.current);
      q('[data-benefit]').forEach((row) => {
        const line = row.querySelector('[data-rule]');
        const body = row.querySelectorAll('[data-reveal]');
        const parts = row.querySelectorAll('[data-icon] svg *');
        parts.forEach((p) => {
          p.setAttribute('pathLength', '1');
          p.style.strokeDasharray = '1';
        });
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 84%', toggleActions: 'play none none none' } })
          .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power3.inOut', transformOrigin: 'left center' }, 0)
          .fromTo(parts, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'power2.out', stagger: 0.08 }, 0.15)
          .fromTo(body, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, 0.25);
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="why" ref={root} aria-labelledby="why-heading" className="relative bg-paper pb-24 pt-44 text-navy-900 md:pb-32 md:pt-52">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-midnight to-paper" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 id="why-heading" className="font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.03] text-midnight">
            Built around the front desk&apos;s day.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-navy-700/80">
            Pickup and drop is not your service work. It is the part that eats the phone line. Speedy Fix takes it off your team, and leaves a record behind.
          </p>
        </div>

        <ul>
          {BENEFITS.map(({ icon: Icon, title, body, fact }) => (
            <li key={title} data-benefit="" className="group relative py-8 first:pt-0">
              <span data-rule="" className="absolute inset-x-0 top-0 h-px origin-left bg-navy-700/20 group-first:hidden" />
              <div className="flex gap-5 sm:gap-7">
                <span
                  data-icon=""
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-midnight text-volt-glow transition-shadow duration-300 group-hover:shadow-[0_0_0_6px_rgba(31,107,255,.14)]"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 data-reveal="" className="font-display text-[clamp(1.2rem,2vw,1.55rem)] leading-tight text-midnight">{title}</h3>
                  <p data-reveal="" className="mt-2 max-w-xl text-base leading-relaxed text-navy-700/80">{body}</p>
                  <p data-reveal="" className="mt-3 text-sm font-semibold text-volt">{fact}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
