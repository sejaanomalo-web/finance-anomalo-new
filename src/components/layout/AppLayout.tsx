import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Building2, CircleDollarSign, FileText, LayoutDashboard, LogOut, Receipt, Settings, Users } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useOrg } from '../../contexts/useOrg';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/a-receber', label: 'À Receber', icon: Receipt },
  { to: '/a-pagar', label: 'À Pagar', icon: CircleDollarSign },
  { to: '/fluxo-caixa', label: 'Fluxo de Caixa', icon: BarChart3 },
  { to: '/fiscal', label: 'Fiscal', icon: FileText },
  { to: '/plataformas', label: 'Plataformas', icon: Building2 },
  { to: '/equipe', label: 'Equipe', icon: Users },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function AppLayout() {
  const { logout, profile } = useAuth();
  const { organizations, activeOrg, setActiveOrgId } = useOrg();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 p-4 md:grid-cols-[280px_1fr]">
        <aside className="glass-panel p-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-[var(--accent)]/20 p-2 text-[var(--accent)]">FA</div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Finance</p>
              <h1 className="text-lg font-semibold">Anomalo</h1>
            </div>
          </div>

          <label className="mb-2 block text-xs text-[var(--muted)]">Organização ativa</label>
          <select
            className="mb-5 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            value={activeOrg?.id ?? ''}
            onChange={(event) => setActiveOrgId(event.target.value)}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      isActive ? 'bg-[var(--accent)]/25 text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--panel)]'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <button
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--panel)]"
            onClick={() => logout().catch(() => undefined)}
            type="button"
          >
            <LogOut size={16} />
            Sair
          </button>
        </aside>

        <main className="space-y-4">
          <header className="glass-panel flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Área administrativa</p>
              <h2 className="text-lg font-semibold">{NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Painel'}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm">{profile?.full_name ?? 'Usuário'}</p>
              <p className="text-xs text-[var(--muted)]">{activeOrg?.name ?? 'Sem organização'}</p>
            </div>
          </header>

          <div className="space-y-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
