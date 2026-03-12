import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useOrg } from '../contexts/useOrg';
import { useAppSettings, useUpsertAppSetting } from '../hooks/useSupabaseData';
import { formatMoney } from '../lib/format';
import { EmptyState, Panel } from '../components/ui/Ui';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  salary: number;
  commission: number;
  utilization: number;
}

export function TeamPage() {
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const orgId = activeOrg?.id;
  const appSettings = useAppSettings(orgId);
  const upsert = useUpsertAppSetting(orgId, user?.id);

  const members = useMemo<TeamMember[]>(() => {
    const value = (appSettings.data ?? []).find((item) => item.setting_key === 'team_members')?.setting_value;
    return Array.isArray(value) ? (value as TeamMember[]) : [];
  }, [appSettings.data]);

  const [form, setForm] = useState({ name: '', role: '', salary: 0, commission: 0, utilization: 0 });

  const kpis = useMemo(() => {
    const payroll = members.reduce((sum, item) => sum + Number(item.salary), 0);
    const commissions = members.reduce((sum, item) => sum + Number(item.commission), 0);
    const avgUtil = members.length ? members.reduce((sum, item) => sum + Number(item.utilization), 0) / members.length : 0;
    return { payroll, commissions, avgUtil };
  }, [members]);

  const saveMembers = async (nextMembers: TeamMember[]) => {
    await upsert.mutateAsync({ key: 'team_members', value: nextMembers });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next = [
      ...members,
      {
        id: crypto.randomUUID(),
        name: form.name,
        role: form.role,
        salary: Number(form.salary),
        commission: Number(form.commission),
        utilization: Number(form.utilization),
      },
    ];

    await saveMembers(next);
    setForm({ name: '', role: '', salary: 0, commission: 0, utilization: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Folha total">
          <p className="text-2xl font-semibold">{formatMoney(kpis.payroll)}</p>
        </Panel>
        <Panel title="Comissão total">
          <p className="text-2xl font-semibold">{formatMoney(kpis.commissions)}</p>
        </Panel>
        <Panel title="Utilização média">
          <p className="text-2xl font-semibold">{kpis.avgUtil.toFixed(1)}%</p>
        </Panel>
      </div>

      <Panel title="Cadastrar colaborador">
        <form className="grid gap-2 md:grid-cols-6" onSubmit={onSubmit}>
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="Nome" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="Cargo" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))} required />
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="Salário" type="number" step="0.01" value={form.salary} onChange={(event) => setForm((prev) => ({ ...prev, salary: Number(event.target.value) }))} required />
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="Comissão" type="number" step="0.01" value={form.commission} onChange={(event) => setForm((prev) => ({ ...prev, commission: Number(event.target.value) }))} required />
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="Utilização (%)" type="number" step="0.1" value={form.utilization} onChange={(event) => setForm((prev) => ({ ...prev, utilization: Number(event.target.value) }))} required />
          <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]" type="submit">Adicionar</button>
        </form>
      </Panel>

      <Panel title="Equipe">
        {members.length ? (
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-[var(--muted)]">{member.role} • Utilização {member.utilization}%</p>
                </div>
                <p>{formatMoney(member.salary + member.commission)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sem colaboradores" description="Cadastre o time para medir folha, comissão e utilização." />
        )}
      </Panel>
    </div>
  );
}
