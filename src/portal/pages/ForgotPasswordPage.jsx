import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, InlineAlert, TextField } from '../ui';
import { isEmail } from '../lib/validate';
import { AuthFrame, PORTALS } from '../auth/AuthScreen';
import { LOGIN_FOR, useAuth } from '../auth/AuthContext';

/** Password reset form. It validates the email but cannot send anything: no account or email service exists yet. */
export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const portal = PORTALS[params.get('portal')] ? params.get('portal') : 'customer';
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const err = !email.trim() ? 'Enter your email address.' : !isEmail(email) ? 'Enter a valid email address, like name@example.com.' : '';
    setError(err); setNotice('');
    if (err) return;
    setBusy(true);
    try { await requestPasswordReset({ email: email.trim() }); } catch (x) { setNotice(x.message); } finally { setBusy(false); }
  };
  return (
    <AuthFrame portal={portal}>
      <h1 className="t-h1 text-white">Reset your password</h1>
      <p className="t-body mt-2 text-slate-400">Enter the email address for your account and we will help you set a new password.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {notice && <div aria-live="assertive"><InlineAlert tone="amber" title="Not available yet">{notice}</InlineAlert></div>}
        <TextField label="Email address" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
        <Button type="submit" size="lg" className="w-full" loading={busy}>{busy ? 'Sending' : 'Send reset link'}</Button>
      </form>
      <p className="t-small mt-6 text-center text-slate-400"><Link to={LOGIN_FOR[portal]} className="font-semibold text-volt-glow hover:underline">Back to sign in</Link></p>
    </AuthFrame>
  );
}
