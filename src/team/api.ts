import {
  collection, collectionGroup, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore, type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { isRole, type Role } from '../lib/roles';

export interface Member {
  uid: string;
  email: string;
  name: string;
  role: Role;
  joinedAt?: Timestamp | null;
}

export interface Invite {
  email: string;
  role: Role;
  bizId: string;
  bizName: string;
  invitedBy: string;
  invitedByName: string;
  createdAt?: Timestamp | null;
}

export const normEmail = (e: string) => e.trim().toLowerCase();
export const displayName = (u: User) => u.displayName || (u.email || '').split('@')[0] || 'Someone';

export const membersCol = (db: Firestore, bizId: string) => collection(db, 'businesses', bizId, 'members');
export const invitesCol = (db: Firestore, bizId: string) => collection(db, 'businesses', bizId, 'invites');
export const userRef = (db: Firestore, uid: string) => doc(db, 'users', uid);

export function toMember(d: any): Member {
  return { uid: String(d.uid || ''), email: String(d.email || ''), name: String(d.name || ''), role: isRole(d.role) ? d.role : 'viewer', joinedAt: d.joinedAt || null };
}
export function toInvite(d: any): Invite {
  return {
    email: String(d.email || ''), role: isRole(d.role) ? d.role : 'viewer', bizId: String(d.bizId || ''), bizName: String(d.bizName || ''),
    invitedBy: String(d.invitedBy || ''), invitedByName: String(d.invitedByName || ''), createdAt: d.createdAt || null,
  };
}

/** Invites addressed to this user's (verified) email, across every business. */
export async function findMyInvites(db: Firestore, email: string): Promise<Invite[]> {
  const snap = await getDocs(query(collectionGroup(db, 'invites'), where('email', '==', normEmail(email))));
  return snap.docs.map((d) => toInvite(d.data()));
}

export async function acceptInvite(db: Firestore, user: User, inv: Invite) {
  const batch = writeBatch(db);
  batch.set(doc(membersCol(db, inv.bizId), user.uid), {
    uid: user.uid, email: normEmail(user.email || ''), name: displayName(user), role: inv.role, joinedAt: serverTimestamp(), invitedBy: inv.invitedBy,
  });
  batch.delete(doc(invitesCol(db, inv.bizId), normEmail(user.email || '')));
  batch.set(userRef(db, user.uid), { bizId: inv.bizId }, { merge: true });
  await batch.commit();
}

export async function createBusiness(db: Firestore, user: User, name: string) {
  const bizRef = doc(collection(db, 'businesses'));
  const settings = { ...DEFAULT_SETTINGS, businessName: name };
  const batch = writeBatch(db);
  batch.set(bizRef, { name, ownerUid: user.uid, settings, createdAt: serverTimestamp() });
  batch.set(doc(membersCol(db, bizRef.id), user.uid), {
    uid: user.uid, email: normEmail(user.email || ''), name: displayName(user), role: 'owner', joinedAt: serverTimestamp(),
  });
  batch.set(userRef(db, user.uid), { bizId: bizRef.id }, { merge: true });
  await batch.commit();
}

export function createInvite(db: Firestore, bizId: string, bizName: string, email: string, role: Role, inviter: User) {
  const e = normEmail(email);
  return setDoc(doc(invitesCol(db, bizId), e), {
    email: e, role, bizId, bizName, invitedBy: inviter.uid, invitedByName: displayName(inviter), createdAt: serverTimestamp(),
  });
}

export const revokeInvite = (db: Firestore, bizId: string, email: string) => deleteDoc(doc(invitesCol(db, bizId), normEmail(email)));
export const changeRole = (db: Firestore, bizId: string, uid: string, role: Role) => updateDoc(doc(membersCol(db, bizId), uid), { role });
export const removeMember = (db: Firestore, bizId: string, uid: string) => deleteDoc(doc(membersCol(db, bizId), uid));

/** Link people can open to join; they sign in with the invited email and the invite is picked up. */
export const inviteUrl = () => window.location.origin + '/?invite=1';
