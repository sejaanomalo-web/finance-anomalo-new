import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPayable,
  createReceivable,
  deletePayable,
  deleteReceivable,
  fetchCashFlow,
  fetchPayables,
  fetchReceivables,
  fetchTopClients,
  updatePayable,
  updateReceivable,
} from '../services/backend/financeApi';
import type { PayableInput, ReceivableInput } from '../types/domain';
import { queryKeys } from '../lib/queryKeys';

export function useReceivables(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.receivables(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) return [];
      const result = await fetchReceivables({ orgId });
      return result.data;
    },
    enabled: Boolean(orgId),
  });
}

export function usePayables(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.payables(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) return [];
      const result = await fetchPayables({ orgId });
      return result.data;
    },
    enabled: Boolean(orgId),
  });
}

export function useCashFlow(orgId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.cashFlow(orgId ?? 'none', startDate ?? '', endDate ?? ''),
    queryFn: async () => {
      if (!orgId || !startDate || !endDate) return null;
      return fetchCashFlow(orgId, startDate, endDate);
    },
    enabled: Boolean(orgId && startDate && endDate),
  });
}

export function useTopClients(orgId?: string, startDate?: string, endDate?: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.topClients(orgId ?? 'none', startDate ?? '', endDate ?? '', limit),
    queryFn: async () => {
      if (!orgId || !startDate || !endDate) return [];
      return fetchTopClients(orgId, startDate, endDate, limit);
    },
    enabled: Boolean(orgId && startDate && endDate),
  });
}

export function useReceivableMutations(orgId?: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    if (!orgId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.receivables(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(orgId, 'all') }),
      queryClient.invalidateQueries({ queryKey: ['cash_flow', orgId] }),
      queryClient.invalidateQueries({ queryKey: ['top_clients', orgId] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: (payload: ReceivableInput) => createReceivable(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<ReceivableInput> & { orgId: string } }) =>
        updateReceivable(id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: ({ id, orgId: currentOrgId }: { id: string; orgId: string }) => deleteReceivable(id, currentOrgId),
      onSuccess: invalidate,
    }),
  };
}

export function usePayableMutations(orgId?: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    if (!orgId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.payables(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(orgId, 'all') }),
      queryClient.invalidateQueries({ queryKey: ['cash_flow', orgId] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: (payload: PayableInput) => createPayable(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<PayableInput> & { orgId: string } }) =>
        updatePayable(id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: ({ id, orgId: currentOrgId }: { id: string; orgId: string }) => deletePayable(id, currentOrgId),
      onSuccess: invalidate,
    }),
  };
}
