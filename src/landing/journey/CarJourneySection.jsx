import { useId, useMemo, useRef } from 'react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { useIsoLayoutEffect, useReducedMotion } from '../hooks/useReducedMotion';
import { CAR_WHEEL_RADIUS } from '../components/Car';
import World from './world/World';
import { SkylineLayer, MidLayer } from './world/Layers';
import { CAR_LIFT_GROUND, CAR_SCALE, LIFT_HEIGHT, STOPS, WORLD, createSampler } from './world/geometry';
import JourneyHud, { STAGES } from './JourneyHud';
import JourneyStatic from './JourneyStatic';
import BookingScene, { animateBooking } from './scenes/BookingScene';
import DriverAssignmentScene, { animateAssign } from './scenes/DriverAssignmentScene';
import TrackingScene, { animateTracking } from './scenes/TrackingScene';
import WorkshopScene, { animateWorkshop } from './scenes/WorkshopScene';
import ReturnJourneyScene, { animateReturn } from './scenes/ReturnJourneyScene';
import { restoreTyped } from './scenes/anim';

/** Timeline length in "units". ScrollTrigger maps the whole pinned scroll distance onto it. */
const TOTAL = 107;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const STEPS = [
  'A customer books a vehicle pickup.',
  'Speedy Fix assigns a driver.',
  'The driver reaches the customer and collects the car.',
  'The car travels to the service center, with status at every stage.',
  'The workshop services the vehicle.',
  'The driver returns the car to the customer.',
  'The customer receives it through an OTP-verified handover.',
];

function Stars() {
  const stars = useMemo(() => {
    let s = 11;
    const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    return Array.from({ length: 46 }, (_, i) => ({ x: rand() * 100, y: rand() * 100, r: 0.6 + rand() * 1.3, o: 0.25 + rand() * 0.5, t: i % 7 === 0 }));
  }, []);
  return (
    <svg className="absolute inset-x-0 top-0 h-[62%] w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {stars.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.r * 0.12} ry={s.r * 0.2} fill="#cfe3ff" opacity={s.o} className={s.t ? 'sf-twinkle' : undefined} />
      ))}
    </svg>
  );
}

export default function CarJourneySection() {
  const reduced = useReducedMotion();
  return reduced ? <JourneyStatic /> : <PinnedJourney />;
}

