import { cx } from '../../../ui';

/** A real radio input inside a styled label, so keyboard and screen reader behaviour comes for free. */
export default function ChoiceCard({ name, value, checked, onChange, title, children, badge }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-volt/50', checked ? 'border-volt-glow bg-volt/10' : 'border-white/10 bg-white/[.02] hover:bg-white/5')}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="mt-1 h-4 w-4 shrink-0 accent-[#1F6BFF]" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">{title}{badge}</span>
        {children && <span className="mt-0.5 block text-sm text-slate-400">{children}</span>}
      </span>
    </label>
  );
}
