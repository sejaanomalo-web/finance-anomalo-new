import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { queryKeys } from '../lib/queryKeys';

export function useClients(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.clients(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('clients').select('*').eq('org_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useClient(orgId?: string, clientId?: string) {
  return useQuery({
    queryKey: queryKeys.client(orgId ?? 'none', clientId ?? 'none'),
    queryFn: async () => {
      if (!orgId || !clientId) return null;
      const { data, error } = await supabase.from('clients').select('*').eq('org_id', orgId).eq('id', clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId && clientId),
  });
}

export function useClientMutations(orgId?: string, userId?: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    if (!orgId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.clients(orgId) });
  };

  return {
    create: useMutation({
      mutationFn: async (payload: Record<string, unknown>) => {
        const { data, error } = await supabase
          .from('clients')
          .insert({ ...payload, org_id: orgId, created_by: userId, updated_by: userId })
          .select('*')
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
        const { data, error } = await supabase
          .from('clients')
          .update({ ...payload, updated_by: userId })
          .eq('id', id)
          .eq('org_id', orgId ?? '')
          .select('*')
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: invalidate,
    }),
  };
}

export function useCategories(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.categories(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('categories').select('*').eq('org_id', orgId).eq('active', true).order('name');
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function usePlatforms(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.platforms(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('platforms').select('*').eq('org_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function usePlatformMutations(orgId?: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    if (!orgId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.platforms(orgId) });
  };

  return {
    create: useMutation({
      mutationFn: async (payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from('platforms').insert({ ...payload, org_id: orgId }).select('*').single();
        if (error) throw error;
        return data;
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
        const { data, error } = await supabase
          .from('platforms')
          .update(payload)
          .eq('id', id)
          .eq('org_id', orgId ?? '')
          .select('*')
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: invalidate,
    }),
  };
}

export function useAppSettings(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.appSettings(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('app_settings').select('*').eq('org_id', orgId).order('setting_key');
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useUpsertAppSetting(orgId?: string, userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert(
          {
            org_id: orgId,
            setting_key: key,
            setting_value: value,
            updated_by: userId,
          },
          { onConflict: 'org_id,setting_key' },
        )
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      if (!orgId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.appSettings(orgId) });
    },
  });
}
