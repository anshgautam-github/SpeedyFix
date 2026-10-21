import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, Card, EmptyState, ErrorState, InlineAlert, SelectField, Skeleton } from '../../portal/ui';
import { fmtDateTime } from '../../portal/lib/format';
import { SearchBox, useDebounced, usePagedList } from '../features/common';

const GROUPS = ['all', 'user', 'driver', 'center', 'booking', 'assignment', 'handover', 'settings', 'report', 'alert', 'demo'];
const show = (v) => (v == null ? '–' : typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${x ?? '–'}`).join(', ') : String(v));

export default function AuditLogsPage() {
  const [text, setText] = useState('');
  const [action, setAction] = useState('all');
  const query = useDebounced(text);
  const l = usePagedList(({ cursor }) => adminServices.audit.list({ query, action, cursor, limit: 15 }), [query, action]);
  return (
    <div className="space-y-5">
      <InlineAlert tone="blue">Entries are written by the server when an action happens and cannot be edited or deleted from this portal. Passwords, tokens and handover codes are never recorded.</InlineAlert>
      <div className="grid gap-3 sm:grid-cols-3"><div className="sm:col-span-2"><SearchBox value={text} onChange={setText} placeholder="Admin, action, record or reason" label="Search audit log" /></div><SelectField label="Action type" value={action} onChange={(e) => setAction(e.target.value)}>{GROUPS.map((g) => <option key={g} value={g}>{g === 'all' ? 'All actions' : g}</option>)}</SelectField></div>
      {l.error && <ErrorState error={l.error} onRetry={() => l.reload()} title="Could not load the audit log" />}
      {l.loading && <Skeleton className="h-48" />}
      {!l.loading && !l.error && !l.items.length && <EmptyState icon={ScrollText} title="No audit entries">Administrative actions are recorded here.</EmptyState>}
      {l.items.length > 0 && <><p className="text-sm text-slate-400" aria-live="polite">{l.total} {l.total === 1 ? 'entry' : 'entries'}</p><ul className="space-y-2">{l.items.map((a) => (
        <li key={a.id}><Card className="p-4"><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{a.action}</Badge><span className="text-sm text-white">{a.adminName}</span><Badge>{a.adminLevel}</Badge><span className="ml-auto text-xs text-slate-400">{fmtDateTime(a.at)}</span></div>
          <p className="mt-2 text-sm text-slate-300">Record: {a.entity} <span className="font-mono text-xs text-slate-400">{a.entityId}</span></p>
          {a.reason && <p className="mt-1 text-sm text-slate-300">Reason: {a.reason}</p>}
          {(a.before || a.after) && <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg bg-white/[.04] p-2"><dt className="text-slate-400">Before</dt><dd className="text-slate-200">{show(a.before)}</dd></div><div className="rounded-lg bg-white/[.04] p-2"><dt className="text-slate-400">After</dt><dd className="text-slate-200">{show(a.after)}</dd></div></dl>}</Card></li>))}</ul>{l.next != null && <div className="text-center"><Button variant="secondary" loading={l.more} onClick={l.loadMore}>Load more</Button></div>}</>}
    </div>
  );
}
