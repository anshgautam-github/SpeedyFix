import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { adminServices } from '../services';
import { Badge, EmptyState, ErrorState, Skeleton } from '../../portal/ui';
import { fmtDate } from '../../portal/lib/format';
import { useAdmin } from '../layout/AdminContext';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { SearchBox, useAdminList } from '../features/common2';

export default function CustomersPage() {
  const { can } = useAdmin();
  const [text, setText] = useState('');
  const l = useAdminList(() => adminServices.customers.list({ query: text }), [text]);
  const cols = [
    { key: 'n', header: 'Customer', render: (c) => (can('users.manage') ? <Link to={`/admin/users/${c.id}`} className="text-white hover:text-volt-glow">{c.name}</Link> : c.name) },
    { key: 'e', header: 'Email', render: (c) => c.email }, { key: 'p', header: 'Phone', render: (c) => c.phone || '–' },
    { key: 's', header: 'Status', render: (c) => <Badge tone={c.status === 'active' ? 'green' : 'slate'}>{c.status}</Badge> },
    { key: 'r', header: 'Registered', render: (c) => (c.createdAt ? fmtDate(c.createdAt) : 'Not recorded') },
    { key: 'b', header: 'Bookings', render: (c) => c.bookings, className: 'tabular-nums' }, { key: 'v', header: 'Vehicles', render: (c) => c.vehicles, className: 'tabular-nums' },
  ];
  return (
    <div className="space-y-5">
      <SearchBox value={text} onChange={setText} placeholder="Name or email" label="Search customers" />
      {l.error && <ErrorState error={l.error} onRetry={l.reload} title="Could not load customers" />}
      {l.loading && !l.data && <Skeleton className="h-48" />}
      {l.data && !l.data.length && <EmptyState icon={UserRound} title="No customers match">Customers appear after they sign up in the customer portal.</EmptyState>}
      {l.data && l.data.length > 0 && <ResponsiveTable caption="Customers" columns={cols} rows={l.data} />}
    </div>
  );
}
