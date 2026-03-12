import { ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useOrg } from '../contexts/useOrg';
import { supabase } from '../integrations/supabase/client';
import { useClient, useClientMutations } from '../hooks/useSupabaseData';
import { useReceivables } from '../hooks/useFinance';
import { formatMoney } from '../lib/format';
import { EmptyState, Panel } from '../components/ui/Ui';

export function ClientDetailPage() {
  const { id } = useParams();
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const orgId = activeOrg?.id;
  const client = useClient(orgId, id);
  const receivables = useReceivables(orgId);
  const mutations = useClientMutations(orgId, user?.id);

  const clientReceivables = (receivables.data ?? []).filter((item) => item.client_id === id);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !orgId || !id) return;

    const path = `clients/${orgId}/${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await mutations.update.mutateAsync({ id, payload: { avatar_url: data.publicUrl } });
  };

  if (!client.data) {
    return <EmptyState title="Cliente não encontrado" description="Verifique se o cliente pertence à organização ativa." />;
  }

  return (
    <div className="space-y-4">
      <Panel title="Visão geral do cliente">
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={client.data.avatar_url ?? 'https://placehold.co/80x80?text=CL'}
            alt={client.data.name}
            className="h-20 w-20 rounded-full border border-[var(--border)] object-cover"
          />
          <div>
            <h3 className="text-xl font-semibold">{client.data.name}</h3>
            <p className="text-sm text-[var(--muted)]">{client.data.email ?? 'Sem e-mail'}</p>
            <p className="text-sm text-[var(--muted)]">{client.data.phone ?? 'Sem telefone'}</p>
          </div>
          <label className="ml-auto rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
            Upload avatar
            <input className="hidden" type="file" accept="image/*" onChange={handleAvatarUpload} />
          </label>
        </div>
      </Panel>

      <Panel title="Histórico financeiro">
        {clientReceivables.length ? (
          <ul className="space-y-2">
            {clientReceivables.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{entry.description}</p>
                  <p className="text-xs text-[var(--muted)]">{entry.due_date}</p>
                </div>
                <p className="text-sm">{formatMoney(Number(entry.amount))}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem histórico" description="Nenhum recebível vinculado a este cliente." />
        )}
      </Panel>
    </div>
  );
}
