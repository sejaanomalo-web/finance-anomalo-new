import { FormEvent, useMemo, useState } from 'react';
import { useOrg } from '../contexts/useOrg';
import { useReceivableMutations, useReceivables } from '../hooks/useFinance';
import { formatMoney } from '../lib/format';
import { EmptyState, Panel } from '../components/ui/Ui';

export function ReceivablesPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const { data = [], isLoading } = useReceivables(orgId);
  const mutations = useReceivableMutations(orgId);

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', amount: 0, dueDate: '', status: 'pending' as 'pending' | 'paid' | 'overdue' });

  const filtered = useMemo(
    () => data.filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter)),
    [data, statusFilter],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ description: '', amount: 0, dueDate: '', status: 'pending' });
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const row = data.find((item) => item.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({ description: row.description, amount: Number(row.amount), dueDate: row.due_date, status: row.status });
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!orgId) return;

    if (editingId) {
      await mutations.update.mutateAsync({
        id: editingId,
        payload: {
          orgId,
          description: form.description,
          amount: Number(form.amount),
          dueDate: form.dueDate,
          status: form.status,
        },
      });
    } else {
      await mutations.create.mutateAsync({
        orgId,
        description: form.description,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        status: form.status,
      });
    }

    setFormOpen(false);
  };

  return (
    <Panel
      title="Contas a receber"
      right={
        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="overdue">Em atraso</option>
          </select>
          <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-[var(--accent-fg)]" onClick={openCreate} type="button">
            Novo recebível
          </button>
        </div>
      }
    >
      {isLoading ? (
        <p>Carregando...</p>
      ) : filtered.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="py-2">Descrição</th>
                <th className="py-2">Vencimento</th>
                <th className="py-2">Status</th>
                <th className="py-2">Valor</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2">{item.due_date}</td>
                  <td className="py-2">{item.status}</td>
                  <td className="py-2">{formatMoney(Number(item.amount))}</td>
                  <td className="py-2 text-right">
                    <button className="mr-2 text-xs text-[var(--accent)]" onClick={() => openEdit(item.id)} type="button">
                      Editar
                    </button>
                    <button
                      className="text-xs text-red-300"
                      onClick={() => orgId && mutations.remove.mutate({ id: item.id, orgId })}
                      type="button"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Sem dados reais" description="Nenhum recebível encontrado para os filtros atuais." />
      )}

      {formOpen ? (
        <form className="mt-4 grid gap-2 rounded-xl border border-[var(--border)] p-3" onSubmit={handleSubmit}>
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="Descrição"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            required
          />
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
              placeholder="Valor"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
              required
            />
            <input
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              required
            />
            <select
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as any }))}
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Em atraso</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="rounded-xl border border-[var(--border)] px-3 py-2" type="button" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]" type="submit">
              Salvar
            </button>
          </div>
        </form>
      ) : null}
    </Panel>
  );
}
