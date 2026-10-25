import { useState, type FormEvent } from 'react';
import { BrandLogo, Icon } from '../components/Icons';
import { ThemeButton } from '../components/ThemeToggle';
import { authErrorMessage, useAuth } from './AuthContext';

type Mode = 'signin' | 'signup' | 'reset';

export function SignIn() {
  const auth = useAuth()!;
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function attempt(fn: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); }
    catch (err) { setError(authErrorMessage(err)); }
    finally { setBusy(false); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'reset') {
      attempt(async () => { await auth.resetPassword(email.trim()); setNotice('Check your inbox for a link to reset your password.'); setMode('signin'); });
    } else if (mode === 'signup') {
      attempt(() => auth.signUpWithEmail(email.trim(), password));
    } else {
      attempt(() => auth.signInWithEmail(email.trim(), password));
    }
  }

  const heading = { signin: 'Sign in to your order book', signup: 'Create your account', reset: 'Reset your password' }[mode];
  const cta = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link' }[mode];

  return (
    <div className="gate">
      <ThemeButton className="gate-theme" />
      <div className="gate-card">
        <div className="gate-brand">
          <BrandLogo size={136} />
        </div>
        <div>
          <h1>{heading}</h1>
          <p>Your team’s orders, payments and expenses in one shared book, synced across every device.</p>
        </div>
        {error && <div className="gate-err" role="alert">{error}</div>}
        {notice && <p role="status">{notice}</p>}

        {mode !== 'reset' && <>
          <button className="btn wide" disabled={busy} onClick={() => attempt(auth.signInWithGoogle)}>
            <span style={{ width: 18, height: 18, display: 'inline-flex' }}>{Icon.google}</span>Continue with Google
          </button>
          <div className="gate-or">or with email</div>
        </>}

        <form className="gate-form" onSubmit={submit}>
          <label className="field"><span>Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode !== 'reset' && (
            <label className="field"><span>Password</span>
              <input className="input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          <button className="btn primary wide" type="submit" disabled={busy}>{busy ? 'Please wait…' : cta}</button>
        </form>

        <div className="gate-links">
          {mode === 'signin' && <>
            <button className="linkish" onClick={() => { setMode('signup'); setError(''); }}>Create an account</button>
            <button className="linkish" onClick={() => { setMode('reset'); setError(''); }}>Forgot password?</button>
          </>}
          {mode !== 'signin' && <button className="linkish" onClick={() => { setMode('signin'); setError(''); }}>Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}
