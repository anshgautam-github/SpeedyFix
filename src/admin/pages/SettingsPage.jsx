import { useEffect, useState } from 'react';
import { adminServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { Badge, Button, Card, CardHeader, ErrorState, InlineAlert, Skeleton, TextAreaField, TextField, useToast } from '../../portal/ui';
import { notifyChanged } from '../../portal/lib/events';

export default function SettingsPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => adminServices.settings.get(), []);
  const [f, setF] = useState(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ alerts: { ...data.alerts }, assignment: { ...data.assignment } }); }, [data]);
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load settings" />;
  if (loading || !f) return <Skeleton className="h-96" />;
  const a = (k) => (e) => setF({ ...f, alerts: { ...f.alerts, [k]: e.target.value } });
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await adminServices.settings.update(f, reason); setReason(''); notifyChanged(); toast.push({ title: 'Settings saved' }); reload(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {!data.canEdit && <InlineAlert tone="blue">Only a super admin can change platform settings.</InlineAlert>}
      <form onSubmit={save} noValidate className="space-y-6">
        {err && <InlineAlert>{err}</InlineAlert>}
        <Card><CardHeader title="Operational alert thresholds" /><div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <TextField label="Unassigned job after (minutes)" type="number" min="1" value={f.alerts.unassignedMinutes} onChange={a('unassignedMinutes')} disabled={!data.canEdit} />
          <TextField label="Pickup delayed after the slot ends (minutes)" type="number" min="0" value={f.alerts.pickupDelayMinutes} onChange={a('pickupDelayMinutes')} disabled={!data.canEdit} />
          <TextField label="Awaiting center receipt after (minutes)" type="number" min="1" value={f.alerts.receiptDelayMinutes} onChange={a('receiptDelayMinutes')} disabled={!data.canEdit} />
          <TextField label="Work order stalled after (hours)" type="number" min="1" value={f.alerts.stalledWorkOrderHours} onChange={a('stalledWorkOrderHours')} disabled={!data.canEdit} />
          <p className="text-xs text-slate-400 sm:col-span-2">Used to flag exceptions on the dashboard, bookings and alerts. They are operational thresholds, not guarantees to customers.</p></div></Card>
        <Card><CardHeader title="Driver assignment rules" /><div className="space-y-4 px-5 py-5">
          <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-200"><input type="checkbox" checked={f.assignment.requireOnline} onChange={(e) => setF({ ...f, assignment: { ...f.assignment, requireOnline: e.target.checked } })} disabled={!data.canEdit} className="h-4 w-4 accent-[#1F6BFF]" />Only online drivers can be assigned</label>
          <TextField label="Maximum active jobs per driver" type="number" min="1" max="10" value={f.assignment.maxActiveJobs} onChange={(e) => setF({ ...f, assignment: { ...f.assignment, maxActiveJobs: e.target.value } })} disabled={!data.canEdit} />
          <p className="text-xs text-slate-400">Drivers must also be approved and active. These rules are checked by the server when a job is assigned.</p></div></Card>
        {data.canEdit && <Card className="p-5"><TextAreaField label="Reason for the change" value={reason} onChange={(e) => setReason(e.target.value)} required hint="Recorded in the audit log with the before and after values." /><Button type="submit" className="mt-4" loading={busy}>Save settings</Button></Card>}
      </form>
      <Card><CardHeader title="Notification delivery" /><ul className="divide-y divide-white/10 text-sm">{[['In-app alerts', true], ['SMS', false], ['Email', false], ['Push notifications', false]].map(([k, on]) => <li key={k} className="flex items-center justify-between px-5 py-3"><span className="text-slate-200">{k}</span><Badge tone={on ? 'green' : 'slate'}>{on ? 'On' : 'Not configured'}</Badge></li>)}</ul><p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Outside delivery channels need an integration. None is connected, so nothing is sent.</p></Card>
      <Card><CardHeader title="Planned configuration" /><p className="px-5 py-4 text-sm text-slate-400">Booking status transition rules, service-center onboarding rules and account approval policies are enforced by the platform in this build and are not editable. Pricing, commission and payout controls are not part of this system.</p></Card>
    </div>
  );
}
