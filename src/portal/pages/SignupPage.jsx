import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, GoogleButton, InlineAlert, PasswordField, TextField, cx } from '../ui';
import { isEmail, isPhone, passwordProblems } from '../lib/validate';
import { AuthFrame, OrDivider } from '../auth/AuthScreen';
import { useAuth } from '../auth/AuthContext';

/** Registration form. It validates input but cannot create an account: no account system exists yet. */
export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const rules = [['At least 8 characters', f.password.length >= 8], ['A letter', /[A-Za-z]/.test(f.password)], ['A number', /\d/.test(f.password)]];
  const attempt = async (kind, fn) => { setBusy(kind); setNotice(''); try { await fn(); } catch (e) { setNotice(e.message); } finally { setBusy(''); } };
  const submit = (e) => {
    e.preventDefault();
    const next = {
      name: f.name.trim() ? '' : 'Enter your full name.',
      email: !f.email.trim() ? 'Enter your email address.' : !isEmail(f.email) ? 'Enter a valid email address, like name@example.com.' : '',
      phone: !f.phone.trim() ? 'Enter a phone number so drivers can reach you.' : !isPhone(f.phone) ? 'Enter a valid phone number.' : '',
      password: passwordProblems(f.password).length ? 'Choose a stronger password.' : '',
      confirm: f.confirm !== f.password ? 'Passwords do not match.' : '',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    attempt('email', () => signUp({ name: f.name, email: f.email, phone: f.phone, password: f.password })).then(() => setF((x) => ({ ...x, password: '', confirm: '' })));
  };
  return (
    <AuthFrame portal="customer">
      <h1 className="t-h1 text-white">Create your account</h1>
      <p className="t-body mt-2 text-slate-400">Book pickups and follow every step of your service.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {notice && <div aria-live="assertive"><InlineAlert tone="amber" title="Not available yet">{notice}</InlineAlert></div>}
        <TextField label="Full name" autoComplete="name" value={f.name} onChange={set('name')} error={errors.name} required />
        <TextField label="Email address" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={set('email')} error={errors.email} required />
        <TextField label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={errors.phone} hint="Used for pickup and delivery coordination." required />
        <PasswordField label="Password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} required />
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">{rules.map(([t, ok]) => <li key={t} className={cx(ok ? 'text-emerald-300' : 'text-slate-400')}>{ok ? '✓' : '○'} {t}</li>)}</ul>
        <PasswordField label="Confirm password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} required />
        <Button type="submit" size="lg" className="w-full" loading={busy === 'email'} disabled={Boolean(busy) && busy !== 'email'}>{busy === 'email' ? 'Creating account' : 'Create account'}</Button>
      </form>
      <OrDivider />
      <GoogleButton label="Sign up with Google" loading={busy === 'google'} disabled={Boolean(busy) && busy !== 'google'} onClick={() => attempt('google', signInWithGoogle)} />
      <p className="t-small mt-6 text-center text-slate-400">Already have an account? <Link to="/login" className="font-semibold text-volt-glow hover:underline">Sign in</Link></p>
    </AuthFrame>
  );
}
