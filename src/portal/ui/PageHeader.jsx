import { cx } from './primitives';

/** Page title, one-line description and primary actions. Used at the top of dashboards and list pages. */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cx('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="t-h1 text-white">{title}</h2>
        {description && <p className="t-body mt-1 max-w-2xl text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
