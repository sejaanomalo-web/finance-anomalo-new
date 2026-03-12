import { useMemo, useState } from 'react';
import { useOrg } from '../contexts/useOrg';
import { useCashFlow, usePayables, useReceivables, useTopClients } from '../hooks/useFinance';
import { formatMoney, toDateInput } from '../lib/format';
import { EmptyState, Panel } from '../components/ui/Ui';

const PERIODS = {
  semanal: 7,
  mensal: 30,
  trimestral: 90,
  semestral: 180,
  anual: 365,
} as const;

export function ReportsPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const [period, setPeriod] = useState<keyof typeof PERIODS>('mensal');

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - PERIODS[period]);
    return { startDate: toDateInput(start), endDate: toDateInput(end) };
  }, [period]);

  const receivables = useReceivables(orgId);
  const payables = usePayables(orgId);
  const topClients = useTopClients(orgId, range.startDate, range.endDate, 10);
  const cashFlow = useCashFlow(orgId, range.startDate, range.endDate);

  const summary = useMemo(() => {
    const input = (receivables.data ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
    const output = (payables.data ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
    return { input, output, result: input - output };
  }, [payables.data, receivables.data]);

  const printReport = () => {
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return;
    popup.document.write(`<html><head><title>Relatório Financeiro</title></head><body><h1>Relatório Financeiro (${period})</h1><p>Entradas: ${formatMoney(summary.input)}</p><p>Saídas: ${formatMoney(summary.output)}</p><p>Resultado: ${formatMoney(summary.result)}</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Relatórios"
        right={
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm" value={period} onChange={(event) => setPeriod(event.target.value as keyof typeof PERIODS)}>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
            <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={printReport} type="button">
              Exportar/Imprimir
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--muted)]">Entradas</p>
            <p className="text-xl font-semibold">{formatMoney(summary.input)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--muted)]">Saídas</p>
            <p className="text-xl font-semibold">{formatMoney(summary.output)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--muted)]">Resultado</p>
            <p className="text-xl font-semibold">{formatMoney(summary.result)}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Top clientes no período">
        {(topClients.data ?? []).length ? (
          <ul className="space-y-2">
            {(topClients.data ?? []).map((item) => (
              <li key={item.clientId} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                <span>{item.name}</span>
                <span>{formatMoney(item.total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem dados para top clientes" description="Não há recebíveis no período selecionado." />
        )}
      </Panel>

      <Panel title="Consolidado de fluxo">
        {cashFlow.data?.timeline?.length ? (
          <ul className="space-y-2">
            {cashFlow.data.timeline.slice(-10).map((item) => (
              <li key={item.date} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                <span>{item.date}</span>
                <span>{formatMoney(item.balance)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem fluxo consolidado" description="Cadastre movimentações para gerar o consolidado." />
        )}
      </Panel>
    </div>
  );
}
