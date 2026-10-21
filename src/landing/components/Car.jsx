import { useId } from 'react';

/**
 * Car artwork, side view, facing right.
 * Local coordinate space: x 40..608, y 62..212. Wheel contact line is y = 208.
 *
 * Hooks used by animation code (all optional):
 *   [data-wheel]  spin groups, drawn around (0,0) so `rotate(deg)` spins them in place
 *   [data-beam]   headlight cone
 *   [data-trail]  speed lines behind the car
 *   [data-glow]   under-body glow
 */
export const CAR_GROUND_Y = 208;
export const CAR_CENTER_X = 326;
export const CAR_WHEEL_RADIUS = 38;

const BODY =
  'M 44 178 C 38 160 38 140 52 128 C 72 117 112 113 152 112 C 174 90 202 70 234 66 ' +
  'C 280 62 330 62 372 66 C 410 72 438 96 458 113 C 510 115 560 121 586 136 ' +
  'C 604 147 608 164 604 180 L 598 188 L 540 188 A 60 60 0 0 0 420 188 L 210 188 ' +
  'A 60 60 0 0 0 90 188 L 52 188 C 46 186 44 183 44 178 Z';

const GLASS =
  'M 164 108 C 184 86 208 72 238 70 C 282 67 330 67 370 70 C 400 76 424 94 440 108 Z';

function Wheel({ cx, uid }) {
  return (
    <g transform={`translate(${cx} 170)`}>
      <circle r="38" fill="#04070d" />
      <circle r="35" fill="#0b101b" stroke="#1d2840" strokeWidth="2" />
      <g data-wheel="">
        <circle r="25" fill={`url(#${uid}-chrome)`} />
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d="M -8 -10 L -11 -22 L 11 -22 L 8 -10 Z" fill="#0a1020" transform={`rotate(${a})`} />
        ))}
        <circle r="6.5" fill="#e3ebf8" />
        <circle r="2.4" fill="#0a1020" />
      </g>
      <circle r="25" fill="none" stroke="#fff" strokeOpacity=".16" />
      <path d="M -30 -18 A 35 35 0 0 1 18 -30" fill="none" stroke="#3B8BFF" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

