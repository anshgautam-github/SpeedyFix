import { Link } from 'react-router-dom';
import { Card, cx } from './primitives';

/**
 * A real table from lg up (when the sidebar is visible and there is room), stacked cards below. The table scrolls instead of clipping. `columns`: [{ key, header, render(row), className }].
 * `href(row)` makes the first column a link; `card(row)` can replace the default mobile card.
 */
export default function ResponsiveTable({ columns, rows, rowKey = 'id', href, card, caption }) {
  return (
    <>
      <Card className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-white/10 bg-white/[.03] text-xs text-slate-400"><tr>{columns.map((c) => <th key={c.key} scope="col" className={cx('px-4 py-3 font-medium', c.className)}>{c.header}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r) => (
              <tr key={r[rowKey]} className="hover:bg-white/[.03]">
                {columns.map((c, i) => <td key={c.key} className={cx('px-4 py-3 align-top text-slate-200', c.className)}>{i === 0 && href ? <Link to={href(r)} className="font-semibold text-white hover:text-volt-glow">{c.render(r)}</Link> : c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ul className="space-y-3 lg:hidden">
        {rows.map((r) => (
          <li key={r[rowKey]}>
            {card ? card(r) : (
              <Card className="p-4">
                {columns.map((c, i) => <div key={c.key} className={cx('flex justify-between gap-3 py-1 text-sm', i === 0 && 'pb-2')}>{i === 0 ? (href ? <Link to={href(r)} className="font-display text-base text-white">{c.render(r)}</Link> : <span className="font-display text-base text-white">{c.render(r)}</span>) : <><span className="text-slate-400">{c.header}</span><span className="min-w-0 text-right text-slate-100 [overflow-wrap:anywhere]">{c.render(r)}</span></>}</div>)}
              </Card>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
