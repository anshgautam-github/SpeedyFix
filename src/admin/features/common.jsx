import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, Button, InlineAlert, Modal, TextAreaField, cx } from '../../portal/ui';
import { SEVERITY_TONE, STATUS_TONE, FLAG_LABEL, statusLabel } from '../domain/model';

export const StatusBadge = ({ statusKey }) => <Badge tone={STATUS_TONE[statusKey] || 'slate'}>{statusLabel(statusKey)}</Badge>;
export const FlagBadges = ({ flags }) => (flags?.length ? <span className="flex flex-wrap gap-1">{[...new Map(flags.map((f) => [f.type, f])).values()].map((f) => <Badge key={f.type} tone={SEVERITY_TONE[f.severity]}>{FLAG_LABEL[f.type]}</Badge>)}</span> : null);

export function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label || placeholder} className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-volt-glow focus:outline-none focus:ring-2 focus:ring-volt/40" /></div>
  );
}

export function Chips({ options, value, onChange, label }) {
  return <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">{options.map((o) => <button key={o.key} role="tab" aria-selected={value === o.key} type="button" onClick={() => onChange(o.key)} className={cx('min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium', value === o.key ? 'bg-volt text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>{o.label}</button>)}</div>;
}

/** Paged list loader with a stale-response guard: pass a fetcher that takes {cursor} and a dependency list. */
export function usePagedList(fetcher, deps) {
  const [state, setState] = useState({ items: [], total: 0, next: null, loading: true, more: false, error: null });
  const req = useRef(0);
  const ref = useRef(fetcher); ref.current = fetcher;
  const load = useCallback(async ({ cursor = 0, append = false, silent = false } = {}) => {
    const id = ++req.current;
    if (!silent) setState((s) => ({ ...s, loading: !append, more: append, error: null }));
    try { const r = await ref.current({ cursor }); if (id === req.current) setState((s) => ({ items: append ? [...s.items, ...r.items] : r.items, total: r.total, next: r.nextCursor, loading: false, more: false, error: null })); }
    catch (error) { if (id === req.current) setState((s) => ({ ...s, loading: false, more: false, error })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: (silent) => load({ silent }), loadMore: () => load({ cursor: state.next, append: true }) };
}
export const useDebounced = (v, ms = 300) => { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; };

/** Confirmation dialog that requires a written reason. The reason is stored in the audit log by the server. */
export function ReasonDialog({ open, title, body, confirmLabel = 'Confirm', danger, optional = false, onConfirm, onClose, extra }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setError(''); setBusy(false); } }, [open]);
  const go = async () => {
    if (!optional && !reason.trim()) { setError('A reason is required. It is recorded in the audit log.'); return; }
    setBusy(true); setError('');
    try { await onConfirm(reason.trim()); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={go} loading={busy}>{confirmLabel}</Button></>}>
      <div className="space-y-4"><div className="text-sm text-slate-300">{body}</div>{extra}{error && <InlineAlert>{error}</InlineAlert>}
        <TextAreaField label={optional ? 'Reason (optional)' : 'Reason'} value={reason} onChange={(e) => setReason(e.target.value)} required={!optional} /></div>
    </Modal>
  );
}
