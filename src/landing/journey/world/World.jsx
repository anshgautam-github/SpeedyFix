import { CarArt, CAR_CENTER_X, CAR_GROUND_Y } from '../../components/Car';
import { BUILDING, ROAD_D, STOPS, WORLD, CAR_SCALE } from './geometry';

function House({ x, id }) {
  return (
    <g data-house={id}>
      <polygon points={`${x - 24},270 ${x + 200},192 ${x + 424},270`} fill="#14223f" />
      <path d={`M ${x - 24} 270 L ${x + 200} 192 L ${x + 424} 270`} fill="none" stroke="#3B8BFF" strokeOpacity=".45" strokeWidth="2" />
      <rect x={x} y="270" width="400" height="124" fill="#0f1a34" />
      <rect x={x} y="270" width="400" height="5" fill="#1a2a50" />
      <g data-windows="">
        <rect x={x + 40} y="306" width="64" height="48" rx="4" fill="#FFC978" opacity=".85" />
        <rect x={x + 270} y="306" width="86" height="48" rx="4" fill="#FFC978" opacity=".7" />
      </g>
      <rect x={x + 40} y="330" width="64" height="2" fill="#0f1a34" opacity=".6" />
      <rect x={x + 160} y="318" width="52" height="76" rx="4" fill="#070d1c" />
      <circle data-doorlight="" cx={x + 186} cy="330" r="64" fill="url(#w-doorglow)" opacity="0" />
      <rect x={x + 176} y="304" width="20" height="5" rx="2.5" fill="#cfe3ff" opacity=".8" />
      <rect x={x - 24} y="392" width="448" height="6" fill="#0a1226" />
    </g>
  );
}

function Figure({ x, y, phone = true, ...rest }) {
  return (
    <g transform={`translate(${x} ${y})`} {...rest}>
      <circle cx="0" cy="-48" r="7" fill="#d8e4f8" />
      <rect x="-8" y="-40" width="16" height="30" rx="7" fill="#c3d2ee" />
      <rect x="-6" y="-12" width="5" height="12" rx="2" fill="#9fb2d4" />
      <rect x="1" y="-12" width="5" height="12" rx="2" fill="#9fb2d4" />
      {phone && <rect data-phone="" x="9" y="-34" width="5" height="9" rx="1.5" fill="#8cc0ff" />}
    </g>
  );
}

function Pin({ x, label, id }) {
  return (
    <g data-pin={id} className="sf-pin" transform={`translate(${x} 150)`}>
      <path d="M 0 16 L 0 52" stroke="#5BA2FF" strokeOpacity=".5" strokeWidth="2" strokeDasharray="3 5" />
      <circle className="pin-bg" r="15" fill="#0e1a36" stroke="#5BA2FF" strokeWidth="3" />
      <circle r="5.5" fill="#cfe3ff" />
      <text y="-28" textAnchor="middle" fontFamily="Archivo, Arial, sans-serif" fontWeight="700" fontSize="28" fill="#dbe6f9">
        {label}
      </text>
    </g>
  );
}

