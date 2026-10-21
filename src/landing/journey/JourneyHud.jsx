export const STAGES = [
  { label: 'Book', at: 0 },
  { label: 'Assign', at: 13 },
  { label: 'Track', at: 30 },
  { label: 'Service', at: 58 },
  { label: 'Return', at: 78 },
];

/** Stage indicator. Its state is updated imperatively from the master timeline (no React state per frame). */
export default function JourneyHud() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[68px] z-20 flex justify-center px-3 md:top-[84px]">
      <div className="relative rounded-full border border-white/10 bg-[#0A1226]/70 px-2 py-1.5 backdrop-blur-md sm:px-3">
        <ol className="flex items-center gap-0.5 text-xs sm:gap-2">
          {STAGES.map((s, i) => (
            <li
              key={s.label}
              data-hud-step={i}
              data-state={i === 0 ? 'active' : 'todo'}
              className="group flex items-center gap-1.5 rounded-full px-2 py-1 text-silver-dim transition-colors duration-300 data-[state=active]:bg-volt data-[state=active]:text-white data-[state=done]:text-white"
            >
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-current text-xs font-semibold leading-none">
                {i + 1}
              </span>
              <span className="hidden sm:inline group-data-[state=active]:inline">{s.label}</span>
            </li>
          ))}
        </ol>
        <div className="absolute inset-x-4 -bottom-px h-px bg-white/10">
          <div data-hud-bar="" className="h-full origin-left bg-volt-glow" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  );
}
