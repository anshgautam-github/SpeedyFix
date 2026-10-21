import { useRef } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import CarSvg from './Car';
import MagneticButton from './MagneticButton';
import { SITE, getPartnerHref, hasContact } from '../config';
import { gsap } from '../lib/gsap';
import { anchorClick } from '../lib/scrollTo';
import { useIsoLayoutEffect, useReducedMotion } from '../hooks/useReducedMotion';

export function ContactList({ className = '' }) {
  const { personName, email, phone, whatsapp } = SITE.contact;
  const link = 'inline-flex items-center gap-2.5 rounded-full py-1.5 text-base text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-glow';
  return (
    <ul className={`space-y-1 ${className}`}>
      {personName && <li className="text-sm text-silver">{personName}</li>}
      {phone && (
        <li>
          <a className={link} href={`tel:${phone}`}><Phone className="h-4 w-4 text-volt-glow" aria-hidden="true" />{phone}</a>
        </li>
      )}
      {whatsapp && (
        <li>
          <a className={link} href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-volt-glow" aria-hidden="true" />WhatsApp</a>
        </li>
      )}
      {email && (
        <li>
          <a className={link} href={`mailto:${email}`}><Mail className="h-4 w-4 text-volt-glow" aria-hidden="true" />{email}</a>
        </li>
      )}
    </ul>
  );
}

export default function PartnerCTA() {
  const reduced = useReducedMotion();
  const root = useRef(null);
  const configured = hasContact();

  // A car crosses the road at the foot of the page as the visitor arrives; wheels turn with the scroll.
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      const wheels = Array.from(el.querySelectorAll('[data-wheel]'));
      const state = { p: 0 };
      gsap.fromTo(
        el.querySelector('[data-cta-car]'),
        { xPercent: -130 },
        {
          xPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 75%',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (self) => {
              state.p = self.progress;
              wheels.forEach((w) => w.setAttribute('transform', `rotate(${self.progress * 1400})`));
            },
          },
        }
      );
      gsap.fromTo(el.querySelectorAll('[data-cta-in]'), { autoAlpha: 0, y: 24 }, {
        autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 65%', toggleActions: 'play none none none' },
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="partner" ref={root} aria-labelledby="partner-heading" className="relative isolate overflow-hidden bg-midnight pb-44 pt-40 text-white md:pb-56 md:pt-48">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-midnight" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 top-1/3 -z-10 h-[34rem] w-[34rem] rounded-full bg-volt/15 blur-3xl" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <h2 id="partner-heading" data-cta-in="" className="max-w-4xl font-display text-[clamp(2.2rem,5.6vw,4.8rem)] leading-[1.1] metallic">
          Your workshop handles the service. We handle the journey.
        </h2>
        <p data-cta-in="" className="mt-6 max-w-xl text-lg leading-relaxed text-silver">
          Drivers supplied, handovers verified by OTP, and status at every step. We set up your center and your staff logins. Your team only needs their phones.
        </p>
        <div data-cta-in="" className="mt-9 flex flex-wrap items-center gap-4">
          <MagneticButton href={getPartnerHref()} onClick={configured ? undefined : anchorClick('contact', reduced)}>
            Become a Partner
          </MagneticButton>
          <div id="contact" className="scroll-mt-28">
            {configured ? (
              <ContactList />
            ) : (
              <p className="max-w-xs text-sm text-silver-dim">Partner contact details have not been published yet. Please check back soon.</p>
            )}
          </div>
        </div>
      </div>

      {/* road and the car that crosses it */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 border-t border-[#25345a] bg-gradient-to-b from-[#0d1424] to-[#080d19]" aria-hidden="true">
        <div className="absolute inset-x-0 top-[58%] h-px bg-[repeating-linear-gradient(90deg,#9fb2d4_0_36px,transparent_36px_72px)] opacity-40" />
      </div>
      <div data-cta-car="" className="pointer-events-none absolute bottom-[calc(6rem*.5-.7rem)] left-0 w-[min(70vw,300px)] md:left-[22%]" aria-hidden="true">
        <CarSvg glow className="block h-auto w-full" title="" />
      </div>
    </section>
  );
}
