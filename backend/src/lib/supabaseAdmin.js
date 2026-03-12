import { HttpError } from './httpError.js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL não configurado no backend.');
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado no backend.');
}

function encodeFilterValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

async function restRequest(path, { method = 'GET', body, query, headers = {} } = {}) {
  const url = new URL(path, `${supabaseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== '') {
            url.searchParams.append(key, String(item));
          }
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  if (!response.ok) {
    return {
      data: null,
      error: {
        code: payload?.code ?? String(response.status),
        message: payload?.message ?? `Erro HTTP ${response.status}`,
        details: payload?.details ?? null,
        hint: payload?.hint ?? null,
        status: response.status,
      },
    };
  }

  return { data: payload, error: null };
}

export async function postgrestSelect({
  table,
  select = '*',
  filters = [],
  order,
  limit,
  range,
}) {
  const query = { select };

  if (order?.column) {
    query.order = `${order.column}.${order.ascending === false ? 'desc' : 'asc'}`;
  }

  if (limit !== undefined) {
    query.limit = String(limit);
  }

  const appendFilter = (column, expression) => {
    if (query[column] === undefined) {
      query[column] = expression;
      return;
    }

    if (Array.isArray(query[column])) {
      query[column].push(expression);
      return;
    }

    query[column] = [query[column], expression];
  };

  for (const filter of filters) {
    if (!filter?.column || !filter?.op) continue;

    const value = encodeFilterValue(filter.value);
    if (filter.op === 'eq') appendFilter(filter.column, `eq.${value}`);
    if (filter.op === 'neq') appendFilter(filter.column, `neq.${value}`);
    if (filter.op === 'gte') appendFilter(filter.column, `gte.${value}`);
    if (filter.op === 'lte') appendFilter(filter.column, `lte.${value}`);
    if (filter.op === 'is') appendFilter(filter.column, `is.${value}`);
    if (filter.op === 'not') {
      const nestedOp = filter.nestedOp ?? 'is';
      appendFilter(filter.column, `not.${nestedOp}.${value}`);
    }
  }

  const headers = {};
  if (range && Number.isInteger(range.from) && Number.isInteger(range.to)) {
    headers['Range-Unit'] = 'items';
    headers.Range = `${range.from}-${range.to}`;
  }

  return restRequest(`/rest/v1/${table}`, { method: 'GET', query, headers });
}

export async function postgrestRpc(functionName, payload) {
  return restRequest(`/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    body: payload,
  });
}

export async function getAuthenticatedUser(accessToken) {
  const { data, error } = await restRequest('/auth/v1/user', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: serviceRoleKey,
    },
  });

  if (error || !data?.id) {
    throw new HttpError(401, 'invalid_token', 'Token de autenticação inválido.');
  }

  return data;
}
