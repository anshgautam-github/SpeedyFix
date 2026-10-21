import { useRef } from 'react';
import { cx } from './primitives';

/** Six separate digit boxes with paste, arrow and backspace handling. Value is a string of up to `length` digits. */
export default function OtpInput({ value, onChange, length = 6, disabled, invalid, onComplete, label = 'Verification code' }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');
  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  const commit = (next) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <div role="group" aria-label={label} className="flex gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`${label}, digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1);
            if (!c) return;
            commit((value.slice(0, i) + c + value.slice(i + 1)).slice(0, length));
            focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (d) commit(value.slice(0, i) + value.slice(i + 1));
              else { commit(value.slice(0, Math.max(0, i - 1))); focus(i - 1); }
            } else if (e.key === 'ArrowLeft') focus(i - 1);
            else if (e.key === 'ArrowRight') focus(i + 1);
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!t) return;
            e.preventDefault();
            commit(t);
            focus(t.length);
          }}
          className={cx('h-12 min-w-0 flex-1 rounded-xl border bg-white/[.04] text-center font-display text-xl text-white transition-colors focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40 disabled:opacity-60 sm:h-14',
            invalid ? 'border-rose-400/70' : d ? 'border-volt/60' : 'border-white/15')}
        />
      ))}
    </div>
  );
}