export function CarArt({ uid, glow = false }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-body`} gradientUnits="userSpaceOnUse" x1="0" y1="62" x2="0" y2="190">
          <stop offset="0" stopColor="#6FB0FF" />
          <stop offset=".3" stopColor="#2E78F7" />
          <stop offset=".72" stopColor="#1340B4" />
          <stop offset="1" stopColor="#0A2472" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} gradientUnits="userSpaceOnUse" x1="164" y1="66" x2="440" y2="110">
          <stop offset="0" stopColor="#0b1426" />
          <stop offset=".55" stopColor="#16305c" />
          <stop offset="1" stopColor="#07101f" />
        </linearGradient>
        <linearGradient id={`${uid}-chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f8ff" />
          <stop offset=".5" stopColor="#9fb0cc" />
          <stop offset="1" stopColor="#d6dff0" />
        </linearGradient>
        <linearGradient id={`${uid}-beam`} gradientUnits="userSpaceOnUse" x1="596" y1="0" x2="1000" y2="0">
          <stop offset="0" stopColor="#cfe3ff" stopOpacity=".7" />
          <stop offset="1" stopColor="#5BA2FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-trail`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3B8BFF" stopOpacity="0" />
          <stop offset="1" stopColor="#8cc0ff" stopOpacity=".9" />
        </linearGradient>
        <radialGradient id={`${uid}-shadow`}>
          <stop offset="0" stopColor="#000" stopOpacity=".7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-lamp`}>
          <stop offset="0" stopColor="#e8f2ff" stopOpacity=".95" />
          <stop offset="1" stopColor="#5BA2FF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-wells`}>
          <rect x="0" y="0" width="640" height="188" />
        </clipPath>
        {glow && (
          <filter id={`${uid}-blur`} x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        )}
      </defs>

      {/* ground contact shadow */}
      <ellipse cx="326" cy="208" rx="300" ry="12" fill={`url(#${uid}-shadow)`} />
      {glow && (
        <ellipse data-glow="" cx="326" cy="206" rx="250" ry="9" fill="#3B8BFF" opacity=".5" filter={`url(#${uid}-blur)`} />
      )}

      {/* headlight beam and speed trails sit behind the body */}
      <polygon data-beam="" points="598,150 1000,96 1000,206" fill={`url(#${uid}-beam)`} opacity="0" />
      <g data-trail="" opacity="0">
        <rect x="-330" y="118" width="360" height="2.5" rx="1.2" fill={`url(#${uid}-trail)`} />
        <rect x="-250" y="150" width="280" height="3" rx="1.5" fill={`url(#${uid}-trail)`} />
        <rect x="-390" y="184" width="420" height="2.5" rx="1.2" fill={`url(#${uid}-trail)`} />
      </g>

      {/* wheel wells, then wheels */}
      <path d={BODY} fill={`url(#${uid}-body)`} />
      <g clipPath={`url(#${uid}-wells)`}>
        <circle cx="150" cy="170" r="42" fill="#04070d" />
        <circle cx="480" cy="170" r="42" fill="#04070d" />
      </g>
      <Wheel cx={150} uid={uid} />
      <Wheel cx={480} uid={uid} />

      {/* shoulder and roof highlights */}
      <path d="M 56 128 C 190 118 400 116 556 126" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
      <path d="M 250 64 C 290 61 330 61 366 64" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" />
      <path d="M 56 168 C 200 173 400 173 592 166" fill="none" stroke="#0a2674" strokeOpacity=".55" strokeWidth="2" />

      {/* greenhouse */}
      <path d={GLASS} fill={`url(#${uid}-glass)`} stroke="#aab8d2" strokeWidth="1.5" />
      <polygon points="296,67 307,67 308,110 298,110" fill={`url(#${uid}-body)`} />
      <path d="M 190 108 L 232 72 L 254 72 L 214 108 Z" fill="#fff" opacity=".1" />
      <path d="M 330 108 L 362 72 L 372 72 L 344 108 Z" fill="#fff" opacity=".08" />

      {/* door seams, handles, sill trim */}
      <path d="M 214 110 L 210 184 M 300 110 L 297 184 M 392 112 L 400 184" stroke="#0a2a80" strokeOpacity=".75" strokeWidth="1.5" fill="none" />
      <rect x="268" y="126" width="22" height="4" rx="2" fill="#dfe8f8" opacity=".85" />
      <rect x="352" y="127" width="22" height="4" rx="2" fill="#dfe8f8" opacity=".85" />
      <path d="M 214 184 L 420 184" stroke="#cdd7ea" strokeWidth="3" strokeOpacity=".75" strokeLinecap="round" />
      <text x="222" y="156" fontFamily="Archivo, Arial, sans-serif" fontWeight="800" fontSize="11" letterSpacing="1.2" fill="#fff" fillOpacity=".88" aria-hidden="true">
        SPEEDY FIX
      </text>

      {/* front and rear lamps */}
      <path d="M 576 138 C 590 138 602 146 605 154 L 584 156 Z" fill="#eef5ff" />
      <circle data-headglow="" cx="600" cy="150" r="20" fill={`url(#${uid}-lamp)`} opacity=".55" />
      <path d="M 560 172 L 600 170 L 598 186 L 560 186 Z" fill="#06122c" opacity=".85" />
      <rect x="40" y="134" width="8" height="20" rx="3" fill="#ff3b4e" />
      <rect x="46" y="140" width="3" height="8" rx="1.5" fill="#ffb3bb" />
    </g>
  );
}

/** Standalone car, used outside the journey world (hero, CTA). */
export default function CarSvg({ className = '', glow = false, title = 'Speedy Fix car' }) {
  const uid = `car${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 20 680 210"
      className={className}
      style={{ overflow: 'visible' }}
      role="img"
      aria-label={title}
      focusable="false"
    >
      <CarArt uid={uid} glow={glow} />
    </svg>
  );
}
