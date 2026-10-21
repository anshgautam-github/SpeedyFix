import { Check } from 'lucide-react';

/** Wraps one scene. In the pinned journey it fills the stage; in static mode it flows normally. */
export function SceneShell({ id, staticMode, children, label }) {
  return (
    <section
      data-scene={id}
      aria-label={staticMode ? label : undefined}
      className={staticMode ? 'relative py-8 sm:py-12' : 'absolute inset-0'}
    >
      <div className="mx-auto grid h-full max-w-7xl items-center gap-3 px-4 sm:px-8 lg:grid-cols-[5fr_6fr] lg:gap-14">
        {children}
      </div>
    </section>
  );
}

/** Left column: story headline plus a short line of explanation. */
export function SceneText({ title, children, layer, part }) {
  return (
    <div data-part={part} className={`max-w-xl ${layer ? 'col-start-1 row-start-1' : ''}`}>
      <h2 className="font-display text-[clamp(1.55rem,3.5vw,3rem)] leading-[1.03] text-white">{title}</h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-silver [@media(max-height:760px)]:hidden">{children}</p>
    </div>
  );
}

export function TextLayers({ staticMode, children }) {
  return <div className={staticMode ? 'flex flex-col gap-6' : 'grid'}>{children}</div>;
}

/** Glass UI panel used for every mockup. */
export function Panel({ children, className = '', layer, part, sample = true }) {
  return (
    <div
      data-part={part}
      className={`relative w-full max-w-[34rem] justify-self-end rounded-2xl border border-white/10 bg-[#0A1226]/80 p-4 shadow-[0_30px_80px_-30px_rgba(31,107,255,.5)] backdrop-blur-md sm:p-5 ${
        layer ? 'col-start-1 row-start-1' : ''
      } ${className}`}
    >
      {children}
      {sample && <p className="mt-3 text-xs text-silver-dim">Sample data for demonstration</p>}
    </div>
  );
}

export function PanelLayers({ staticMode, children }) {
  return <div className={staticMode ? 'flex flex-col gap-6' : 'grid justify-items-end'}>{children}</div>;
}

export function Field({ label, text, className = '', icon }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 ${className}`}>
      <div className="text-xs text-silver-dim">{label}</div>
      <div className="mt-0.5 flex min-h-[1.3rem] items-center gap-1.5 text-sm text-white">
        {icon}
        <span data-type={text}>{text}</span>
      </div>
    </div>
  );
}

export function StatusRow({ label, time, className = '' }) {
  return (
    <li data-row="" className={`flex items-center gap-2.5 py-[3px] text-sm text-white ${className}`}>
      <span data-dot="" className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-[#5BA2FF] bg-volt">
        <Check data-check="" className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="flex-1">{label}</span>
      {time && <span className="text-xs tabular-nums text-silver-dim">{time}</span>}
    </li>
  );
}

export function OtpRow({ digits = '482916', waitText = 'Waiting for the code', okText }) {
  return (
    <div data-otp="">
      <div className="flex gap-1.5 sm:gap-2" role="img" aria-label={`Sample one-time code ${digits.split('').join(' ')}`}>
        {digits.split('').map((d, i) => (
          <div
            key={i}
            data-otp-box=""
            className="grid h-11 flex-1 place-items-center rounded-lg border border-[#34D399] bg-[#34D399]/10 sm:h-12"
          >
            <span data-otp-digit="" className="font-display text-xl text-white">{d}</span>
          </div>
        ))}
      </div>
      <div className="relative mt-2.5 h-7">
        <p data-otp-wait="" className="absolute inset-0 flex items-center text-xs text-silver-dim" style={{ opacity: 0, visibility: 'hidden' }}>
          {waitText}
        </p>
        <p data-otp-ok="" className="absolute inset-0 flex items-center gap-1.5 text-sm font-semibold text-ok">
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          {okText}
        </p>
      </div>
    </div>
  );
}

export function Avatar({ initials, className = '' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt-soft to-[#0b2f8f] font-display text-sm text-white ${className}`}>
      {initials}
    </span>
  );
}
