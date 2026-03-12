import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useOrg } from '../contexts/useOrg';
import { useClientMutations, useClients } from '../hooks/useSupabaseData';
import { EmptyState, Panel } from '../components/ui/Ui';

export function ClientsPage() {
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const orgId = activeOrg?.id;
  const { data = [], isLoading } = useClients(orgId);
  const mutations = useClientMutations(orgId, user?.id);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await mutations.create.mutateAsync({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      status: 'active',
    });
    setForm({ name: '', email: '', phone: '' });
  };

  return (
    <div className="space-y-4">
      <Panel title="Cadastro de clientes">
        <form className="grid gap-2 md:grid-cols-4" onSubmit={submit}>
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="Nome"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="E-mail"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="Telefone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]" type="submit">
            Salvar
          </button>
        </form>
      </Panel>

      <Panel title="Lista de clientes">
        {isLoading ? (
          <p>Carregando...</p>
        ) : data.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)]">
                  <th className="py-2">Nome</th>
                  <th className="py-2">Contato</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((client) => (
                  <tr key={client.id} className="border-t border-[var(--border)]">
                    <td className="py-2">{client.name}</td>
                    <td className="py-2">{client.email ?? client.phone ?? '-'}</td>
                    <td className="py-2">{client.status}</td>
                    <td className="py-2 text-right">
                      <Link to={`/clientes/${client.id}`} className="text-[var(--accent)]">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhum cliente cadastrado" description="Cadastre clientes reais para alimentar CRM e relatórios." />
        )}
      </Panel>
    </div>
  );
}
