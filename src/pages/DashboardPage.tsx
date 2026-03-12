import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useOrg } from '../contexts/useOrg';
import { formatMoney, toDateInput } from '../lib/format';
import { EmptyState, Kpi, Panel } from '../components/ui/Ui';
import { useCashFlow, usePayables, useReceivables, useTopClients } from '../hooks/useFinance';
import { useAppSettings } from '../hooks/useSupabaseData';

const PRESET_DAYS = [7, 15, 30, 60, 90, 180, 365];

export function DashboardPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const [days, setDays] = useState<number>(30);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    return {
      startDate: toDateInput(start),
      endDate: toDateInput(end),
    };
  }, [days]);

  const receivables = useReceivables(orgId);
  const payables = usePayables(orgId);
  const cashFlow = useCashFlow(orgId, range.startDate, range.endDate);
  const topClients = useTopClients(orgId, range.startDate, range.endDate, 5);
  const appSettings = useAppSettings(orgId);

  const teamMembers = (appSettings.data ?? []).find((item) => item.setting_key === 'team_members')?.setting_value;
  const payrollSyntheticExpense = Array.isArray(teamMembers)
    ? teamMembers.reduce((sum, member: any) => sum + Number(member?.salary ?? 0) + Number(member?.commission ?? 0), 0)
    : 0;

  const kpis = useMemo(() => {
    const receivableRows = receivables.data ?? [];
    const payableRows = payables.data ?? [];

    const received = receivableRows.filter((item) => item.status === 'paid').reduce((acc, row) => acc + Number(row.amount), 0);
    const paid =
      payableRows.filter((item) => item.status === 'paid').reduce((acc, row) => acc + Number(row.amount), 0) + payrollSyntheticExpense;
    const open =
      receivableRows.filter((item) => item.status !== 'paid').reduce((acc, row) => acc + Number(row.amount), 0) -
      payableRows.filter((item) => item.status !== 'paid').reduce((acc, row) => acc + Number(row.amount), 0);

    const projected = (cashFlow.data?.totals.projectedIn ?? 0) - (cashFlow.data?.totals.projectedOut ?? 0);

    return { received, paid, open, projected };
  }, [cashFlow.data?.totals.projectedIn, cashFlow.data?.totals.projectedOut, payables.data, payrollSyntheticExpense, receivables.data]);

  return (
    <div className="space-y-4">
      <Panel
        title="Resumo financeiro"
        right={
          <div className="flex flex-wrap gap-2">
            {PRESET_DAYS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-xl border px-3 py-1 text-xs ${
                  days === value ? 'border-[var(--accent)] bg-[var(--accent)]/20' : 'border-[var(--border)]'
                }`}
              >
                {value === 180 ? '6M' : value === 365 ? '12M' : `${value}D`}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Recebido" value={formatMoney(kpis.received)} />
          <Kpi label="Pago" value={formatMoney(kpis.paid)} />
          <Kpi label="Em aberto" value={formatMoney(kpis.open)} />
          <Kpi label="Projetado" value={formatMoney(kpis.projected)} />
        </div>
      </Panel>

      <Panel title="Fluxo realizado + previsto">
        {cashFlow.data?.timeline?.length ? (
          <div className="h-[320px]">
            <ResponsiveContainer>
              <LineChart data={cashFlow.data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="realizedIn" stroke="#34d399" strokeWidth={2} name="Entradas realizadas" />
                <Line type="monotone" dataKey="realizedOut" stroke="#f87171" strokeWidth={2} name="Saídas realizadas" />
                <Line type="monotone" dataKey="projectedIn" stroke="#60a5fa" strokeWidth={2} name="Entradas previstas" />
                <Line type="monotone" dataKey="projectedOut" stroke="#f59e0b" strokeWidth={2} name="Saídas previstas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Sem dados reais para o período" description="Cadastre recebíveis e pagamentos para alimentar o dashboard." />
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Cobranças em aberto">
          {(receivables.data ?? []).filter((item) => item.status !== 'paid').slice(0, 8).length ? (
            <ul className="space-y-2">
              {(receivables.data ?? [])
                .filter((item) => item.status !== 'paid')
                .slice(0, 8)
                .map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-[var(--muted)]">Vencimento: {item.due_date}</p>
                    </div>
                    <p className="text-sm">{formatMoney(Number(item.amount))}</p>
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyState title="Sem cobranças pendentes" description="Nenhum recebível em aberto encontrado." />
          )}
        </Panel>

        <Panel title="Top clientes">
          {(topClients.data ?? []).length ? (
            <ul className="space-y-2">
              {(topClients.data ?? []).map((item) => (
                <li key={item.clientId} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-[var(--muted)]">{item.invoiceCount} títulos</p>
                  </div>
                  <p className="text-sm">{formatMoney(item.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sem ranking disponível" description="Não existem recebíveis no período selecionado." />
          )}
        </Panel>
      </div>
    </div>
  );
}
