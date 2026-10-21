import { Badge, cx } from '../../portal/ui';

export default function RadioChoice({ legend, name, value, onChange, options, required, error }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-white">{legend}{required ? <Badge tone="rose">Required</Badge> : <Badge>Optional</Badge>}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(([v, l]) => (
          <label key={v} className={cx('flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 text-sm focus-within:ring-2 focus-within:ring-volt/50', value === v ? 'border-volt-glow bg-volt/10 text-white' : 'border-white/10 bg-white/[.02] text-slate-300 hover:bg-white/5')}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="h-4 w-4 accent-[#1F6BFF]" />{l}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </fieldset>
  );
}
