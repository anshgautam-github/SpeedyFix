import { useState } from 'react';
import { Users } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, Button, EmptyState, ErrorState, SelectField, Skeleton } from '../../portal/ui';
import { fmtDate, relativeTime } from '../../portal/lib/format';
import { roleName } from '../domain/model';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { SearchBox, useDebounced, usePagedList } from '../features/common';

const TONE = { active: 'green', approved: 'green', pending: 'amber', suspended: 'rose', rejected: 'rose', deactivated: 'slate' };

export default function UsersPage() {
  const [text, setText] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const query = useDebounced(text);
  const l = usePagedList(({ cursor }) => adminServices.users.list({ query, role, status, cursor, limit: 10 }), [query, role, status]);
  const cols = [
    { key: 'n', header: 'Name', render: (u) => u.name }, { key: 'e', header: 'Email', render: (u) => u.email },
    { key: 'r', header: 'Role', render: (u) => roleName(u) }, { key: 'c', header: 'Service center', render: (u) => u.centerName || '–' },
    { key: 's', header: 'Status', render: (u) => <Badge tone={TONE[u.status]}>{u.status}</Badge> },
    { key: 'g', header: 'Registered', render: (u) => (u.createdAt ? fmtDate(u.createdAt) : 'Not recorded') },
    { key: 'a', header: 'Last sign-in', render: (u) => (u.lastSignInAt ? relativeTime(u.lastSignInAt) : 'Not recorded') },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4"><div className="sm:col-span-2"><SearchBox value={text} onChange={setText} placeholder="Name or email" label="Search users" /></div>
        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option><option value="customer">Customers</option><option value="driver">Drivers</option><option value="center">Service center staff</option><option value="admin">Administrators</option></SelectField>
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>{['all', 'active', 'approved', 'pending', 'suspended', 'rejected', 'deactivated'].map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}</SelectField></div>
      {l.error && <ErrorState error={l.error} onRetry={() => l.reload()} title="Could not load users" />}
      {l.loading && <Skeleton className="h-48" />}
      {!l.loading && !l.error && !l.items.length && <EmptyState icon={Users} title="No users match">Try different filters.</EmptyState>}
      {!l.loading && l.items.length > 0 && <><p className="text-sm text-slate-400" aria-live="polite">{l.total} {l.total === 1 ? 'user' : 'users'}</p><ResponsiveTable caption="Users" columns={cols} rows={l.items} href={(u) => `/admin/users/${u.id}`} />{l.next != null && <div className="text-center"><Button variant="secondary" loading={l.more} onClick={l.loadMore}>Load more</Button></div>}</>}
    </div>
  );
}
