import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useOrg } from '../contexts/useOrg';
import { useCashFlow } from '../hooks/useFinance';
import { formatMoney, toDateInput } from '../lib/format';
import { EmptyState, Panel } from '../components/ui/Ui';

export function CashFlowPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: toDateInput(start), endDate: toDateInput(end) };
  }, []);

  const { data } = useCashFlow(orgId, range.startDate, range.endDate);

  return (
    <div className="space-y-4">
      <Panel title="Fluxo de caixa do mês">
        {data?.timeline?.length ? (
          <div className="h-[330px]">
            <ResponsiveContainer>
              <BarChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="realizedIn" name="Entradas realizadas" fill="#34d399" />
                <Bar dataKey="realizedOut" name="Saídas realizadas" fill="#f87171" />
                <Bar dataKey="projectedIn" name="Entradas previstas" fill="#60a5fa" />
                <Bar dataKey="projectedOut" name="Saídas previstas" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Sem movimentação no período" description="Cadastre títulos pagos/pendentes para construir a timeline projetada." />
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <Panel title="Entradas realizadas">
          <p className="text-2xl font-semibold">{formatMoney(data?.totals.realizedIn ?? 0)}</p>
        </Panel>
        <Panel title="Saídas realizadas">
          <p className="text-2xl font-semibold">{formatMoney(data?.totals.realizedOut ?? 0)}</p>
        </Panel>
        <Panel title="Entradas previstas">
          <p className="text-2xl font-semibold">{formatMoney(data?.totals.projectedIn ?? 0)}</p>
        </Panel>
        <Panel title="Saídas previstas">
          <p className="text-2xl font-semibold">{formatMoney(data?.totals.projectedOut ?? 0)}</p>
        </Panel>
      </div>
    </div>
  );
}
