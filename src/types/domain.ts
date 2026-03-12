import type { Database } from '../integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrgRole = Database['public']['Tables']['user_organization_roles']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Platform = Database['public']['Tables']['platforms']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];

export type FinanceStatus = 'pending' | 'paid' | 'overdue';

export interface ReceivableInput {
  orgId: string;
  clientId?: string | null;
  description: string;
  amount: number;
  dueDate: string;
  expectedDate?: string | null;
  issueDate?: string | null;
  externalReference?: string | null;
  paymentMethod?: string | null;
  categoryId?: string | null;
  platformId?: string | null;
  notes?: string | null;
  status?: FinanceStatus | 'Pendente' | 'Pago' | 'Realizado' | 'Em Atraso';
}

export interface PayableInput {
  orgId: string;
  description: string;
  amount: number;
  dueDate: string;
  issueDate?: string | null;
  supplierName?: string | null;
  paymentMethod?: string | null;
  categoryId?: string | null;
  platformId?: string | null;
  notes?: string | null;
  status?: FinanceStatus | 'Pendente' | 'Pago' | 'Realizado' | 'Em Atraso';
}

export interface FinanceMutationResponse<T> {
  entity: 'receivable' | 'payable';
  action: 'create' | 'update' | 'delete';
  data: T;
}

export interface CashFlowPoint {
  date: string;
  realizedIn: number;
  realizedOut: number;
  projectedIn: number;
  projectedOut: number;
  balance: number;
}

export interface CashFlowData {
  startDate: string;
  endDate: string;
  totals: {
    realizedIn: number;
    realizedOut: number;
    projectedIn: number;
    projectedOut: number;
  };
  timeline: CashFlowPoint[];
}

export interface TopClient {
  clientId: string;
  name: string;
  total: number;
  paid: number;
  pending: number;
  invoiceCount: number;
}
