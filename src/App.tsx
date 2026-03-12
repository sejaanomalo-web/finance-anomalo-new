import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AppThemeSync } from './components/app/AppThemeSync';
import { SupabaseRealtimeBridge } from './components/supabase/SupabaseRealtimeBridge';
import { useAuth } from './contexts/useAuth';
import { useOrg } from './contexts/useOrg';
import { CashFlowPage } from './pages/CashFlowPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { FiscalPage } from './pages/FiscalPage';
import { LoginPage } from './pages/LoginPage';
import { PayablesPage } from './pages/PayablesPage';
import { PlatformsPage } from './pages/PlatformsPage';
import { ReceivablesPage } from './pages/ReceivablesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { activeOrg, loading: orgLoading } = useOrg();

  if (loading || orgLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrg) {
    return <div className="p-6">Nenhuma organização ativa encontrada para o usuário.</div>;
  }

  return children;
}

export default function App() {
  return (
    <>
      <AppThemeSync />
      <SupabaseRealtimeBridge />

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/clientes/:id" element={<ClientDetailPage />} />
          <Route path="/a-receber" element={<ReceivablesPage />} />
          <Route path="/a-pagar" element={<PayablesPage />} />
          <Route path="/fluxo-caixa" element={<CashFlowPage />} />
          <Route path="/fiscal" element={<FiscalPage />} />
          <Route path="/plataformas" element={<PlatformsPage />} />
          <Route path="/equipe" element={<TeamPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
