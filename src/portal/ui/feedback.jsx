import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, X } from 'lucide-react';
import { Button, InlineAlert, cx } from './primitives';
import { IS_DEMO } from '../config';

/* ---------- toasts ---------- */
const ToastCtx = createContext({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, tone: 'green', ...t }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), t.tone === 'rose' ? 7000 : 4500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur', t.tone === 'rose' ? 'border-rose-400/30 bg-[#2a0f1a]/95 text-rose-100' : 'border-emerald-400/25 bg-[#0b2220]/95 text-emerald-50')}>
            {t.tone === 'rose' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            <div className="min-w-0 flex-1"><p className="font-semibold">{t.title}</p>{t.message && <p className="opacity-85">{t.message}</p>}</div>
            <button type="button" aria-label="Dismiss" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))} className="rounded p-1 opacity-70 hover:opacity-100"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => ref.current?.querySelector('input,select,textarea,button')?.focus(), 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0A1226] shadow-2xl sm:rounded-2xl', size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md')}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-display text-lg text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Keep it', danger, loading, error, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="space-y-3 text-sm text-slate-300">
        <div>{body}</div>
        {error && <InlineAlert>{error}</InlineAlert>}
      </div>
    </Modal>
  );
}

/* ---------- empty / error / demo ---------- */
export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
      {Icon && <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-volt/10 text-volt-glow"><Icon className="h-6 w-6" aria-hidden="true" /></span>}
      <h3 className="font-display text-lg text-white">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-slate-400">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  const notReady = error?.code === 'NOT_IMPLEMENTED';
  return (
    <div role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-500/[.07] px-6 py-8 text-center">
      <AlertTriangle className="mx-auto h-7 w-7 text-rose-300" aria-hidden="true" />
      <h3 className="mt-3 font-display text-lg text-white">{notReady ? 'Backend not connected' : title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-300">{error?.message || 'Please try again.'}</p>
      {onRetry && !notReady && <Button className="mt-4" variant="secondary" size="sm" onClick={() => onRetry()}>Try again</Button>}
    </div>
  );
}

export function DemoBadge({ className }) {
  if (!IS_DEMO) return null;
  return <span className={cx('inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30', className)}><FlaskConical className="h-3 w-3" aria-hidden="true" />Demo</span>;
}

/** Use wherever simulated data or behaviour is shown. Renders nothing outside demo mode. */
export function DemoNotice({ children, className }) {
  if (!IS_DEMO) return null;
  return (
    <div className={cx('flex gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[.07] px-3.5 py-2.5 text-sm text-amber-100', className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
