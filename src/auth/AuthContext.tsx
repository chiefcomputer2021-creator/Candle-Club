import {
  createUserWithEmailAndPassword, GoogleAuthProvider, isSignInWithEmailLink, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, sendSignInLinkToEmail, signInWithEmailAndPassword, signInWithEmailLink, signInWithPopup,
  signOut as fbSignOut, type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { auth } from '../lib/firebase';

const LINK_EMAIL_KEY = 'candleclub-link-email';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  /** Bumped when the user object changes in place (e.g. after email verification). */
  version: number;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  sendVerification(): Promise<void>;
  /** Reloads the user and refreshes their token so a just-verified email counts straight away. */
  reloadUser(): Promise<void>;
  /** Emails a one-time sign-in link (used for team invites). */
  sendSignInLink(email: string, continueUrl: string): Promise<void>;
  isEmailLink(): boolean;
  storedLinkEmail(): string;
  finishEmailLink(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx | null {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); setVersion((v) => v + 1); });
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const a = () => { if (!auth) throw new Error('Firebase is not configured'); return auth; };
    return {
      user,
      loading,
      version,
      signInWithGoogle: async () => { await signInWithPopup(a(), new GoogleAuthProvider()); },
      signInWithEmail: async (email, password) => { await signInWithEmailAndPassword(a(), email, password); },
      signUpWithEmail: async (email, password) => {
        const cred = await createUserWithEmailAndPassword(a(), email, password);
        await sendEmailVerification(cred.user, { url: window.location.origin });
      },
      resetPassword: (email) => sendPasswordResetEmail(a(), email),
      sendVerification: async () => { if (a().currentUser) await sendEmailVerification(a().currentUser!, { url: window.location.origin }); },
      reloadUser: async () => {
        const u = a().currentUser;
        if (!u) return;
        await u.reload();
        await u.getIdToken(true);
        setUser(a().currentUser);
        setVersion((v) => v + 1);
      },
      sendSignInLink: (email, continueUrl) => sendSignInLinkToEmail(a(), email, { url: continueUrl, handleCodeInApp: true }),
      isEmailLink: () => !!auth && isSignInWithEmailLink(auth, window.location.href),
      storedLinkEmail: () => { try { return localStorage.getItem(LINK_EMAIL_KEY) || ''; } catch { return ''; } },
      finishEmailLink: async (email) => {
        await signInWithEmailLink(a(), email, window.location.href);
        try { localStorage.removeItem(LINK_EMAIL_KEY); } catch { /* ignore */ }
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      },
      signOut: () => fbSignOut(a()),
    };
  }, [user, loading, version]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Password sign-ups must confirm their email; Google accounts arrive verified. */
export function needsVerification(u: User): boolean {
  return !u.emailVerified && u.providerData.some((p) => p.providerId === 'password');
}

/** Turns Firebase auth error codes into something a person can act on. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account with that email. Create one instead?',
    'auth/email-already-in-use': 'There’s already an account with that email. Sign in instead.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/network-request-failed': 'Couldn’t reach the server. Check your connection.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'auth/configuration-not-found': 'Sign-in isn’t set up for this Firebase project yet. Enable Authentication in the Firebase console.',
    'auth/operation-not-allowed': 'This sign-in method isn’t enabled in the Firebase console yet.',
    'auth/unauthorized-domain': 'This domain isn’t authorised in Firebase (Authentication → Settings → Authorised domains).',
    'auth/invalid-action-code': 'This link has expired or was already used. Ask for a new invite, or sign in below.',
    'auth/expired-action-code': 'This link has expired. Ask for a new invite, or sign in below.',
    'auth/quota-exceeded': 'Firebase’s daily email limit has been reached. Try again tomorrow.',
  };
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  return map[code] || 'Something went wrong. Try again.';
}
