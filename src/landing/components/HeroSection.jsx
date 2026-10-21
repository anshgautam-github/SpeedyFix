import { useRef } from 'react';
import CarSvg from './Car';
import MagneticButton from './MagneticButton';
import { SkylineLayer, MidLayer, DashLayer } from '../journey/world/Layers';
import { gsap } from '../lib/gsap';
import { anchorClick } from '../lib/scrollTo';
import { useIsoLayoutEffect, useReducedMotion } from '../hooks/useReducedMotion';

const DASH_TILES = 26;
const STREAKS = [
  { top: '38%', w: '18vw' },
  { top: '46%', w: '26vw' },
  { top: '57%', w: '14vw' },
  { top: '66%', w: '22vw' },
  { top: '74%', w: '30vw' },
  { top: '82%', w: '16vw' },
];

export default function HeroSection() {
  const reduced = useReducedMotion();
  const root = useRef(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    const beam = el.querySelector('[data-beam]');
    const wheels = Array.from(el.querySelectorAll('[data-wheel]'));
    if (reduced) {
      beam.setAttribute('opacity', '0.7');
      return undefined;
    }

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const loops = [];
      const loop = (tween) => {
        loops.push(tween);
        return tween;
      };
      const setSpeed = (v) => loops.forEach((t) => t.timeScale(v));

      // Environment: three layers at different speeds, plus light streaks. All share one speed control.
      loop(gsap.to(q('[data-far]'), { xPercent: -16.6667, duration: 80, ease: 'none', repeat: -1 }));
      loop(gsap.to(q('[data-mid]'), { xPercent: -10, duration: 16, ease: 'none', repeat: -1 }));
      loop(gsap.to(q('[data-dash]'), { xPercent: -(100 / DASH_TILES), duration: 0.9, ease: 'none', repeat: -1 }));
      const spin = { a: 0 };
      loop(
        gsap.to(spin, {
          a: 360,
          duration: 0.5,
          ease: 'none',
          repeat: -1,
          onUpdate: () => wheels.forEach((w) => w.setAttribute('transform', `rotate(${spin.a})`)),
        })
      );
      q('[data-streak]').forEach((s) => {
        loop(gsap.fromTo(s, { x: '120vw' }, { x: '-45vw', duration: gsap.utils.random(2.2, 4.6), delay: gsap.utils.random(0, 3), ease: 'none', repeat: -1 }));
      });

      const speed = { v: 3.4 };
      setSpeed(speed.v);

      // Initial states
      gsap.set(q('[data-line]'), { yPercent: 118 });
      gsap.set(q('[data-support]'), { autoAlpha: 0, y: 26 });
      gsap.set(q('[data-cta] > *'), { autoAlpha: 0, y: 22 });
      gsap.set(q('[data-car-x]'), { x: '-78vw' });

      // Sequenced load-in: the car arrives, the road settles to a cruise, then the copy lands.
      const intro = gsap.timeline();
      intro
        .to(q('[data-car-x]'), { x: 0, duration: 2.1, ease: 'power3.out' }, 0.1)
        .to(speed, { v: 0.45, duration: 2.8, ease: 'power2.out', onUpdate: () => setSpeed(speed.v) }, 0.1)
        .to(q('[data-line]'), { yPercent: 0, duration: 1.15, stagger: 0.14, ease: 'expo.out' }, 0.35)
        .to(q('[data-support]'), { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 1.05)
        .to(q('[data-cta] > *'), { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 1.25)
        .fromTo(q('[data-car-x]'), { rotation: 1.5, transformOrigin: '35% 100%' }, { rotation: 0, duration: 1.2, ease: 'elastic.out(1,.55)', immediateRender: false }, 1.8)
        .to(beam, { keyframes: [{ opacity: 0.95, duration: 0.08 }, { opacity: 0.15, duration: 0.08 }, { opacity: 0.8, duration: 0.14 }], ease: 'none' }, 1.9);

      gsap.to(q('[data-car-bob]'), { y: -2.4, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.2 });

      // Scrolling out: copy drifts up, the road speeds up as the visitor leaves.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
            onUpdate: (self) => {
              if (intro.progress() >= 1) setSpeed(0.45 + self.progress * 3);
            },
          },
        })
        .to(q('[data-content]'), { yPercent: -16, opacity: 0.1, ease: 'none' }, 0)
        .to(q('[data-car-scroll]'), { x: '-5vw', scale: 0.95, transformOrigin: '50% 100%', ease: 'none' }, 0);
    }, el);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="top"
      ref={root}
      aria-labelledby="hero-heading"
      className="relative isolate min-h-[100svh] overflow-hidden bg-midnight text-white [--road:clamp(96px,17svh,172px)] [--carW:min(108vw,820px,100svh)]"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_82%_18%,rgba(31,107,255,.28)_0%,rgba(10,19,40,0)_65%),linear-gradient(180deg,#060a13_0%,#0a1328_62%,#060a13_100%)]" />

      {/* distant skyline and street furniture */}
      <div className="absolute inset-x-0 overflow-hidden opacity-90" style={{ bottom: 'var(--road)', height: '34svh' }} aria-hidden="true">
        <div data-far="" className="absolute bottom-0 left-0 h-full">
          <SkylineLayer className="h-full w-auto max-w-none" />
        </div>
      </div>
      <div className="absolute inset-x-0 overflow-hidden" style={{ bottom: 'var(--road)', height: '26svh' }} aria-hidden="true">
        <div data-mid="" className="absolute bottom-0 left-0 h-full">
          <MidLayer className="h-full w-auto max-w-none" />
        </div>
      </div>

      {/* light streaks */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {STREAKS.map((s, i) => (
          <span
            key={i}
            data-streak=""
            className="absolute left-0 h-px bg-gradient-to-r from-transparent via-volt-glow/70 to-transparent"
            style={{ top: s.top, width: s.w }}
          />
        ))}
      </div>

      {/* road */}
      <div className="absolute inset-x-0 bottom-0 border-t border-[#25345a] bg-gradient-to-b from-[#0d1424] to-[#080d19]" style={{ height: 'var(--road)' }} aria-hidden="true">
        <div className="absolute inset-x-0 top-[62%] h-1.5 overflow-hidden">
          <div data-dash="" className="h-full" style={{ width: DASH_TILES * 120 }}>
            <DashLayer tiles={DASH_TILES} className="h-full w-full" />
          </div>
        </div>
      </div>

      {/* car */}
      <div data-car-scroll="" className="pointer-events-none absolute inset-x-0 flex justify-center md:justify-end md:pr-[3vw]" style={{ bottom: 'calc(var(--road) * .5 - var(--carW) * .0324)' }}>
        <div data-car-x="">
          <div data-car-bob="">
            <CarSvg glow className="block h-auto w-[var(--carW)]" title="Speedy Fix car on the road" />
          </div>
        </div>
      </div>

      <div data-content="" className="relative z-10 mx-auto max-w-7xl px-4 pt-28 sm:px-8 md:pt-36">
        <h1 id="hero-heading" className="font-display text-[clamp(2.3rem,5.2vw,5.3rem)] leading-[1.08]">
          <span className="block overflow-hidden pb-[.12em]">
            <span data-line="" className="metallic block">Your car&apos;s journey.</span>
          </span>
          <span className="block overflow-hidden pb-[.12em]">
            <span data-line="" className="metallic block">Handled from door to door.</span>
          </span>
        </h1>
        <p data-support="" className="mt-6 max-w-xl text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed text-silver">
          Speedy Fix coordinates vehicle pickup, delivery, verified handovers and service-center operations, so your workshop handles the service and we handle the journey.
        </p>
        <div data-cta="" className="mt-8 flex flex-wrap items-center gap-3">
          <MagneticButton href="#partner" onClick={anchorClick('partner', reduced)}>
            Partner With Us
          </MagneticButton>
          <MagneticButton href="#journey" variant="ghost" onClick={anchorClick('journey', reduced)}>
            See How It Works
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

