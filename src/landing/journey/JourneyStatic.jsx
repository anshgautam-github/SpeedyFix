import CarSvg from '../components/Car';
import BookingScene from './scenes/BookingScene';
import DriverAssignmentScene from './scenes/DriverAssignmentScene';
import TrackingScene from './scenes/TrackingScene';
import WorkshopScene from './scenes/WorkshopScene';
import ReturnJourneyScene from './scenes/ReturnJourneyScene';

/** Reduced-motion version: the same scenes, fully resolved, in normal page flow. No pinning, no scrubbing. */
export default function JourneyStatic() {
  return (
    <div id="journey">
      <section aria-labelledby="journey-heading" className="relative bg-midnight pb-12 pt-28 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <h2 id="journey-heading" className="max-w-3xl font-display text-[clamp(2rem,5vw,4rem)] leading-[1.02]">
            One car, one journey, from the customer&apos;s door to your bay and back.
          </h2>
          <p className="mt-4 max-w-xl text-silver">Seven steps, each shown below with sample data.</p>
          <CarSvg className="mt-10 w-full max-w-xl" glow />
        </div>
        <BookingScene staticMode />
        <DriverAssignmentScene staticMode />
        <TrackingScene staticMode />
        <WorkshopScene staticMode />
        <ReturnJourneyScene staticMode />
      </section>
    </div>
  );
}
