import { createContext } from 'react';
import type { Organization } from '../types/domain';

export interface Membership {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  active: boolean;
  organization: Organization;
}

export interface OrgContextValue {
  organizations: Organization[];
  memberships: Membership[];
  activeOrg: Organization | null;
  activeRole: string | null;
  loading: boolean;
  setActiveOrgId: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

export const OrgContext = createContext<OrgContextValue | undefined>(undefined);