function ServiceBay() {
  const { x, w, roofY, floorTop, floorBottom, doorTop } = BUILDING;
  const innerL = x + 40;
  const innerR = x + w - 40;
  const slats = Array.from({ length: 15 }, (_, i) => doorTop + 14 + i * 15);
  return (
    <g data-bay="">
      <defs>
        <linearGradient id="w-interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#101c3b" />
          <stop offset="1" stopColor="#0a1328" />
        </linearGradient>
        <linearGradient id="w-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16223f" />
          <stop offset="1" stopColor="#0b1326" />
        </linearGradient>
        <linearGradient id="w-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe3ff" stopOpacity=".34" />
          <stop offset="1" stopColor="#5BA2FF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="w-clip-in"><rect x={x} y={doorTop} width="40" height={floorBottom - doorTop} /></clipPath>
        <clipPath id="w-clip-out"><rect x={x + w - 40} y={doorTop} width="40" height={floorBottom - doorTop} /></clipPath>
      </defs>

      {/* interior back wall and floor */}
      <rect x={innerL} y="150" width={innerR - innerL} height={floorTop - 150} fill="url(#w-interior)" />
      <rect x={innerL} y={floorTop} width={innerR - innerL} height={floorBottom - floorTop} fill="url(#w-floor)" />
      <rect x={innerL} y={floorTop} width={innerR - innerL} height="2" fill="#27407a" />
      <rect x={innerL} y="434" width={innerR - innerL} height="3" fill="#1F6BFF" opacity=".5" />

      {/* wall monitor */}
      <rect x="3214" y="170" width="190" height="104" rx="8" fill="#070d1c" stroke="#24365f" strokeWidth="2" />
      <text x="3232" y="200" fontFamily="Archivo, Arial, sans-serif" fontWeight="700" fontSize="20" fill="#C9D3E3">WO-2041</text>
      <text x="3232" y="228" fontFamily="'Instrument Sans', Arial, sans-serif" fontSize="16" fill="#8C9BB5">Brake service</text>
      <rect x="3232" y="246" width="154" height="10" rx="5" fill="#16264a" />
      <rect data-wallbar="" x="3232" y="246" width="154" height="10" rx="5" fill="#3B8BFF" style={{ transformBox: 'fill-box', transformOrigin: 'left center', transform: 'scaleX(1)' }} />

      {/* pegboard */}
      <rect x="3800" y="176" width="172" height="124" rx="6" fill="#0c1630" stroke="#1a2a50" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={3818 + i * 30} y={196 + (i % 2) * 24} width="10" height={50 - (i % 3) * 10} rx="3" fill="#8C9BB5" opacity=".7" />
      ))}
      <circle cx="3830" cy="274" r="9" fill="none" stroke="#8C9BB5" strokeWidth="4" opacity=".7" />
      <circle cx="3870" cy="274" r="9" fill="none" stroke="#8C9BB5" strokeWidth="4" opacity=".7" />

      {/* ceiling lamps */}
      <g data-lamps="" opacity=".3">
        {[3400, 3600, 3800].map((cx) => (
          <g key={cx}>
            <polygon points={`${cx - 30},158 ${cx + 30},158 ${cx + 130},${floorTop} ${cx - 130},${floorTop}`} fill="url(#w-cone)" />
            <rect x={cx - 34} y="150" width="68" height="8" rx="4" fill="#e8f2ff" />
          </g>
        ))}
      </g>

      {/* lift */}
      <rect x="3392" y="330" width="14" height="104" fill="#1d2c52" />
      <rect x="3794" y="330" width="14" height="104" fill="#1d2c52" />
      <g data-lift="">
        <rect x="3366" y="420" width="468" height="9" rx="4" fill="#2a3d6b" />
        <rect x="3366" y="420" width="468" height="2.5" fill="#5BA2FF" />
      </g>

      {/* walls, roof and sign */}
      <rect x={x} y="150" width="40" height={doorTop - 150} fill="#0f1830" />
      <rect x={x + w - 40} y="150" width="40" height={doorTop - 150} fill="#0f1830" />
            <path d={`M ${x - 30} 150 L ${x + w + 30} 150 L ${x + w + 12} ${roofY} L ${x - 12} ${roofY} Z`} fill="#121c36" />
      <path d={`M ${x - 12} ${roofY} L ${x + w + 12} ${roofY}`} stroke="#3B8BFF" strokeOpacity=".7" strokeWidth="2" />
      <rect x="3470" y="96" width="8" height="16" fill="#1d2c52" />
      <rect x="3722" y="96" width="8" height="16" fill="#1d2c52" />
      <rect data-sign="" x="3410" y="38" width="380" height="60" rx="12" fill="#0a1226" stroke="#3B8BFF" strokeOpacity=".45" strokeWidth="2" />
      <text x="3600" y="79" textAnchor="middle" fontFamily="Archivo, Arial, sans-serif" fontWeight="800" fontSize="32" fill="#f4f7fb">
        Service center
      </text>

      {/* shutters */}
      <g clipPath="url(#w-clip-in)">
        <g data-shutter="in">
          <rect x={x} y={doorTop} width="40" height={floorBottom - doorTop} fill="#1b2a4d" />
          {slats.map((y) => (
            <rect key={y} x={x} y={y} width="40" height="2" fill="#0c1630" />
          ))}
          <rect x={x} y={floorBottom - 8} width="40" height="8" fill="#3B8BFF" opacity=".6" />
        </g>
      </g>
      <g clipPath="url(#w-clip-out)">
        <g data-shutter="out">
          <rect x={x + w - 40} y={doorTop} width="40" height={floorBottom - doorTop} fill="#1b2a4d" />
          {slats.map((y) => (
            <rect key={y} x={x + w - 40} y={y} width="40" height="2" fill="#0c1630" />
          ))}
          <rect x={x + w - 40} y={floorBottom - 8} width="40" height="8" fill="#3B8BFF" opacity=".6" />
        </g>
      </g>
    </g>
  );
}

