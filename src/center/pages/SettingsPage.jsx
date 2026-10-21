import { useEffect, useState } from 'react';
import { centerServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ErrorState, InlineAlert, Skeleton, TextField, useToast } from '../../portal/ui';
import { ROLE_LABEL } from '../domain/model';
import { useCenter } from '../layout/CenterContext';

const Row = ({ k, children }) => <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-slate-400">{k}</dt><dd className="text-sm text-slate-100">{children || <span className="text-slate-400">Not set</span>}</dd></div>;

export default function SettingsPage() {
  const toast = useToast();
  const { reload: reloadCenter } = useCenter();
  const { data, error, loading, reload } = useAsync(() => centerServices.settings.get(), []);
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ contact: data.contact || '', hours: data.hours || '', hourlyRate: data.hourlyRate ?? '' }); }, [data]);
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load settings" />;
  if (loading || !f) return <Skeleton className="h-96" />;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await centerServices.settings.update(f); toast.push({ title: 'Settings saved' }); reloadCenter(); reload(true); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card><CardHeader title="Service center" />
        <dl className="divide-y divide-white/10 px-5"><Row k="Name">{data.center.name}</Row><Row k="Address">{data.center.address}</Row><Row k="Account status"><Badge tone="green">Active</Badge></Row></dl>
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Name and address are your registered details and are managed by Speedy Fix. Drop bookings start from this address.</p></Card>
      <Card><CardHeader title="Contact and workshop settings" />
        <form onSubmit={save} noValidate className="space-y-4 px-5 py-5">
          {err && <InlineAlert>{err}</InlineAlert>}
          {!data.canEdit && <InlineAlert tone="blue">Only a center manager can change these settings.</InlineAlert>}
          <TextField label="Contact number" type="tel" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} disabled={!data.canEdit} />
          <TextField label="Operating hours" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} disabled={!data.canEdit} placeholder="Mon-Sat, 9:00 - 18:00" />
          <TextField label={`Default hourly labour rate (${data.currency})`} type="number" min="0" step="1" inputMode="decimal" value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: e.target.value })} disabled={!data.canEdit} hint="Used when labour is recorded without a rate. Leave empty if you do not want a default." />
          {data.canEdit && <Button type="submit" loading={busy}>Save settings</Button>}
        </form></Card>
      <Card><CardHeader title="Staff" />
        <ul className="divide-y divide-white/10">{data.staff.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"><span><span className="block text-sm text-white">{s.name}</span><span className="text-xs text-slate-400">{s.email}</span></span><span className="flex gap-2"><Badge tone="blue">{ROLE_LABEL[s.staffRole]}</Badge><Badge tone="green">Active</Badge></span></li>)}</ul>
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Staff accounts are created by an administrator through the authentication provider. This build does not create logins.</p></Card>
    </div>
  );
}
