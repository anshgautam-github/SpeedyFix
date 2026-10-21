import { useState } from 'react';
import { Truck } from 'lucide-react';
import { centerServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { Badge, Button, EmptyState, ErrorState, Modal, Skeleton, cx } from '../../portal/ui';
import { fmtDate, fmtDateTime } from '../../portal/lib/format';
import { DELIVERY_STAGES, stageLabel } from '../domain/model';
import { useCenter } from '../layout/CenterContext';
import ResponsiveTable from '../features/ResponsiveTable';
import DeliveryRequestForm from '../features/DeliveryRequestForm';

const TONE = { ready: 'amber', awaiting_driver: 'amber', driver_assigned: 'blue', out_for_delivery: 'blue', delivered: 'green' };

export default function DeliveriesPage() {
  const { can } = useCenter();
  const [stage, setStage] = useState('all');
  const { data, error, loading, reload } = useAsync(() => centerServices.deliveries.list({ stage }), [stage]);
  usePolling(() => reload(true), 12000);
  const [req, setReq] = useState(null);
  const cols = [
    { key: 'v', header: 'Vehicle', render: (d) => <span>{d.vehicle.registration}<span className="block text-xs text-slate-400">{d.reference}</span></span> },
    { key: 'c', header: 'Customer', render: (d) => d.customer.name },
    { key: 'a', header: 'Delivery address', render: (d) => d.deliveryAddress || <span className="text-slate-400">Not requested</span> },
    { key: 't', header: 'Preferred time', render: (d) => (d.delivery ? `${fmtDate(d.delivery.date)}, ${d.delivery.slot}` : '–') },
    { key: 'd', header: 'Driver', render: (d) => d.deliveryDriver?.name || <span className="text-slate-400">Not assigned</span> },
    { key: 's', header: 'Status', render: (d) => <Badge tone={TONE[d.stage]}>{stageLabel(d.stage)}</Badge> },
    { key: 'h', header: 'Final handover', render: (d) => (d.deliveryVerified ? <span className="text-emerald-300">Verified {fmtDateTime(d.deliveredAt)}</span> : <span className="text-slate-400">Pending</span>) },
    { key: 'x', header: '', render: (d) => (d.eligible && can('delivery.request') ? <Button size="sm" onClick={() => setReq(d)}>Request delivery</Button> : null) },
  ];
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-slate-400">Vehicles that are ready to go back to customers, and deliveries in progress. Drivers complete handovers with the customer's code; the service center can only monitor them.</p>
      <div role="tablist" aria-label="Delivery stage" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">{DELIVERY_STAGES.map((s) => <button key={s.key} role="tab" aria-selected={stage === s.key} type="button" onClick={() => setStage(s.key)} className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium', stage === s.key ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>{s.label}</button>)}</div>
      {error && <ErrorState error={error} onRetry={reload} title="Could not load deliveries" />}
      {loading && !data && <Skeleton className="h-48" />}
      {data && !data.length && <EmptyState icon={Truck} title="No deliveries here">Vehicles appear after their work order passes the quality check.</EmptyState>}
      {data && data.length > 0 && <ResponsiveTable caption="Deliveries" columns={cols} rows={data} rowKey="id" />}
      <Modal open={Boolean(req)} onClose={() => setReq(null)} title="Request delivery" size="lg">{req && <DeliveryRequestForm booking={req} defaults={req.deliveryDefaults} onCancel={() => setReq(null)} onDone={() => { setReq(null); reload(true); }} />}</Modal>
    </div>
  );
}
