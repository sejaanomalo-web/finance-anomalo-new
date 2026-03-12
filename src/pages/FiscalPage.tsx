import { useMemo } from 'react';
import { useOrg } from '../contexts/useOrg';
import { useReceivables } from '../hooks/useFinance';
import { Panel } from '../components/ui/Ui';

export function FiscalPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const { data = [] } = useReceivables(orgId);

  const fiscal = useMemo(() => {
    const now = new Date();
    return {
      emitted: data.filter((item) => Boolean(item.issue_date)).length,
      noIssue: data.filter((item) => !item.issue_date).length,
      dueSoon: data.filter((item) => {
        const due = new Date(item.due_date);
        const diff = (due.getTime() - now.getTime()) / 86_400_000;
        return diff >= 0 && diff <= 7;
      }).length,
      overdue: data.filter((item) => item.status === 'overdue').length,
    };
  }, [data]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Títulos emitidos">
        <p className="text-3xl font-semibold">{fiscal.emitted}</p>
      </Panel>
      <Panel title="Sem emissão fiscal">
        <p className="text-3xl font-semibold">{fiscal.noIssue}</p>
      </Panel>
      <Panel title="Vencendo em 7 dias">
        <p className="text-3xl font-semibold">{fiscal.dueSoon}</p>
      </Panel>
      <Panel title="Em atraso">
        <p className="text-3xl font-semibold">{fiscal.overdue}</p>
      </Panel>
    </div>
  );
}