function PinnedJourney() {
  const pinRef = useRef(null);
  const stageRef = useRef(null);
  const wrapRef = useRef(null);
  const worldRef = useRef(null);
  const skyRef = useRef(null);
  const midRef = useRef(null);
  const carUid = `jc${useId().replace(/:/g, '')}`;

  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    const svg = worldRef.current;
    const layers = [svg, skyRef.current, midRef.current];
    const mm = gsap.matchMedia();
    let cleanupExtra = () => {};

    mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, (mctx) => {
      const isMob = Boolean(mctx.conditions.mob);

      // ---------- world handles ----------
      const $ = (sel) => svg.querySelector(sel);
      const road = $('[data-road]');
      const sampler = createSampler(road);
      const L = (x) => sampler.lengthAtX(x);
      const carEl = $('[data-car]');
      const wheels = Array.from(carEl.querySelectorAll('[data-wheel]'));
      const beam = carEl.querySelector('[data-beam]');
      const headGlow = carEl.querySelector('[data-headglow]');
      const trail = carEl.querySelector('[data-trail]');
      const lit = $('[data-lit]');
      const driverEl = $('[data-driver]');
      const liftEl = $('[data-lift]');
      const shutIn = $('[data-shutter="in"]');
      const shutOut = $('[data-shutter="out"]');
      const lamps = $('[data-lamps]');
      const wallBar = $('[data-wallbar]');
      const sign = $('[data-sign]');
      const pinHome = $('[data-pin="home"]');
      const pinDrop = $('[data-pin="drop"]');
      const figEnd = $('[data-customer-end]');
      const doorLight = $('[data-house="end"] [data-doorlight]');

      // ---------- shared journey state (plain object; tweened by the master timeline) ----------
      const S = {
        dist: 0, driverDist: 0, driverOn: 0, lights: 0, lift: 0, shutIn: 0, shutOut: 0, bayLight: 0,
        work: 0, booked: 0, dropBooked: 0, endFig: 0, done: 0,
        distHome: L(STOPS.home), distDoor: L(STOPS.doorIn), distBay: L(STOPS.bay), distDrop: L(STOPS.drop),
      };
      S.dist = S.distHome;
      S.driverDist = L(STOPS.driverStart);

      // ---------- measuring ----------
      let wrapH = 0;
      let vw = 0;
      let s = 1;
      let maxCam = 0;
      let anchor = 0.58;
      const measure = () => {
        wrapH = wrap.clientHeight;
        vw = stage.clientWidth;
        s = wrapH / WORLD.h;
        layers.forEach((el) => {
          el.style.height = `${wrapH}px`;
          el.style.width = `${WORLD.w * s}px`;
        });
        maxCam = Math.max(0, WORLD.w * s - vw);
        anchor = vw < 768 ? 0.42 : 0.58;
      };

      // ---------- per-frame render: direct DOM writes only, no React state ----------
      const wheelK = 180 / Math.PI / (CAR_WHEEL_RADIUS * CAR_SCALE);
      let pinHomeOn = false;
      let pinDropOn = false;
      const render = () => {
        const p = sampler.point(S.dist);
        const ang = sampler.angle(S.dist);
        const depth = 1 + (p.y - 430) / 1100;
        const lift = S.lift * LIFT_HEIGHT;
        carEl.setAttribute('transform', `translate(${p.x.toFixed(2)} ${(p.y - CAR_LIFT_GROUND - lift).toFixed(2)}) rotate(${ang.toFixed(2)}) scale(${depth.toFixed(4)})`);
        const spin = `rotate(${(S.dist * wheelK).toFixed(2)})`;
        wheels.forEach((w) => w.setAttribute('transform', spin));
        beam.setAttribute('opacity', (S.lights * 0.9).toFixed(3));
        headGlow.setAttribute('opacity', (0.35 + 0.65 * S.lights).toFixed(3));

        // camera follows the car; far layers move slower for parallax
        const cam = clamp(p.x * s - vw * anchor, 0, maxCam);
        svg.style.transform = `translate3d(${-cam}px,0,0)`;
        skyRef.current.style.transform = `translate3d(${-cam * 0.3}px,0,0)`;
        midRef.current.style.transform = `translate3d(${-cam * 0.62}px,0,0)`;

        // travelled route
        const travelled = Math.max(0, S.dist - S.distHome);
        lit.style.strokeDasharray = travelled < 0.5 ? '0 99999' : `${travelled} ${sampler.total}`;
        lit.style.strokeDashoffset = `${-S.distHome}`;

        // driver marker on its way to the customer
        const dp = sampler.point(S.driverDist);
        driverEl.setAttribute('transform', `translate(${dp.x.toFixed(1)} ${(dp.y - 56).toFixed(1)})`);
        driverEl.setAttribute('opacity', S.driverOn.toFixed(3));

        // service bay
        shutIn.setAttribute('transform', `translate(0 ${(-S.shutIn * 232).toFixed(1)})`);
        shutOut.setAttribute('transform', `translate(0 ${(-S.shutOut * 232).toFixed(1)})`);
        liftEl.setAttribute('transform', `translate(0 ${-lift})`);
        lamps.setAttribute('opacity', (0.3 + 0.7 * S.bayLight).toFixed(3));
        sign.setAttribute('stroke-opacity', (0.45 + 0.55 * S.bayLight).toFixed(3));
        wallBar.style.transform = `scaleX(${S.work})`;

        // pins and the arrival moment
        const homeOn = S.booked >= 1;
        const dropOn = S.dropBooked >= 1;
        if (homeOn !== pinHomeOn) { pinHomeOn = homeOn; pinHome.classList.toggle('is-on', homeOn); }
        if (dropOn !== pinDropOn) { pinDropOn = dropOn; pinDrop.classList.toggle('is-on', dropOn); }
        figEnd.setAttribute('opacity', S.endFig.toFixed(3));
        doorLight.setAttribute('opacity', (0.85 * S.done).toFixed(3));
      };

      // ---------- master timeline ----------
      const ticks = [];
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      const scene = (id) => stage.querySelector(`[data-scene="${id}"]`);

      const intro = animateBooking({ tl, root: scene('booking'), S });
      animateAssign({ tl, root: scene('assign'), S, sampler });
      const track = animateTracking({ tl, root: scene('tracking'), S });
      const work = animateWorkshop({ tl, root: scene('workshop'), S });
      const back = animateReturn({ tl, root: scene('return'), S });
      ticks.push(track.tick, work.tick, back.tick);

      // The car. Explicit start values keep every tween reversible when scrubbing backwards.
      const move = (from, to, dur, at, ease) =>
        tl.fromTo(S, { dist: from }, { dist: to, duration: dur, ease, immediateRender: false }, at);
      move(S.distHome, S.distDoor, 22, 27, 'power1.inOut'); // out to the service center
      move(S.distDoor, S.distBay, 8, 49, 'power2.out'); // through the shutter onto the lift
      move(S.distBay, S.distDrop, 18, 79, 'power2.inOut'); // out and back to the customer

      tl.to(S, { shutIn: 1, duration: 2.6, ease: 'power2.inOut' }, 41.4);
      tl.to(S, { bayLight: 1, duration: 2.5 }, 46);
      tl.to(S, { shutIn: 0, duration: 2, ease: 'power2.inOut' }, 57.6);
      tl.to(S, { lift: 1, duration: 1.8, ease: 'power2.inOut' }, 57.8);
      tl.to(S, { lift: 0, duration: 1.8, ease: 'power2.inOut' }, 76.8);
      tl.to(S, { shutOut: 1, duration: 2.2, ease: 'power2.inOut' }, 78.4);
      tl.to(S, { shutOut: 0, duration: 2, ease: 'power2.inOut' }, 90);
      tl.to(S, { dropBooked: 1, duration: 0.5 }, 79.2);
      tl.to(S, { bayLight: 0.2, duration: 2 }, 84);
      tl.to(S, { endFig: 1, duration: 1.6 }, 94.4);
      tl.to(S, { lights: 0.25, duration: 1.6 }, 96.4);
      tl.to(S, { done: 1, duration: 1.6, ease: 'power2.out' }, 99);
      tl.to({}, { duration: 0.01 }, TOTAL - 0.01); // fixes the timeline length, leaving a hold at the end

      // stage indicator: written to the DOM only when the active stage changes
      const hudSteps = Array.from(stage.querySelectorAll('[data-hud-step]'));
      const hudBar = stage.querySelector('[data-hud-bar]');
      let hudKey = -9;
      const updateHud = () => {
        const t = tl.time();
        let idx = 0;
        STAGES.forEach((st, i) => { if (t >= st.at) idx = i; });
        const finished = t >= 101.5;
        const key = finished ? 99 : idx;
        if (key !== hudKey) {
          hudKey = key;
          hudSteps.forEach((el, i) => {
            el.dataset.state = finished || i < idx ? 'done' : i === idx ? 'active' : 'todo';
          });
        }
        hudBar.style.transform = `scaleX(${clamp(t / 101.5, 0, 1)})`;
      };

      const renderAll = () => {
        render();
        ticks.forEach((fn) => fn());
        updateHud();
      };
      tl.eventCallback('onUpdate', renderAll);

      // light trails fade with scroll speed; runs on the GSAP ticker, not on scroll events
      let lastDist = S.dist;
      let trailLevel = 0;
      const trailTick = () => {
        const v = Math.abs(S.dist - lastDist);
        lastDist = S.dist;
        const next = trailLevel + (clamp(v / 10, 0, 1) - trailLevel) * 0.16;
        if (Math.abs(next - trailLevel) > 0.004) {
          trailLevel = next;
          trail.setAttribute('opacity', trailLevel.toFixed(3));
        }
      };
      gsap.ticker.add(trailTick);

      // ---------- pin + scrub ----------
      measure();
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * (isMob ? 4.6 : 6.6))}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: tl,
        onRefresh: () => {
          measure();
          renderAll();
        },
      });

      // one-shot entrance for the booking scene as the stage arrives
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: 'top 78%',
        onEnter: () => intro.play(),
        onLeaveBack: () => intro.reverse(),
      });

      renderAll();

      cleanupExtra = () => {
        gsap.ticker.remove(trailTick);
        restoreTyped(stage);
      };
      return () => cleanupExtra();
    });

    return () => {
      mm.revert();
      cleanupExtra();
    };
  }, []);

  return (
    <div id="journey">
      <section ref={pinRef} aria-labelledby="journey-heading" className="relative bg-midnight text-white">
        <h2 id="journey-heading" className="sr-only">
          One car, one journey, from the customer&apos;s door to the service center and back
        </h2>
        <ol className="sr-only">
          {STEPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>

        <div
          ref={stageRef}
          aria-hidden="true"
          className="journey-stage relative h-[100svh] min-h-[560px] overflow-hidden bg-[radial-gradient(120%_70%_at_75%_0%,#10244f_0%,#0a1328_45%,#060a13_100%)]"
        >
          <Stars />
          <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-volt/10 blur-3xl" />

          <div ref={wrapRef} className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: 'var(--road-h)' }}>
            <SkylineLayer svgRef={skyRef} className="absolute bottom-0 left-0 max-w-none" />
            <MidLayer svgRef={midRef} className="absolute bottom-0 left-0 max-w-none" />
            <World svgRef={worldRef} carUid={carUid} />
          </div>

          <JourneyHud />

          <div
            className="pointer-events-none absolute inset-x-0 top-[112px] md:top-[132px] [@media(max-height:700px)]:origin-top [@media(max-height:700px)]:scale-90"
            style={{ bottom: 'calc(var(--road-h) + 8px)' }}
          >
            <BookingScene />
            <DriverAssignmentScene />
            <TrackingScene />
            <WorkshopScene />
            <ReturnJourneyScene />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-midnight to-transparent" />
        </div>
      </section>
    </div>
  );
}
