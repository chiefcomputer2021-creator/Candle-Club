import { useState, type FormEvent, type ReactNode } from 'react';
import { authErrorMessage, useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/Icons';
import { ThemeButton } from '../components/ThemeToggle';
import { db } from '../lib/firebase';
import { ROLE_INFO } from '../lib/roles';
import { acceptInvite, createBusiness, type Invite } from './api';

export function GateCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="gate">
      <ThemeButton className="gate-theme" />
      <div className="gate-card">
        <div className="gate-brand">
          <BrandLogo size={136} />
        </div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

function SignOutLink() {
  const auth = useAuth()!;
  return <button className="linkish" onClick={() => auth.signOut()}>Sign out</button>;
}

/** Signed in, but not part of any business yet. */
export function NoTeam({ invites, onChanged }: { invites: Invite[]; onChanged: () => void }) {
  const auth = useAuth()!;
  const user = auth.user!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('The Candle Club');

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); onChanged(); }
    catch (err) { console.error(err); setError('That didn’t work. ' + ((err as { code?: string })?.code === 'permission-denied' ? 'The invite may have been withdrawn.' : 'Try again.')); }
    finally { setBusy(false); }
  }

  function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    run(() => createBusiness(db!, user, name.trim()));
  }

  return (
    <GateCard title={invites.length ? 'You’ve been invited' : 'You’re not on a team yet'}>
      {error && <div className="gate-err" role="alert">{error}</div>}
      {invites.length > 0 ? (
        <div className="gate-list">
          {invites.map((inv) => (
            <div key={inv.bizId} className="gate-invite">
              <div>
                <b>{inv.bizName || 'A business'}</b>
                <small>{inv.invitedByName || 'Someone'} invited you as {ROLE_INFO[inv.role].label}. {ROLE_INFO[inv.role].desc}</small>
              </div>
              <button className="btn primary" disabled={busy} onClick={() => run(() => acceptInvite(db!, user, inv))}>Join</button>
            </div>
          ))}
        </div>
      ) : (
        <p>Ask the owner or an admin of your business to invite <b>{user.email}</b>, then check again.</p>
      )}

      {!creating ? (
        <div className="gate-links">
          <button className="linkish" onClick={onChanged}>Check again</button>
          <button className="linkish" onClick={() => setCreating(true)}>Set up a new business instead</button>
        </div>
      ) : (
        <form className="gate-form" onSubmit={create}>
          <p>You’ll be the owner and can invite your team.</p>
          <label className="field"><span>Business name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <button className="btn primary wide" type="submit" disabled={busy}>{busy ? 'Setting up…' : 'Create business'}</button>
        </form>
      )}
      <div className="gate-links"><span className="faint">Signed in as {user.email}</span><SignOutLink /></div>
    </GateCard>
  );
}

export function VerifyEmail() {
  const auth = useAuth()!;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true); setMsg('');
    try {
      await auth.reloadUser();
      if (!auth.user?.emailVerified) setMsg('Not verified yet. Open the link in the email, then try again.');
    } finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setMsg('');
    try { await auth.sendVerification(); setMsg('Sent. Check your inbox and spam folder.'); }
    catch (err) { setMsg(authErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <GateCard title="Confirm your email">
      <p>We sent a link to <b>{auth.user?.email}</b>. Open it to confirm the address, then come back here.</p>
      {msg && <p role="status">{msg}</p>}
      <button className="btn primary wide" disabled={busy} onClick={check}>I’ve confirmed it</button>
      <div className="gate-links">
        <button className="linkish" disabled={busy} onClick={resend}>Send the email again</button>
        <SignOutLink />
      </div>
    </GateCard>
  );
}

/** Landing from an invite email: the link signs the person in once they confirm the address it was sent to. */
export function FinishEmailLink() {
  const auth = useAuth()!;
  const [email, setEmail] = useState(auth.storedLinkEmail());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await auth.finishEmailLink(email.trim()); }
    catch (err) { setError(authErrorMessage(err) || 'That didn’t work. Try again.'); setBusy(false); }
  }
  function skip() {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    window.location.reload();
  }

  return (
    <GateCard title="Join your team">
      <p>Enter the email address this invite was sent to.</p>
      {error && <div className="gate-err" role="alert">{error}</div>}
      <form className="gate-form" onSubmit={submit}>
        <label className="field"><span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <button className="btn primary wide" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</button>
      </form>
      <div className="gate-links"><button className="linkish" onClick={skip}>Sign in another way</button></div>
    </GateCard>
  );
}

export function GateError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <GateCard title="Couldn’t open your book">
      <div className="gate-err" role="alert">{message}</div>
      <div className="gate-links"><button className="linkish" onClick={onRetry}>Try again</button><SignOutLink /></div>
    </GateCard>
  );
}
