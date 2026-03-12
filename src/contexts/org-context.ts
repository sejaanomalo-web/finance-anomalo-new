import { createContext } from 'react';
import type { Organization, OrgRole } from '../types/domain';

export interface Membership extends OrgRole {
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
