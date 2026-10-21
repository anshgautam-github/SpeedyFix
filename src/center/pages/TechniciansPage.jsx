import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { centerServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, EmptyState, ErrorState, InlineAlert, Modal, Skeleton, TextField, useToast } from '../../portal/ui';
import { useCenter } from '../layout/CenterContext';
import { WoBadge } from '../features/badges';

export default function TechniciansPage() {
  const { can } = useCenter();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => centerServices.technicians.list(), []);
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const manage = can('technicians.manage');

  const create = async () => {
    setBusy('add'); setErr('');
    try { await centerServices.technicians.create(f); toast.push({ title: 'Technician added', message: f.name }); setAdd(false); setF({ name: '', phone: '' }); reload(true); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const toggle = async (t) => {
    setBusy(t.id);
    try { await centerServices.technicians.setActive(t.id, !t.active); toast.push({ title: t.active ? 'Technician deactivated' : 'Technician reactivated', message: t.name }); reload(true); }
    catch (e) { toast.push({ tone: 'rose', title: 'Could not change status', message: e.message }); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-slate-400">Technicians at your center and their current workload. Technicians are managed here by the center manager.</p>{manage && <Button onClick={() => { setErr(''); setAdd(true); }}><Plus className="h-4 w-4" aria-hidden="true" />Add technician</Button>}</div>
      {error && <ErrorState error={error} onRetry={reload} title="Could not load technicians" />}
      {loading && !data && <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
      {data && !data.length && <EmptyState icon={Users} title="No technicians yet" action={manage ? <Button onClick={() => setAdd(true)}>Add a technician</Button> : null}>Add technicians so work orders can be assigned.</EmptyState>}
      {data && data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">{data.map((t) => (
          <li key={t.id}><Card className="h-full p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg text-white">{t.name}</h2>{t.phone && <p className="text-sm text-slate-400">{t.phone}</p>}</div>{t.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-400">Open assignments</dt><dd className="font-display text-xl text-white">{t.activeCount}</dd></div><div><dt className="text-xs text-slate-400">Completed</dt><dd className="font-display text-xl text-white">{t.completedCount}</dd></div></dl>
            {t.assignments.length > 0 && <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-3">{t.assignments.map((a) => <li key={a.workOrderId}><Link to={`/service-center/work-orders/${a.workOrderId}`} className="flex items-center justify-between gap-2 text-sm hover:text-volt-glow"><span className="text-slate-200">{a.registration} · {a.reference}</span><WoBadge status={a.status} /></Link></li>)}</ul>}
            {manage && <Button variant="ghost" size="sm" className="mt-3" onClick={() => toggle(t)} loading={busy === t.id}>{t.active ? 'Deactivate' : 'Reactivate'}</Button>}
          </Card></li>))}</ul>
      )}
      <Modal open={add} onClose={() => !busy && setAdd(false)} title="Add technician" footer={<><Button variant="secondary" onClick={() => setAdd(false)} disabled={busy === 'add'}>Cancel</Button><Button onClick={create} loading={busy === 'add'}>Add technician</Button></>}>
        <div className="space-y-4">{err && <InlineAlert>{err}</InlineAlert>}<TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /><TextField label="Phone (optional)" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /><p className="text-xs text-slate-400">This adds a technician record for assignments. It does not create a login.</p></div>
      </Modal>
    </div>
  );
}
