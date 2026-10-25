export type Role = 'owner' | 'admin' | 'staff' | 'viewer';

export interface Perms {
  /** Create and edit orders, record payments. */
  editOrders: boolean;
  /** Delete orders and remove recorded payments. */
  deleteOrders: boolean;
  /** Finances view, expenses, money totals, CSV exports. */
  finances: boolean;
  /** Business name, currency, backups, restore, sample data, clear all. */
  manageBusiness: boolean;
  /** Invite people, change roles, remove members. */
  manageTeam: boolean;
}

const ALL: Perms = { editOrders: true, deleteOrders: true, finances: true, manageBusiness: true, manageTeam: true };

// Keep in step with firestore.rules, which enforces the same rules on the server.
export const PERMS: Record<Role, Perms> = {
  owner: ALL,
  admin: ALL,
  staff: { editOrders: true, deleteOrders: false, finances: false, manageBusiness: false, manageTeam: false },
  viewer: { editOrders: false, deleteOrders: false, finances: false, manageBusiness: false, manageTeam: false },
};

export const ROLE_INFO: Record<Role, { label: string; desc: string }> = {
  owner: { label: 'Owner', desc: 'Created the business. Full access; can’t be removed.' },
  admin: { label: 'Admin', desc: 'Full access, including finances, settings and the team.' },
  staff: { label: 'Staff', desc: 'Adds and edits orders and records payments. No finances, no deleting.' },
  viewer: { label: 'Viewer', desc: 'Can see the calendar and orders, but can’t change anything.' },
};

/** Roles an admin can hand out. */
export const INVITABLE_ROLES: Role[] = ['admin', 'staff', 'viewer'];

export const isRole = (r: unknown): r is Role => r === 'owner' || r === 'admin' || r === 'staff' || r === 'viewer';
