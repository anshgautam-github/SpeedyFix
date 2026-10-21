/**
 * World coordinates. The whole journey lives in one SVG of WORLD.w x WORLD.h units.
 * The SVG is scaled to the road band's height at runtime, so the car, road, buildings and
 * pins always stay locked together at every viewport size.
 */
export const WORLD = { w: 5200, h: 560 };

// Road centre line. Every control point has an increasing x, so x -> length lookups are monotonic.
export const ROAD_D =
  'M -200 430 L 760 430 C 1000 430 1100 372 1400 372 C 1750 372 1800 456 2150 456 ' +
  'C 2500 456 2550 392 2850 392 C 3000 392 3050 430 3200 430 L 5400 430';

// Key x positions along the road, in world units.
export const STOPS = {
  driverStart: -140,
  home: 780, // customer's driveway (pickup)
  doorIn: 3150, // entry shutter of the service bay
  bay: 3600, // parked on the lift
  doorOut: 4030, // exit shutter
  drop: 4500, // customer's driveway (delivery)
};

export const BUILDING = { x: 3150, w: 900, roofY: 112, floorTop: 398, floorBottom: 462, doorTop: 232 };
export const CAR_SCALE = 0.95;
export const CAR_LIFT_GROUND = 10; // wheels sit this far above the road centre line
export const LIFT_HEIGHT = 34;

export function createSampler(pathEl) {
  const total = pathEl.getTotalLength();
  const lengthAtX = (x) => {
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 28; i += 1) {
      const mid = (lo + hi) / 2;
      if (pathEl.getPointAtLength(mid).x < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const point = (len) => pathEl.getPointAtLength(Math.min(total, Math.max(0, len)));
  const angle = (len) => {
    const a = point(len - 14);
    const b = point(len + 14);
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  };
  return { total, lengthAtX, point, angle };
}
