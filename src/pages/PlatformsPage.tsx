import { FormEvent, useMemo, useState } from 'react';
import { useOrg } from '../contexts/useOrg';
import { usePlatformMutations, usePlatforms } from '../hooks/useSupabaseData';
import { usePayables } from '../hooks/useFinance';
import { formatMoney } from '../lib/format';
import { EmptyState, Panel } from '../components/ui/Ui';

export function PlatformsPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const { data = [] } = usePlatforms(orgId);
  const payables = usePayables(orgId);
  const mutations = usePlatformMutations(orgId);

  const [form, setForm] = useState({ name: '', type: '', feeValue: 0, feeType: 'percent' });

  const totals = useMemo(() => {
    const monthly = data.reduce((acc, item) => acc + Number(item.fee_value ?? 0), 0);
    return { monthly, annual: monthly * 12 };
  }, [data]);

  const platformExpenses = useMemo(() => {
    return (payables.data ?? []).filter((entry) => (entry.notes ?? '').toLowerCase().includes('plataforma'));
  }, [payables.data]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await mutations.create.mutateAsync({
      name: form.name,
      type: form.type || null,
      fee_value: Number(form.feeValue),
      fee_type: form.feeType,
      active: true,
    });
    setForm({ name: '', type: '', feeValue: 0, feeType: 'percent' });
  };

  return (
    <div className="space-y-4">
      <Panel title="Plataformas">
        <form className="grid gap-2 md:grid-cols-5" onSubmit={onSubmit}>
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="Nome"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="Tipo"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          />
          <input
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            placeholder="Taxa"
            type="number"
            step="0.01"
            value={form.feeValue}
            onChange={(event) => setForm((prev) => ({ ...prev, feeValue: Number(event.target.value) }))}
          />
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            value={form.feeType}
            onChange={(event) => setForm((prev) => ({ ...prev, feeType: event.target.value }))}
          >
            <option value="percent">Percentual</option>
            <option value="fixed">Fixo</option>
          </select>
          <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]" type="submit">
            Salvar
          </button>
        </form>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Custo mensal">
          <p className="text-2xl font-semibold">{formatMoney(totals.monthly)}</p>
          <p className="text-sm text-[var(--muted)]">Custo anual: {formatMoney(totals.annual)}</p>
        </Panel>

        <Panel title="Despesas de plataforma">
          {platformExpenses.length ? (
            <ul className="space-y-2">
              {platformExpenses.slice(0, 6).map((expense) => (
                <li key={expense.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                  <span>{expense.description}</span>
                  <span>{formatMoney(Number(expense.amount))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sem despesas vinculadas" description="Nenhum pagamento com categoria/plataforma identificado." />
          )}
        </Panel>
      </div>

      <Panel title="Cadastro atual">
        {data.length ? (
          <ul className="space-y-2">
            {data.map((platform) => (
              <li key={platform.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                <div>
                  <p>{platform.name}</p>
                  <p className="text-xs text-[var(--muted)]">{platform.type ?? 'Sem tipo'} • {platform.fee_type ?? '-'}</p>
                </div>
                <p>{formatMoney(Number(platform.fee_value))}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem plataformas cadastradas" description="Cadastre plataformas para acompanhar custo operacional." />
        )}
      </Panel>
    </div>
  );
}
