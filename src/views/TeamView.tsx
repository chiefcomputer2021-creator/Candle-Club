import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../components/Confirm';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toasts';
import { useAccess } from '../data/access';
import { useBook } from '../data/BookContext';
import { fmtDate, iso } from '../lib/dates';
import { db } from '../lib/firebase';
import { plural } from '../lib/format';
import { INVITABLE_ROLES, PERMS, ROLE_INFO, type Perms, type Role } from '../lib/roles';
import {
  changeRole, createInvite, displayName, invitesCol, inviteUrl, membersCol, normEmail, removeMember, revokeInvite,
  toInvite, toMember, type Invite, type Member,
} from '../team/api';

const ROLE_ORDER: Record<Role, number> = { owner: 0, admin: 1, staff: 2, viewer: 3 };
const PERM_ROWS: [keyof Perms, string][] = [
  ['editOrders', 'Add and edit orders, record payments'],
  ['deleteOrders', 'Delete orders and payments'],
  ['finances', 'See finances and log expenses'],
  ['manageBusiness', 'Business settings, backups, clear data'],
  ['manageTeam', 'Invite people and change roles'],
];
const ROLES: Role[] = ['owner', 'admin', 'staff', 'viewer'];

export function TeamView() {
  const auth = useAuth()!;
  const me = auth.user!;
  const { bizId } = useAccess();
  const { settings } = useBook();
  const toast = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [bad, setBad] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!db || !bizId) return;
    const a = onSnapshot(membersCol(db, bizId), (s) => setMembers(s.docs.map((d) => toMember(d.data()))
      .sort((x, y) => ROLE_ORDER[x.role] - ROLE_ORDER[y.role] || x.name.localeCompare(y.name))));
    const b = onSnapshot(invitesCol(db, bizId), (s) => setInvites(s.docs.map((d) => toInvite(d.data()))));
    return () => { a(); b(); };
  }, [bizId]);

  const fail = (err: unknown) => {
    console.error(err);
    toast((err as { code?: string })?.code === 'permission-denied' ? 'You don’t have permission to do that.' : 'That didn’t work. Try again.');
  };

  async function emailInvite(to: string) {
    try {
      await auth.sendSignInLink(to, inviteUrl());
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(code === 'auth/quota-exceeded'
        ? 'Firebase’s daily invite email limit is used up. Use Copy link to send it yourself.'
        : code === 'auth/operation-not-allowed'
          ? 'Invite emails need “Email link” sign-in switched on in Firebase. Use Copy link for now.'
          : 'The invite is saved, but the email didn’t send. Use Copy link instead.');
      return false;
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    const to = normEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setBad('Enter a valid email address.'); return; }
    if (members.some((m) => m.email === to)) { setBad('That person is already on the team.'); return; }
    if (!db || !bizId) return;
    setBusy(true);
    try {
      await createInvite(db, bizId, settings.businessName, to, role, me);
      const sent = await emailInvite(to);
      if (sent) toast('Invite emailed to ' + to);
      setEmail('');
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  }

  async function copyLink(inv: Invite) {
    const text = `${displayName(me)} invited you to ${settings.businessName}. Open ${inviteUrl()} and sign in with ${inv.email} to join.`;
    try { await navigator.clipboard.writeText(text); toast('Invite message copied'); }
    catch { window.prompt('Copy this invite message:', text); }
  }

  async function revoke(inv: Invite) {
    const ok = await confirm({ title: 'Withdraw this invite?', body: inv.email + ' won’t be able to join with it.', ok: 'Withdraw', danger: true });
    if (ok) revokeInvite(db!, bizId!, inv.email).then(() => toast('Invite withdrawn'), fail);
  }

  async function setMemberRole(m: Member, r: Role) {
    if (m.uid === me.uid && r !== 'admin') {
      const ok = await confirm({ title: 'Change your own role?', body: 'You’ll lose access to the team and finances straight away, and need another admin to give it back.', ok: 'Change my role', danger: true });
      if (!ok) return;
    }
    changeRole(db!, bizId!, m.uid, r).then(() => toast(`${m.name || m.email} is now ${ROLE_INFO[r].label}`), fail);
  }

  async function remove(m: Member) {
    const ok = await confirm({ title: 'Remove ' + (m.name || m.email) + '?', body: 'They’ll lose access to ' + settings.businessName + ' straight away. Orders they added stay in the book.', ok: 'Remove', danger: true });
    if (ok) removeMember(db!, bizId!, m.uid).then(() => toast('Removed from the team'), fail);
  }

  return (
    <>
      <div className="head">
        <div>
          <h1 className="title">Team</h1>
          <p className="subline">{plural(members.length, 'person', 'people')} in {settings.businessName}{invites.length ? `, ${plural(invites.length, 'invite')} waiting` : ''}.</p>
        </div>
      </div>

      <div className="fin-grid" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-h"><h2>Members</h2></div>
          <div className="panel-b">
            <ul className="team-list">
              {members.map((m) => {
                const isMe = m.uid === me.uid;
                return (
                  <li key={m.uid}>
                    <span className="avatar" aria-hidden="true">{(m.name || m.email || '?').slice(0, 1).toUpperCase()}</span>
                    <div className="tm-main">
                      <b>{m.name || m.email}{isMe && <span className="tag" style={{ marginLeft: 8 }}>You</span>}</b>
                      <small>{m.email}{m.joinedAt ? ' · joined ' + fmtDate(iso(m.joinedAt.toDate())) : ''}</small>
                    </div>
                    {m.role === 'owner' ? (
                      <span className="role-pill">Owner</span>
                    ) : (
                      <select className="input role-select" aria-label={'Role for ' + (m.name || m.email)} value={m.role} onChange={(e) => setMemberRole(m, e.target.value as Role)}>
                        {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                      </select>
                    )}
                    {m.role !== 'owner' && !isMe
                      ? <button className="x" aria-label={'Remove ' + (m.name || m.email)} onClick={() => remove(m)}>{Icon.trash}</button>
                      : <span style={{ width: 30 }} />}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-h"><h2>Invite someone</h2></div>
          <form className="panel-b fs" onSubmit={invite} noValidate>
            <label className={'field' + (bad ? ' invalid' : '')}>
              <span>Email</span>
              <input className="input" type="email" autoComplete="off" placeholder="name@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setBad(''); }} />
              <small className="err">{bad}</small>
            </label>
            <label className="field">
              <span>Role</span>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
              </select>
              <small className="faint" style={{ fontSize: 12.5 }}>{ROLE_INFO[role].desc}</small>
            </label>
            <div><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send invite'}</button></div>
            <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
              They get an email with a sign-in link. They can also sign in with Google or a password using this email address, and the invite will be waiting.
            </p>
          </form>
        </section>
      </div>

      <div className="fin-grid two" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-h"><h2>Pending invites</h2></div>
          <div className="panel-b">
            {invites.length ? (
              <ul className="team-list">
                {invites.map((inv) => (
                  <li key={inv.email}>
                    <span className="avatar ghost" aria-hidden="true">@</span>
                    <div className="tm-main">
                      <b>{inv.email}</b>
                      <small>{ROLE_INFO[inv.role].label}{inv.createdAt ? ' · sent ' + fmtDate(iso(inv.createdAt.toDate())) : ''}{inv.invitedByName ? ' by ' + inv.invitedByName : ''}</small>
                    </div>
                    <div className="tm-actions">
                      <button className="btn sm ghost" onClick={() => copyLink(inv)}>Copy link</button>
                      <button className="btn sm ghost" onClick={async () => { if (await emailInvite(inv.email)) toast('Invite emailed again'); }}>Resend</button>
                      <button className="x" aria-label={'Withdraw invite for ' + inv.email} onClick={() => revoke(inv)}>{Icon.close}</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="empty-note">No invites waiting.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-h"><h2>What each role can do</h2></div>
          <div className="panel-b">
            <div className="tbl-wrap perm-wrap">
              <table className="perm-tbl">
                <thead><tr><th />{ROLES.map((r) => <th key={r}>{ROLE_INFO[r].label}</th>)}</tr></thead>
                <tbody>
                  {PERM_ROWS.map(([k, label]) => (
                    <tr key={k}>
                      <td>{label}</td>
                      {ROLES.map((r) => <td key={r} className={PERMS[r][k] ? 'yes' : 'no'}>{PERMS[r][k] ? '✓' : '–'}</td>)}
                    </tr>
                  ))}
                  <tr><td>See the calendar and orders</td>{ROLES.map((r) => <td key={r} className="yes">✓</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
