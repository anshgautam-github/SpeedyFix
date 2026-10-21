import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, InlineAlert, SelectField, TextField, useToast } from '../../portal/ui';
import { centerServices } from '../services';
import { notifyChanged } from '../../portal/lib/events';
import { money } from '../domain/model';

/** Labour and parts for one work order. Totals are computed by the server from the stored rate, hours, quantity and price. */
export default function LabourParts({ wo, technicians, defaultRate, onChanged }) {
  const toast = useToast();
  const [lab, setLab] = useState({ technicianId: wo.technician?.id || '', hours: '', rate: '', description: '' });
  const [part, setPart] = useState({ description: '', qty: '1', unitPrice: '' });
  const [errs, setErrs] = useState({ lab: '', part: '' });
  const [busy, setBusy] = useState('');
  const run = async (kind, fn, reset) => {
    setBusy(kind); setErrs((e) => ({ ...e, [kind]: '' }));
    try { const u = await fn(); notifyChanged(); onChanged(u); reset?.(); } catch (e) { setErrs((x) => ({ ...x, [kind]: e.message })); } finally { setBusy(''); }
  };
  const del = (kind, fn) => run(kind, fn);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader title="Labour" />
        <div className="px-5 py-4">
          {wo.labour.length ? (
            <ul className="divide-y divide-white/10 text-sm">{wo.labour.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-2.5"><span><span className="block text-slate-100">{l.description || 'Labour'}</span><span className="text-xs text-slate-400">{l.technicianName} · {l.hours} h × {money(l.rate)}</span></span>
                <span className="flex items-center gap-2"><span className="tabular-nums text-white">{money(l.total)}</span>{wo.editable && <button type="button" aria-label="Remove labour entry" onClick={() => del('lab', () => centerServices.workOrders.removeLabour(wo.id, l.id))} className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-300"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}</span></li>))}</ul>
          ) : <p className="py-3 text-sm text-slate-400">No labour recorded yet.</p>}
          <p className="mt-2 flex justify-between border-t border-white/10 pt-3 text-sm"><span className="text-slate-300">Total labour ({wo.totals.labourHours} h)</span><span className="font-display text-white tabular-nums">{money(wo.totals.labour)}</span></p>
          {wo.editable && (
            <form className="mt-4 space-y-3 border-t border-white/10 pt-4" noValidate onSubmit={(e) => { e.preventDefault(); run('lab', () => centerServices.workOrders.addLabour(wo.id, lab), () => setLab({ ...lab, hours: '', description: '' })); }}>
              {errs.lab && <InlineAlert>{errs.lab}</InlineAlert>}
              <SelectField label="Technician" value={lab.technicianId} onChange={(e) => setLab({ ...lab, technicianId: e.target.value })}><option value="">Select technician</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</SelectField>
              <div className="grid grid-cols-2 gap-3"><TextField label="Hours worked" type="number" step="0.25" min="0" inputMode="decimal" value={lab.hours} onChange={(e) => setLab({ ...lab, hours: e.target.value })} /><TextField label="Hourly rate" type="number" step="1" min="0" inputMode="decimal" value={lab.rate} onChange={(e) => setLab({ ...lab, rate: e.target.value })} placeholder={defaultRate != null ? String(defaultRate) : 'Required'} hint={defaultRate != null ? 'Leave blank for the center rate.' : 'No center rate is set.'} /></div>
              <TextField label="Description" value={lab.description} onChange={(e) => setLab({ ...lab, description: e.target.value })} />
              <Button type="submit" variant="secondary" loading={busy === 'lab'}>Add labour</Button>
            </form>
          )}
        </div></Card>

      <Card><CardHeader title="Parts used" />
        <div className="px-5 py-4">
          {wo.parts.length ? (
            <ul className="divide-y divide-white/10 text-sm">{wo.parts.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2.5"><span><span className="block text-slate-100">{p.description}</span><span className="text-xs text-slate-400">{p.qty} × {money(p.unitPrice)}</span></span>
                <span className="flex items-center gap-2"><span className="tabular-nums text-white">{money(p.total)}</span>{wo.editable && <button type="button" aria-label="Remove part" onClick={() => del('part', () => centerServices.workOrders.removePart(wo.id, p.id))} className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-300"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}</span></li>))}</ul>
          ) : <p className="py-3 text-sm text-slate-400">No parts recorded yet.</p>}
          <p className="mt-2 flex justify-between border-t border-white/10 pt-3 text-sm"><span className="text-slate-300">Total parts</span><span className="font-display text-white tabular-nums">{money(wo.totals.parts)}</span></p>
          {wo.editable && (
            <form className="mt-4 space-y-3 border-t border-white/10 pt-4" noValidate onSubmit={(e) => { e.preventDefault(); run('part', () => centerServices.workOrders.addPart(wo.id, part), () => setPart({ description: '', qty: '1', unitPrice: '' })); }}>
              {errs.part && <InlineAlert>{errs.part}</InlineAlert>}
              <TextField label="Part description" value={part.description} onChange={(e) => setPart({ ...part, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3"><TextField label="Quantity" type="number" min="1" step="1" inputMode="numeric" value={part.qty} onChange={(e) => setPart({ ...part, qty: e.target.value })} /><TextField label="Unit price" type="number" min="0" step="0.01" inputMode="decimal" value={part.unitPrice} onChange={(e) => setPart({ ...part, unitPrice: e.target.value })} /></div>
              <Button type="submit" variant="secondary" loading={busy === 'part'}>Add part</Button>
            </form>
          )}
        </div></Card>

      <Card className="lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="text-sm text-slate-300">Workshop cost record</p><p className="text-xs text-slate-400">Labour plus parts. No tax, discount or payment status is recorded, and no payment has been collected.</p></div><p className="font-display text-2xl text-white tabular-nums">{money(wo.totals.total)}</p></div></Card>
    </div>
  );
}