export default function World({ svgRef, carUid }) {
  return (
    <svg
      ref={svgRef}
      className="absolute bottom-0 left-0 max-w-none"
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      style={{ willChange: 'transform' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="w-doorglow"><stop offset="0" stopColor="#cfe3ff" stopOpacity=".9" /><stop offset="1" stopColor="#5BA2FF" stopOpacity="0" /></radialGradient>
        <filter id="w-glow" x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="-300" y="470" width={WORLD.w + 600} height="120" fill="#070b14" />

      <House x={210} id="start" />
      <House x={4640} id="end" />

      {/* road: edge, asphalt, centre dashes, planned route */}
      <path d={ROAD_D} fill="none" stroke="#25345a" strokeWidth="84" />
      <path data-road="" d={ROAD_D} fill="none" stroke="#0b111f" strokeWidth="76" />
      <path d={ROAD_D} fill="none" stroke="#9fb2d4" strokeOpacity=".4" strokeWidth="3" strokeDasharray="30 26" transform="translate(0 16)" />
      <path d={ROAD_D} fill="none" stroke="#3B8BFF" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 16" transform="translate(0 -4)" />

      <ServiceBay />

      {/* travelled route, drawn on top of the road and the bay floor */}
      <path data-lit="" d={ROAD_D} fill="none" stroke="#5BA2FF" strokeWidth="6" strokeLinecap="butt" filter="url(#w-glow)" transform="translate(0 -4)" style={{ strokeDasharray: '0 99999' }} />

      <Pin x={STOPS.home} id="home" label="Pickup" />
      <Pin x={STOPS.drop} id="drop" label="Drop" />

      <Figure data-customer-start="" x={STOPS.home - 310} y={392} />
      <Figure data-customer-end="" x={STOPS.drop + 380} y={392} phone={false} />

      {/* driver on the way to the customer */}
      <g data-driver="" opacity="0">
        <circle className="sf-pulse" r="20" fill="none" stroke="#5BA2FF" strokeWidth="3" />
        <circle r="20" fill="#1F6BFF" stroke="#fff" strokeWidth="3" />
        <circle cy="-5" r="4.5" fill="#fff" />
        <path d="M -9 9 Q 0 -5 9 9 Z" fill="#fff" />
      </g>

      {/* the car: its ground-centre point is the origin, so path sampling places the wheels on the road */}
      <g data-car="">
        <g transform={`scale(${CAR_SCALE}) translate(${-CAR_CENTER_X} ${-CAR_GROUND_Y})`}>
          <CarArt uid={carUid} />
        </g>
      </g>
    </svg>
  );
}
