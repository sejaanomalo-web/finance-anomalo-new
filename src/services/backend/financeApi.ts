import { supabase } from '../../integrations/supabase/client';
import type { CashFlowData, FinanceMutationResponse, PayableInput, ReceivableInput, TopClient } from '../../types/domain';
import type { Database } from '../../integrations/supabase/types';

function resolveDefaultApiBase() {
  if (typeof window === 'undefined') {
    return 'http://localhost:8787/api';
  }

  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

  if (isLocalhost) {
    return 'http://localhost:8787/api';
  }

  return `${window.location.origin}/api`;
}

const API_BASE = import.meta.env.VITE_FINANCE_API_URL ?? resolveDefaultApiBase();

export class FinanceApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'FinanceApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);

  return `{${entries.join(',')}}`;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new FinanceApiError(401, 'auth_missing', 'Sessão expirada. Faça login novamente.');
  }

  return data.session.access_token;
}

async function buildIdempotencyKey(method: string, path: string, payload: unknown): Promise<string> {
  const payloadHash = await sha256Hex(stableStringify(payload ?? {}));
  return `${method.toLowerCase()}:${path}:${payloadHash}`.slice(0, 200);
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
    idempotent?: boolean;
  } = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (options.idempotent) {
    headers['Idempotency-Key'] = await buildIdempotencyKey(method, path, options.body ?? {});
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
  });

  if (!response.ok) {
    const backendUnavailable = [404, 502, 503, 504].includes(response.status);
    const payload = await response
      .json()
      .catch(() => ({ error: backendUnavailable ? 'backend_unavailable' : 'request_failed', message: 'Falha na API.' }));

    throw new FinanceApiError(
      response.status,
      payload.error ?? (backendUnavailable ? 'backend_unavailable' : 'request_failed'),
      payload.message ?? 'Falha na API financeira.',
      payload.details,
    );
  }

  return response.json() as Promise<T>;
}

export type ReceivableRow = Database['public']['Tables']['receivables']['Row'];
export type PayableRow = Database['public']['Tables']['payables']['Row'];

export async function fetchReceivables(params: Record<string, string | number | undefined>) {
  return request<{ data: ReceivableRow[] }>('GET', '/v1/receivables', { query: params });
}

export async function createReceivable(payload: ReceivableInput) {
  return request<FinanceMutationResponse<ReceivableRow>>('POST', '/v1/receivables', {
    body: payload,
    idempotent: true,
  });
}

export async function updateReceivable(id: string, payload: Partial<ReceivableInput> & { orgId: string }) {
  return request<FinanceMutationResponse<ReceivableRow>>('PATCH', `/v1/receivables/${id}`, {
    body: payload,
    idempotent: true,
  });
}

export async function deleteReceivable(id: string, orgId: string) {
  return request<FinanceMutationResponse<ReceivableRow>>('DELETE', `/v1/receivables/${id}`, {
    body: { orgId },
    idempotent: true,
  });
}

export async function fetchPayables(params: Record<string, string | number | undefined>) {
  return request<{ data: PayableRow[] }>('GET', '/v1/payables', { query: params });
}

export async function createPayable(payload: PayableInput) {
  return request<FinanceMutationResponse<PayableRow>>('POST', '/v1/payables', {
    body: payload,
    idempotent: true,
  });
}

export async function updatePayable(id: string, payload: Partial<PayableInput> & { orgId: string }) {
  return request<FinanceMutationResponse<PayableRow>>('PATCH', `/v1/payables/${id}`, {
    body: payload,
    idempotent: true,
  });
}

export async function deletePayable(id: string, orgId: string) {
  return request<FinanceMutationResponse<PayableRow>>('DELETE', `/v1/payables/${id}`, {
    body: { orgId },
    idempotent: true,
  });
}

export async function fetchCashFlow(orgId: string, startDate: string, endDate: string) {
  const response = await request<{ data: CashFlowData }>('GET', '/v1/cash-flow', {
    query: { orgId, startDate, endDate },
  });

  return response.data;
}

export async function fetchTopClients(orgId: string, startDate: string, endDate: string, limit = 10) {
  const response = await request<{ data: TopClient[] }>('GET', '/v1/top-clients', {
    query: { orgId, startDate, endDate, limit },
  });

  return response.data;
}
