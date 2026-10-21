import { useState } from 'react';
import { CarFront } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminServices } from '../services';
import { EmptyState, ErrorState, Skeleton } from '../../portal/ui';
import ResponsiveTable from '../../center/features/ResponsiveTable';
import { StatusBadge } from '../features/common';
import { SearchBox, useAdminList } from '../features/common2';

export default function VehiclesPage() {
  const [text, setText] = useState('');
  const l = useAdminList(() => adminServices.vehicles.list({ query: text }), [text]);
  const cols = [
    { key: 'r', header: 'Registration', render: (v) => v.registration }, { key: 'm', header: 'Make and model', render: (v) => `${v.make} ${v.model}` },
    { key: 'c', header: 'Customer', render: (v) => v.customer }, { key: 'sc', header: 'Service centers', render: (v) => v.centers },
    { key: 'b', header: 'Latest booking', render: (v) => <Link to={`/admin/bookings/${v.latestId}`} className="text-volt-glow hover:underline">{v.latestReference}</Link> },
    { key: 's', header: 'Status', render: (v) => <StatusBadge statusKey={v.statusKey} /> }, { key: 'n', header: 'Bookings', render: (v) => v.bookings, className: 'tabular-nums' },
  ];
  return (
    <div className="space-y-5">
      <SearchBox value={text} onChange={setText} placeholder="Registration, make, model or customer" label="Search vehicles" />
      <p className="text-sm text-slate-400">Vehicles are grouped by registration number across all customers and centers.</p>
      {l.error && <ErrorState error={l.error} onRetry={l.reload} title="Could not load vehicles" />}
      {l.loading && <Skeleton className="h-48" />}
      {l.data && !l.data.length && <EmptyState icon={CarFront} title="No vehicles match">Vehicles appear once bookings exist.</EmptyState>}
      {l.data && l.data.length > 0 && <ResponsiveTable caption="Vehicles" columns={cols} rows={l.data} rowKey="registration" />}
    </div>
  );
}
