import { createContext, useContext } from 'react';
import { PERMS, type Perms, type Role } from '../lib/roles';

export interface Access {
  mode: 'local' | 'cloud';
  role: Role;
  can: Perms;
  bizId: string | null;
}

/** Local-only mode has a single user with full access. */
export const LOCAL_ACCESS: Access = { mode: 'local', role: 'owner', can: PERMS.owner, bizId: null };

export const AccessContext = createContext<Access>(LOCAL_ACCESS);
export const useAccess = () => useContext(AccessContext);
