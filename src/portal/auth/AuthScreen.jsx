import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, Navigation, ShieldCheck, Wrench, Truck, Building2, BarChart3 } from 'lucide-react';
import Logo from '../../landing/components/Logo';
import { Button, GoogleButton, InlineAlert, PasswordField, TextField, cx } from '../ui';
import { IS_DEMO } from '../config';
import { isEmail } from '../lib/validate';
import { LOGIN_FOR, homeFor, useAuth } from './AuthContext';

/** Copy and options for each portal's sign-in screen. Routing between portals is unchanged. */
export const PORTALS = {
  customer: {
    label: 'Customer', title: 'Welcome back', blurb: 'Sign in to book pickups, follow your vehicle and manage your bookings.',
    side: 'Your vehicle journey, all in one place.', points: [[Navigation, 'Book a pickup and follow every stage.'], [ShieldCheck, 'Confirm handovers with a one-time code.'], [Wrench, 'See service progress and arrange delivery.']],
    register: { text: 'New to Speedy Fix?', label: 'Create an account', to: '/signup' }, preview: [{ label: 'Preview the customer portal', sub: 'as Priya Raman', level: undefined }],
  },
  driver: {
    label: 'Driver', title: 'Driver sign in', blurb: 'Sign in to see your assigned jobs and complete verified handovers.',
    side: 'Collect, deliver, verify.', points: [[Truck, 'See only the jobs assigned to you.'], [ShieldCheck, 'Verify each handover with the customer’s code.'], [Navigation, 'Open addresses in your maps app.']],
    register: { note: 'Drivers are onboarded by Speedy Fix operations. There is no self-registration.' }, preview: [{ label: 'Preview the driver portal', sub: 'as Karthik S.', level: undefined }],
  },
  center: {
    label: 'Service center', title: 'Service center sign in', blurb: 'Sign in to manage bookings, work orders and deliveries for your workshop.',
    side: 'Your workshop handles the service. We handle the journey.', points: [[Building2, 'Receive vehicles and open work orders.'], [Wrench, 'Track labour, parts and quality checks.'], [Truck, 'Request deliveries back to customers.']],
    register: { text: 'Want to partner with Speedy Fix?', label: 'Become a partner', href: '/#partner' }, preview: [{ label: 'Preview as center manager', sub: 'Anita Rao', level: 'manager' }, { label: 'Preview as service advisor', sub: 'Vikram Shah', level: 'advisor' }],
  },
  admin: {
    label: 'Admin', title: 'Administrator sign in', blurb: 'Platform operations for authorized Speedy Fix staff.',
    side: 'Central operations for the whole platform.', points: [[BarChart3, 'Monitor bookings, drivers and centers.'], [Truck, 'Dispatch drivers and resolve exceptions.'], [ShieldCheck, 'Approvals and an audit trail for every change.']],
    register: { note: 'Administrator accounts are created by the platform team.' }, preview: [{ label: 'Preview as super admin', sub: 'Platform Admin', level: 'super' }, { label: 'Preview as operations', sub: 'Operations Lead', level: 'operations' }],
  },
};

function PortalSwitcher({ current }) {
  return (
    <nav aria-label="Other Speedy Fix portals" className="mt-6 text-center text-xs text-slate-400">
      <span>Other portals: </span>
      {Object.entries(PORTALS).filter(([k]) => k !== current).map(([k, p], i, arr) => (
        <span key={k}><Link to={LOGIN_FOR[k]} className="rounded px-1 font-medium text-slate-200 underline-offset-2 hover:text-white hover:underline">{p.label}</Link>{i < arr.length - 1 ? ' · ' : ''}</span>
      ))}
    </nav>
  );
}

