import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { useOrg } from '../../contexts/useOrg';
import { queryKeys } from '../../lib/queryKeys';

const TABLES = ['clients', 'receivables', 'payables', 'cash_entries', 'settlements', 'categories', 'platforms', 'app_settings'] as const;

export function SupabaseRealtimeBridge() {
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const timerRef = useRef<number | null>(null);
  const tablesRef = useRef(new Set<string>());

  const keyMap = useMemo<Record<string, Array<readonly unknown[]>>>(
    () => ({
      receivables: [queryKeys.receivables(orgId ?? 'none'), queryKeys.dashboardSummary(orgId ?? 'none', 'all'), ['cash_flow', orgId], ['top_clients', orgId]],
      payables: [queryKeys.payables(orgId ?? 'none'), queryKeys.dashboardSummary(orgId ?? 'none', 'all'), ['cash_flow', orgId]],
      settlements: [queryKeys.dashboardMonthlyFlow(orgId ?? 'none', '', ''), ['cash_flow', orgId], ['top_clients', orgId]],
      clients: [queryKeys.clients(orgId ?? 'none'), ['top_clients', orgId]],
      categories: [queryKeys.categories(orgId ?? 'none')],
      platforms: [queryKeys.platforms(orgId ?? 'none')],
      app_settings: [queryKeys.appSettings(orgId ?? 'none')],
      cash_entries: [['cash_flow', orgId], queryKeys.dashboardSummary(orgId ?? 'none', 'all')],
    }),
    [orgId],
  );

  useEffect(() => {
    if (!orgId) return;

    const flush = () => {
      const changedTables = [...tablesRef.current];
      tablesRef.current.clear();

      const keys: Array<readonly unknown[]> = [];
      changedTables.forEach((table) => {
        keys.push(...(keyMap[table] ?? []));
      });

      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
      });
    };

    const schedule = (table: string) => {
      tablesRef.current.add(table);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        flush();
      }, 180);
    };

    const channel = supabase.channel(`finance-realtime-${orgId}`);

    TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          schedule(table);
        },
      );
    });

    channel.subscribe();

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [keyMap, orgId, queryClient]);

  return null;
}
