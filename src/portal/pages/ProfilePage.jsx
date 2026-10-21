import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { services } from '../services';
import { useAsync } from '../hooks/useAsync';
import { Button, Card, CardHeader, ErrorState, InlineAlert, SelectField, Skeleton, TextField, useToast } from '../ui';
import { isPhone, passwordProblems } from '../lib/validate';

function Details() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => services.profile.get(), []);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  useEffect(() => { if (data) setF({ name: data.name, phone: data.phone, preferredContact: data.preferredContact, addresses: data.addresses.map((a) => ({ ...a })) }); }, [data]);

  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load your profile" />;
  if (loading || !f) return <Skeleton className="h-96" />;

  const setAddr = (i, k) => (e) => setF((x) => ({ ...x, addresses: x.addresses.map((a, j) => (j === i ? { ...a, [k]: e.target.value } : a)) }));
  const submit = async (e) => {
    e.preventDefault();
    const next = { name: f.name.trim() ? '' : 'Enter your name.', phone: f.phone && !isPhone(f.phone) ? 'Enter a valid phone number.' : '' };
    f.addresses.forEach((a, i) => { if (!a.label?.trim() || !a.address?.trim()) next[`addr${i}`] = 'Give each saved address a label and an address.'; });
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true); setMsg({ type: '', text: '' });
    try { await services.profile.update(f); toast.push({ title: 'Profile saved' }); setMsg({ type: 'green', text: 'Your changes are saved.' }); }
    catch (err) { setMsg({ type: 'rose', text: err.message }); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title="Personal details" />
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5">
        {msg.text && <InlineAlert tone={msg.type}>{msg.text}</InlineAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} autoComplete="name" required />
          <TextField label="Email" value={data.email} readOnly disabled hint="Your sign-in email is managed by your account provider." />
          <TextField label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} autoComplete="tel" />
          <SelectField label="Preferred contact method" value={f.preferredContact} onChange={(e) => setF({ ...f, preferredContact: e.target.value })} hint="Your preference. It does not switch on any messaging by itself.">
            <option value="phone">Phone call</option><option value="email">Email</option>
          </SelectField>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-200">Saved addresses</legend>
          {f.addresses.map((a, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-white/10 bg-white/[.02] p-3 sm:grid-cols-[8rem_1fr_7rem_6rem_auto] sm:items-end">
              <TextField label="Label" value={a.label || ''} onChange={setAddr(i, 'label')} placeholder="Home" />
              <TextField label="Address" value={a.address || ''} onChange={setAddr(i, 'address')} />
              <TextField label="City" value={a.city || ''} onChange={setAddr(i, 'city')} />
              <TextField label="Postal code" value={a.postalCode || ''} onChange={setAddr(i, 'postalCode')} />
              <Button variant="ghost" size="sm" onClick={() => setF((x) => ({ ...x, addresses: x.addresses.filter((_, j) => j !== i) }))} aria-label={`Remove saved address ${i + 1}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
              {errors[`addr${i}`] && <p role="alert" className="text-xs text-rose-300 sm:col-span-5">{errors[`addr${i}`]}</p>}
            </div>
          ))}
          {f.addresses.length < 3 && <Button variant="secondary" size="sm" onClick={() => setF((x) => ({ ...x, addresses: [...x.addresses, { label: '', address: '', city: '', postalCode: '' }] }))}><Plus className="h-4 w-4" aria-hidden="true" /> Add an address</Button>}
        </fieldset>
        <Button type="submit" loading={busy}>Save changes</Button>
      </form>
    </Card>
  );
}

function Security() {
  return (
    <Card>
      <CardHeader title="Password and sign-in" />
      <div className="px-5 py-5">
        <InlineAlert tone="blue">Password and sign-in settings are managed by the authentication service, which is not configured yet. There is nothing to change here in this build, and no password is stored by this app.</InlineAlert>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Details />
      <Security />
      <Card>
        <CardHeader title="Session" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <p className="text-sm text-slate-400">Log out of this device.</p>
          <Button variant="danger" onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}>Log out</Button>
        </div>
      </Card>
    </div>
  );
}