/** Two-column auth layout shared by sign-in, sign-up and password reset. */
export function AuthFrame({ portal, children }) {
  const p = PORTALS[portal];
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/10 lg:sticky lg:top-0 lg:h-screen bg-[radial-gradient(90%_60%_at_20%_0%,rgba(31,107,255,.28),transparent_60%),linear-gradient(180deg,#0a1328,#060a13)] p-12 lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-3" aria-label="Speedy Fix Auto Assists, home"><Logo className="h-11 w-11" /><span className="font-display text-xl text-white">Speedy Fix</span></Link>
        <div className="mt-auto max-w-md pb-6">
          <p className="text-sm font-medium text-volt-glow">{p.label} portal</p>
          <h2 className="t-display mt-2 text-white">{p.side}</h2>
          <ul className="mt-8 space-y-4">{p.points.map(([Icon, text]) => <li key={text} className="flex items-start gap-3 text-slate-300"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-volt/15 text-volt-glow"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span><span className="t-body pt-1.5">{text}</span></li>)}</ul>
        </div>
      </aside>
      <main id="main" className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[26rem]">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden" aria-label="Speedy Fix Auto Assists, home"><Logo className="h-9 w-9" /><span className="font-display text-lg text-white">Speedy Fix</span></Link>
          {children}
          <PortalSwitcher current={portal} />
        </div>
      </main>
    </div>
  );
}

export const OrDivider = () => (
  <div className="my-5 flex items-center gap-3" role="separator" aria-label="or"><span className="h-px flex-1 bg-white/10" /><span className="text-xs font-medium text-slate-400" aria-hidden="true">OR</span><span className="h-px flex-1 bg-white/10" /></div>
);

/** Honest result of a sign-in attempt in a build with no account system. It is never styled as success. */
function NotConfigured({ children }) {
  return <InlineAlert tone="amber" title="Not available yet">{children}</InlineAlert>;
}

export default function AuthScreen({ portal }) {
  const p = PORTALS[portal];
  const { signIn, signInWithGoogle, enterPreview } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(''); // '', 'email', 'google', or 'preview'
  const [notice, setNotice] = useState('');

  const attempt = async (kind, fn) => {
    setBusy(kind); setNotice('');
    try { await fn(); } catch (e) { setNotice(e.message); } finally { setBusy(''); }
  };
  const submit = (e) => {
    e.preventDefault();
    const next = { email: !f.email.trim() ? 'Enter your email address.' : !isEmail(f.email) ? 'Enter a valid email address, like name@example.com.' : '', password: f.password ? '' : 'Enter your password.' };
    setErrors(next);
    if (next.email || next.password) return;
    attempt('email', () => signIn({ email: f.email.trim(), password: f.password })).then(() => setF((x) => ({ ...x, password: '' })));
  };
  const preview = (level) => attempt('preview', async () => { const s = await enterPreview(portal, level); navigate(homeFor(s.user), { replace: true }); });

  return (
    <AuthFrame portal={portal}>
      <h1 className="t-h1 text-white">{p.title}</h1>
      <p className="t-body mt-2 text-slate-400">{p.blurb}</p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-4" aria-describedby={notice ? 'auth-notice' : undefined}>
        {notice && <div id="auth-notice" aria-live="assertive"><NotConfigured>{notice}</NotConfigured></div>}
        <TextField label="Email address" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} required />
        <div>
          <PasswordField label="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} required />
          <div className="mt-2 text-right"><Link to={`/forgot-password?portal=${portal}`} className="text-sm font-medium text-volt-glow underline-offset-2 hover:underline">Forgot password?</Link></div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy === 'email'} disabled={Boolean(busy) && busy !== 'email'}>{busy === 'email' ? 'Signing in' : 'Sign in'}</Button>
      </form>

      <OrDivider />
      <GoogleButton loading={busy === 'google'} disabled={Boolean(busy) && busy !== 'google'} onClick={() => attempt('google', signInWithGoogle)} />

      <p className="t-small mt-6 text-center text-slate-400">
        {p.register.label ? <>{p.register.text} {p.register.to ? <Link to={p.register.to} className="font-semibold text-volt-glow hover:underline">{p.register.label}</Link> : <a href={p.register.href} className="font-semibold text-volt-glow hover:underline">{p.register.label}</a>}</> : p.register.note}
      </p>

      {IS_DEMO && enterPreview && (
        <section aria-labelledby="preview-h" className="mt-8 rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/[.04] p-4">
          <h2 id="preview-h" className="flex items-center gap-2 text-sm font-semibold text-amber-100"><FlaskConical className="h-4 w-4 text-amber-300" aria-hidden="true" />Preview with demo data</h2>
          <p className="mt-1 text-sm leading-5 text-amber-100/80">This is not a sign-in. It opens this portal with mock data stored only in your browser, so you can explore the interface.</p>
          <div className="mt-3 flex flex-col gap-2">
            {p.preview.map((o) => (
              <Button key={o.label} variant="secondary" className="w-full justify-between" loading={busy === 'preview'} disabled={Boolean(busy) && busy !== 'preview'} onClick={() => preview(o.level)}>
                <span>{o.label}</span><span className="text-xs font-normal text-slate-400">{o.sub}</span>
              </Button>
            ))}
          </div>
        </section>
      )}
    </AuthFrame>
  );
}
