import { HttpError } from '../lib/httpError.js';
import { postgrestSelect } from '../lib/supabaseAdmin.js';

function buildPagination(filters) {
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  return { from: offset, to: offset + limit - 1 };
}

function buildCommonFilters(filters) {
  const queryFilters = [
    { column: 'org_id', op: 'eq', value: filters.orgId },
    { column: 'deleted_at', op: 'is', value: null },
  ];

  if (filters.status) queryFilters.push({ column: 'status', op: 'eq', value: filters.status });
  if (filters.categoryId) queryFilters.push({ column: 'category_id', op: 'eq', value: filters.categoryId });
  if (filters.paymentMethod) queryFilters.push({ column: 'payment_method', op: 'eq', value: filters.paymentMethod });
  if (filters.startDate) queryFilters.push({ column: 'due_date', op: 'gte', value: filters.startDate });
  if (filters.endDate) queryFilters.push({ column: 'due_date', op: 'lte', value: filters.endDate });
  if (filters.minAmount !== undefined) queryFilters.push({ column: 'amount', op: 'gte', value: filters.minAmount });
  if (filters.maxAmount !== undefined) queryFilters.push({ column: 'amount', op: 'lte', value: filters.maxAmount });

  return queryFilters;
}

export async function listReceivables(filters) {
  try {
    const { from, to } = buildPagination(filters);
    const { data, error } = await postgrestSelect({
      table: 'receivables',
      select: '*,client:clients(id,name,email,avatar_url),category:categories(id,name,color),platform:platforms(id,name,type)',
      filters: buildCommonFilters(filters),
      order: { column: 'due_date', ascending: true },
      range: { from, to },
    });

    if (error) {
      throw new HttpError(500, 'receivables_read_failed', 'Falha ao buscar contas a receber.');
    }

    return data ?? [];
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'receivables_read_failed', 'Falha ao buscar contas a receber.');
  }
}

export async function listPayables(filters) {
  try {
    const { from, to } = buildPagination(filters);
    const { data, error } = await postgrestSelect({
      table: 'payables',
      select: '*,category:categories(id,name,color),platform:platforms(id,name,type)',
      filters: buildCommonFilters(filters),
      order: { column: 'due_date', ascending: true },
      range: { from, to },
    });

    if (error) {
      throw new HttpError(500, 'payables_read_failed', 'Falha ao buscar contas a pagar.');
    }

    return data ?? [];
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'payables_read_failed', 'Falha ao buscar contas a pagar.');
  }
}

export async function listSettlementsByPeriod({ orgId, startDate, endDate }) {
  try {
    const { data, error } = await postgrestSelect({
      table: 'settlements',
      select: '*',
      filters: [
        { column: 'org_id', op: 'eq', value: orgId },
        { column: 'settlement_date', op: 'gte', value: startDate },
        { column: 'settlement_date', op: 'lte', value: endDate },
      ],
      order: { column: 'settlement_date', ascending: true },
    });

    if (error) {
      throw new HttpError(500, 'settlements_read_failed', 'Falha ao buscar settlements.');
    }

    return data ?? [];
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'settlements_read_failed', 'Falha ao buscar settlements.');
  }
}

export async function listProjectedReceivables({ orgId, startDate, endDate }) {
  try {
    const { data, error } = await postgrestSelect({
      table: 'receivables',
      select: 'id,due_date,amount',
      filters: [
        { column: 'org_id', op: 'eq', value: orgId },
        { column: 'deleted_at', op: 'is', value: null },
        { column: 'status', op: 'neq', value: 'paid' },
        { column: 'due_date', op: 'gte', value: startDate },
        { column: 'due_date', op: 'lte', value: endDate },
      ],
      order: { column: 'due_date', ascending: true },
    });

    if (error) {
      throw new HttpError(500, 'receivables_projection_failed', 'Falha ao buscar projeções de recebíveis.');
    }

    return data ?? [];
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'receivables_projection_failed', 'Falha ao buscar projeções de recebíveis.');
  }
}

export async function listProjectedPayables({ orgId, startDate, endDate }) {
  try {
    const { data, error } = await postgrestSelect({
      table: 'payables',
      select: 'id,due_date,amount',
      filters: [
        { column: 'org_id', op: 'eq', value: orgId },
        { column: 'deleted_at', op: 'is', value: null },
        { column: 'status', op: 'neq', value: 'paid' },
        { column: 'due_date', op: 'gte', value: startDate },
        { column: 'due_date', op: 'lte', value: endDate },
      ],
      order: { column: 'due_date', ascending: true },
    });

    if (error) {
      throw new HttpError(500, 'payables_projection_failed', 'Falha ao buscar projeções de pagamentos.');
    }

    return data ?? [];
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'payables_projection_failed', 'Falha ao buscar projeções de pagamentos.');
  }
}

export async function listTopClientsByPeriod({ orgId, startDate, endDate, limit }) {
  try {
    const { data, error } = await postgrestSelect({
      table: 'receivables',
      select: 'client_id,amount,status,client:clients(id,name)',
      filters: [
        { column: 'org_id', op: 'eq', value: orgId },
        { column: 'deleted_at', op: 'is', value: null },
        { column: 'client_id', op: 'not', nestedOp: 'is', value: null },
        { column: 'due_date', op: 'gte', value: startDate },
        { column: 'due_date', op: 'lte', value: endDate },
      ],
    });

    if (error) {
      throw new HttpError(500, 'top_clients_failed', 'Falha ao calcular top clientes.');
    }

    const acc = new Map();
    for (const row of data ?? []) {
      const clientId = row.client_id;
      if (!clientId) continue;

      if (!acc.has(clientId)) {
        const clientName = Array.isArray(row.client) ? row.client[0]?.name : row.client?.name;
        acc.set(clientId, {
          clientId,
          name: clientName ?? 'Sem nome',
          totalCents: 0,
          paidCents: 0,
          pendingCents: 0,
          invoiceCount: 0,
        });
      }

      const item = acc.get(clientId);
      const cents = Math.round(Number(row.amount ?? 0) * 100);
      item.totalCents += cents;
      item.invoiceCount += 1;

      if (row.status === 'paid') {
        item.paidCents += cents;
      } else {
        item.pendingCents += cents;
      }
    }

    const maxItems = Math.min(Math.max(limit ?? 10, 1), 50);
    return [...acc.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, maxItems);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'top_clients_failed', 'Falha ao calcular top clientes.');
  }
}
