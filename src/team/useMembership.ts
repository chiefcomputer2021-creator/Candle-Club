import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { isRole, type Role } from '../lib/roles';
import { findMyInvites, membersCol, userRef, type Invite } from './api';

export type MembershipState =
  | { status: 'loading' }
  | { status: 'member'; bizId: string; role: Role }
  | { status: 'none'; invites: Invite[] }
  | { status: 'error'; message: string };

const errMessage = (err: unknown) => {
  const code = (err as { code?: string })?.code;
  if (code === 'permission-denied') return 'The database refused access. The Firestore security rules probably haven’t been deployed yet.';
  if (code === 'failed-precondition') return 'Firestore needs an index for invites. Deploy firestore.indexes.json (firebase deploy --only firestore).';
  return 'Couldn’t reach the database. Check your connection and try again.';
};

/** Follows users/{uid} → businesses/{bizId}/members/{uid}; with no membership, looks up pending invites. */
export function useMembership(user: User) {
  const [bizId, setBizId] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<MembershipState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => { setState({ status: 'loading' }); setNonce((n) => n + 1); }, []);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(userRef(db, user.uid),
      (snap) => setBizId(snap.exists() && snap.get('bizId') ? String(snap.get('bizId')) : null),
      (err) => setState({ status: 'error', message: errMessage(err) }));
  }, [user.uid, nonce]);

  useEffect(() => {
    if (!db || bizId === undefined) return;
    // Ignore lookups that finish after this effect has been superseded (e.g. right after joining).
    let live = true;
    const lookInvites = () => {
      if (!user.email || !user.emailVerified) { setState({ status: 'none', invites: [] }); return; }
      findMyInvites(db!, user.email)
        .then((invites) => { if (live) setState({ status: 'none', invites }); })
        .catch((err) => { if (live) setState({ status: 'error', message: errMessage(err) }); });
    };
    if (!bizId) { lookInvites(); return () => { live = false; }; }
    // A removed member can no longer read their own member doc, which surfaces as permission-denied.
    const unsub = onSnapshot(doc(membersCol(db, bizId), user.uid), { includeMetadataChanges: true },
      (snap) => {
        // Wait for the server to confirm a just-written membership before opening the book.
        if (snap.metadata.hasPendingWrites) return;
        const role = snap.exists() ? snap.get('role') : null;
        if (isRole(role)) setState({ status: 'member', bizId, role });
        else lookInvites();
      },
      () => lookInvites());
    return () => { live = false; unsub(); };
  }, [bizId, user.uid, user.email, user.emailVerified, nonce]);

  return { state, refresh };
}
