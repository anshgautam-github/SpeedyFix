import { forwardRef, useId } from 'react';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const BTN = {
  primary: 'bg-volt text-white hover:bg-volt-soft shadow-[0_8px_24px_-10px_rgba(31,107,255,.9)] disabled:shadow-none',
  secondary: 'border border-white/15 bg-white/[.03] text-white hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
};
const SIZE = { sm: 'min-h-[40px] px-3 text-sm', md: 'min-h-[44px] px-4 text-sm', lg: 'min-h-[48px] px-5 text-base' };

export const Button = forwardRef(function Button(
  { as: As = 'button', variant = 'primary', size = 'md', loading = false, disabled, className, children, ...rest },
  ref
) {
  const isButton = As === 'button';
  return (
    <As
      ref={ref}
      {...(isButton ? { type: rest.type || 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-glow disabled:cursor-not-allowed disabled:opacity-50',
        BTN[variant],
        SIZE[size],
        className
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </As>
  );
});

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('rounded-2xl border border-white/10 bg-[#0A1226]/90 shadow-[0_20px_50px_-30px_rgba(0,0,0,.8)]', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4', className)}>
      <h2 className="font-display text-base text-white">{title}</h2>
      {action}
    </div>
  );
}

const TONE = {
  blue: 'bg-volt/15 text-volt-glow ring-volt/30',
  green: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25',
  amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
  rose: 'bg-rose-400/10 text-rose-300 ring-rose-400/25',
  slate: 'bg-white/5 text-slate-300 ring-white/10',
};
export function Badge({ tone = 'slate', className, children }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONE[tone], className)}>{children}</span>;
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-lg bg-white/[.07]', className)} aria-hidden="true" />;
}

const fieldBase =
  'w-full rounded-xl border bg-white/[.04] px-3.5 py-2.5 text-base text-white placeholder:text-slate-400 transition-colors focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40 disabled:opacity-60';

/** Label, control, hint and error wired together with the right aria attributes. */
function FieldShell({ label, hint, error, required, id, children, className }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-rose-300" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
const aria = (id, error, hint) => ({ 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined });

export const TextField = forwardRef(function TextField({ label, hint, error, required, className, inputClassName, right, ...rest }, ref) {
  const id = useId();
  return (
    <FieldShell {...{ label, hint, error, required, id, className }}>
      <div className="relative">
        <input ref={ref} id={id} required={required} {...aria(id, error, hint)} className={cx(fieldBase, error ? 'border-rose-400/60' : 'border-white/10', right && 'pr-11', inputClassName)} {...rest} />
        {right}
      </div>
    </FieldShell>
  );
});

export function SelectField({ label, hint, error, required, className, children, ...rest }) {
  const id = useId();
  return (
    <FieldShell {...{ label, hint, error, required, id, className }}>
      <select id={id} required={required} {...aria(id, error, hint)} className={cx(fieldBase, error ? 'border-rose-400/60' : 'border-white/10', '[&>option]:bg-[#0A1226]')} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, required, className, ...rest }) {
  const id = useId();
  return (
    <FieldShell {...{ label, hint, error, required, id, className }}>
      <textarea id={id} rows={3} {...aria(id, error, hint)} className={cx(fieldBase, error ? 'border-rose-400/60' : 'border-white/10', 'resize-y')} {...rest} />
    </FieldShell>
  );
}

export function InlineAlert({ tone = 'rose', title, children, className }) {
  const t = { rose: 'border-rose-400/30 bg-rose-500/10 text-rose-100', amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100', green: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100', blue: 'border-volt/30 bg-volt/10 text-blue-100' }[tone];
  return (
    <div role={tone === 'rose' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-sm', t, className)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>
    </div>
  );
}
