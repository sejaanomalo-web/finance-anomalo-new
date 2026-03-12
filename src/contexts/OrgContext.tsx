import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Organization } from '../types/domain';
import { useAuth } from './useAuth';
import { Membership, OrgContext } from './org-context';

const ACTIVE_ORG_STORAGE_KEY = '@anomalo/active_org';

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const refreshOrganizations = useCallback(async () => {
    if (!user?.id) {
      setMemberships([]);
      setActiveOrgId(null);
      return;
    }

    setLoading(true);

    const { data: membershipRows, error: membershipError } = await supabase
      .from('user_organization_roles')
      .select('id, user_id, org_id, role, active, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('active', true);

    if (membershipError) {
      setLoading(false);
      throw membershipError;
    }

    const orgIds = Array.from(new Set((membershipRows ?? []).map((row) => row.org_id)));
    const organizationsById = new Map<string, Organization>();

    if (orgIds.length > 0) {
      const { data: organizationRows, error: organizationError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (organizationError) {
        setLoading(false);
        throw organizationError;
      }

      (organizationRows ?? []).forEach((organization) => {
        organizationsById.set(organization.id, organization);
      });
    }

    const parsed = (membershipRows ?? [])
      .map((row) => {
        const organization = organizationsById.get(row.org_id);
        if (!organization) return null;

        return {
          id: row.id,
          user_id: row.user_id,
          org_id: row.org_id,
          role: row.role,
          active: row.active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          organization,
        };
      })
      .filter((row): row is Membership => Boolean(row));

    setMemberships(parsed);

    const persisted = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    const stillValid = parsed.find((entry) => entry.org_id === persisted);
    const fallback = parsed[0]?.org_id ?? null;
    const nextOrgId = stillValid?.org_id ?? fallback;

    setActiveOrgId(nextOrgId);
    if (nextOrgId) {
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, nextOrgId);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setMemberships([]);
      setActiveOrgId(null);
      return;
    }

    refreshOrganizations().catch(() => setLoading(false));
  }, [refreshOrganizations, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channels = [
      supabase
        .channel('org-membership-self')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_organization_roles',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            refreshOrganizations().catch(() => undefined);
          },
        )
        .subscribe(),
      supabase
        .channel('org-organization-self')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'organizations',
          },
          () => {
            refreshOrganizations().catch(() => undefined);
          },
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [refreshOrganizations, user?.id]);

  const setActiveOrgIdSafe = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
  }, []);

  const activeMembership = memberships.find((item) => item.org_id === activeOrgId) ?? null;

  const value = useMemo(
    () => ({
      organizations: memberships.map((item) => item.organization),
      memberships,
      activeOrg: activeMembership?.organization ?? null,
      activeRole: activeMembership?.role ?? null,
      loading,
      setActiveOrgId: setActiveOrgIdSafe,
      refreshOrganizations,
    }),
    [activeMembership?.organization, activeMembership?.role, loading, memberships, refreshOrganizations, setActiveOrgIdSafe],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
