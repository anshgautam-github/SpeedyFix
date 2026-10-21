import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearWorld, seedWorld } from '../../mock';
import { useAuth } from '../auth/AuthContext';
import { IS_DEMO } from '../config';
import { notifyChanged } from '../lib/events';
import { ConfirmDialog } from './feedback';

/**
 * Shown on every portal in demo mode. It says plainly that this is a preview with mock data (not a signed-in account),
 * and lets the user restore, clear or leave the demo data.
 */
export default function PreviewBanner() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [dlg, setDlg] = useState(null);
  if (!IS_DEMO) return null;
  const run = (fn) => {
    const sess = localStorage.getItem('sf-demo:session');
    fn();
    if (sess) localStorage.setItem('sf-demo:session', sess);
    notifyChanged();
    setDlg(null);
    window.location.reload();
  };
  return (
    <div className="border-b border-amber-400/20 bg-amber-400/[.06] px-4 py-2 text-xs leading-5 text-amber-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <p><strong className="font-semibold">Preview with demo data.</strong> You are not signed in to a real account. Data stays in this browser and nothing is sent anywhere.</p>
        <span className="flex gap-3">
          <button type="button" onClick={() => setDlg('reset')} className="rounded px-1 font-medium underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Reset demo data</button>
          <button type="button" onClick={() => setDlg('clear')} className="rounded px-1 font-medium underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Clear demo data</button>
          <button type="button" onClick={async () => { await signOut(); navigate('/login', { replace: true }); }} className="rounded px-1 font-medium underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Exit preview</button>
        </span>
      </div>
      <ConfirmDialog open={dlg === 'reset'} title="Reset demo data?" confirmLabel="Reset" cancelLabel="Cancel" onConfirm={() => run(seedWorld)} onClose={() => setDlg(null)}
        body="All demo bookings, vehicles and approvals return to their starting state, and any changes you made in the preview are discarded." />
      <ConfirmDialog open={dlg === 'clear'} danger title="Clear demo data?" confirmLabel="Clear" cancelLabel="Cancel" onConfirm={() => run(clearWorld)} onClose={() => setDlg(null)}
        body="Removes every demo booking and vehicle so you can see the empty states. You can restore the demo data with Reset demo data." />
    </div>
  );
}
