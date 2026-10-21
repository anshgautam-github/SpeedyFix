import { useMemo } from 'react';
import { WORLD } from './geometry';

// Small deterministic generator so the skyline is identical on every render.
function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Far parallax layer: night skyline sharing the world's 560-unit height. */
export function SkylineLayer({ width = WORLD.w, tile = 900, className = '', svgRef }) {
  const { blocks, lights } = useMemo(() => {
    const rand = lcg(7);
    const blocks = [];
    const lights = [];
    for (let x = 0; x < tile; ) {
      const w = 60 + rand() * 90;
      const h = 70 + rand() * 170;
      blocks.push({ x, w, h });
      for (let i = 0; i < 3; i += 1) {
        if (rand() > 0.45) lights.push({ x: x + 10 + rand() * (w - 22), y: 410 - h + 14 + rand() * (h - 40) });
      }
      x += w + 6 + rand() * 20;
    }
    return { blocks, lights };
  }, [tile]);
  const tiles = Math.ceil(width / tile);

  return (
    <svg ref={svgRef} className={className} viewBox={`0 0 ${tile * tiles} ${WORLD.h}`} preserveAspectRatio="xMinYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13234a" />
          <stop offset="1" stopColor="#0a1228" />
        </linearGradient>
      </defs>
      {Array.from({ length: tiles }, (_, t) => (
        <g key={t} transform={`translate(${t * tile} 0)`}>
          {blocks.map((b, i) => (
            <rect key={i} x={b.x} y={410 - b.h} width={b.w} height={b.h + 20} fill="url(#sky-city)" />
          ))}
          {lights.map((l, i) => (
            <rect key={i} x={l.x} y={l.y} width="5" height="7" rx="1" fill="#5BA2FF" opacity=".55" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Mid parallax layer: street lamps and trees just behind the road. */
export function MidLayer({ width = WORLD.w, tile = 520, className = '', svgRef }) {
  const tiles = Math.ceil(width / tile);
  return (
    <svg ref={svgRef} className={className} viewBox={`0 0 ${tile * tiles} ${WORLD.h}`} preserveAspectRatio="xMinYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="mid-lamp">
          <stop offset="0" stopColor="#bcd9ff" stopOpacity=".55" />
          <stop offset="1" stopColor="#3B8BFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: tiles }, (_, t) => (
        <g key={t} transform={`translate(${t * tile} 0)`}>
          {/* lamp */}
          <circle cx="90" cy="268" r="46" fill="url(#mid-lamp)" />
          <rect x="87" y="276" width="6" height="128" fill="#0d1730" />
          <path d="M 90 276 q 0 -14 18 -14" stroke="#0d1730" strokeWidth="5" fill="none" />
          <rect x="102" y="259" width="16" height="6" rx="3" fill="#cfe3ff" />
          {/* tree */}
          <rect x="342" y="338" width="8" height="66" fill="#0b1329" />
          <circle cx="346" cy="318" r="38" fill="#0c1730" />
          <circle cx="322" cy="338" r="26" fill="#0c1730" />
          <circle cx="372" cy="336" r="28" fill="#0c1730" />
          <path d="M 316 308 a 38 38 0 0 1 56 -8" stroke="#2a4a86" strokeOpacity=".5" strokeWidth="2" fill="none" />
        </g>
      ))}
    </svg>
  );
}

/** Looping dashes for the hero road. Animate with xPercent: -(100 / tiles). */
export function DashLayer({ tiles = 8, className = '' }) {
  const period = 120;
  return (
    <svg className={className} viewBox={`0 0 ${period * tiles} 8`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {Array.from({ length: tiles }, (_, i) => (
        <rect key={i} x={i * period} y="2" width="64" height="4" rx="2" fill="#C9D3E3" opacity=".7" />
      ))}
    </svg>
  );
}
