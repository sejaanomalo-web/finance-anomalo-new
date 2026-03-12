export const queryKeys = {
  receivables: (orgId: string) => ['receivables', orgId] as const,
  payables: (orgId: string) => ['payables', orgId] as const,
  dashboardSummary: (orgId: string, range: string) => ['dashboard_summary', orgId, range] as const,
  dashboardMonthlyFlow: (orgId: string, startDate: string, endDate: string) => ['dashboard_monthly_flow', orgId, startDate, endDate] as const,
  cashFlow: (orgId: string, startDate: string, endDate: string) => ['cash_flow', orgId, startDate, endDate] as const,
  topClients: (orgId: string, startDate: string, endDate: string, limit: number) => ['top_clients', orgId, startDate, endDate, limit] as const,
  clients: (orgId: string) => ['clients', orgId] as const,
  client: (orgId: string, clientId: string) => ['client', orgId, clientId] as const,
  categories: (orgId: string) => ['categories', orgId] as const,
  platforms: (orgId: string) => ['platforms', orgId] as const,
  appSettings: (orgId: string) => ['app_settings', orgId] as const,
};
