import { useMemo } from 'react';
import type { User } from 'firebase/auth';
import { AuthProvider, needsVerification, useAuth } from './auth/AuthContext';
import { SignIn } from './auth/SignIn';
import { ConfirmProvider } from './components/Confirm';
import { CandleFlicker } from './components/Icons';
import { QuickStatusProvider } from './components/QuickComplete';
import { Shell } from './components/Shell';
import { ToastProvider } from './components/Toasts';
import { AccessContext, LOCAL_ACCESS, type Access } from './data/access';
import { BookProvider, useBook } from './data/BookContext';
import { createFirestoreStore } from './data/firestoreStore';
import { createLocalStore } from './data/localStore';
import type { BookStore } from './data/store';
import { db, firebaseEnabled } from './lib/firebase';
import { PERMS, type Role } from './lib/roles';
import { FinishEmailLink, GateError, NoTeam, VerifyEmail } from './team/Gate';
import { useMembership } from './team/useMembership';
import { UIProvider } from './ui';

function Boot({ text }: { text: string }) {
  return <div className="boot"><div><CandleFlicker /><div>{text}</div></div></div>;
}

function Book({ store, access }: { store: BookStore; access: Access }) {
  return (
    <AccessContext.Provider value={access}>
      <BookProvider store={store}>
        <UIProvider>
          <ConfirmProvider>
            <QuickStatusProvider>
              <Loaded />
            </QuickStatusProvider>
          </ConfirmProvider>
        </UIProvider>
      </BookProvider>
    </AccessContext.Provider>
  );
}

function Loaded() {
  const { loaded } = useBook();
  return loaded ? <Shell /> : <Boot text="Opening your book…" />;
}

function TeamBook({ bizId, role }: { bizId: string; role: Role }) {
  const can = PERMS[role];
  const store = useMemo(() => createFirestoreStore(db!, bizId, { expenses: can.finances }), [bizId, can.finances]);
  const access = useMemo<Access>(() => ({ mode: 'cloud', role, can, bizId }), [role, can, bizId]);
  return <Book store={store} access={access} />;
}

function Membership({ user }: { user: User }) {
  const { state, refresh } = useMembership(user);
  if (state.status === 'loading') return <Boot text="Finding your team…" />;
  if (state.status === 'error') return <GateError message={state.message} onRetry={refresh} />;
  if (state.status === 'none') return <ConfirmProvider><NoTeam invites={state.invites} onChanged={refresh} /></ConfirmProvider>;
  // key: a role change re-subscribes with the right access (e.g. expenses for admins).
  return <TeamBook key={state.bizId + ':' + state.role} bizId={state.bizId} role={state.role} />;
}

function CloudApp() {
  const auth = useAuth()!;
  if (auth.loading) return <Boot text="Loading…" />;
  if (auth.isEmailLink()) return <FinishEmailLink />;
  if (!auth.user) return <SignIn />;
  if (needsVerification(auth.user)) return <VerifyEmail />;
  // version: re-check membership after the user object refreshes (e.g. email just verified).
  return <Membership key={auth.user.uid + ':' + auth.version} user={auth.user} />;
}

export default function App() {
  const localStore = useMemo(() => (firebaseEnabled ? null : createLocalStore()), []);
  return (
    <ToastProvider>
      {localStore ? <Book store={localStore} access={LOCAL_ACCESS} /> : <AuthProvider><CloudApp /></AuthProvider>}
    </ToastProvider>
  );
}
