import {
  cashFlowQuerySchema,
  listQuerySchema,
  parseWithSchema,
  payableCreateSchema,
  payableDeleteSchema,
  payableUpdateSchema,
  receivableCreateSchema,
  receivableDeleteSchema,
  receivableUpdateSchema,
  topClientsQuerySchema,
} from '../validation/financeSchemas.js';
import { parseJsonBody } from '../lib/json.js';
import { HttpError } from '../lib/httpError.js';
import {
  createPayable,
  createReceivable,
  deletePayable,
  deleteReceivable,
  updatePayable,
  updateReceivable,
} from '../services/financeService.js';
import { getCashFlow, getPayables, getReceivables, getTopClients } from '../services/financeReadService.js';

function parseOrThrow(schema, input) {
  const parsed = parseWithSchema(schema, input);
  if (!parsed.success) {
    throw new HttpError(422, 'validation_error', 'Dados de entrada inválidos.', parsed.details);
  }

  return parsed.data;
}

function getIdempotencyKey(req) {
  const value = req.headers['idempotency-key'];
  return Array.isArray(value) ? value[0] : value;
}

export function financeRoutes() {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/v1\/receivables$/,
      handler: async ({ auth, searchParams }) => {
        const filters = parseOrThrow(listQuerySchema, Object.fromEntries(searchParams.entries()));
        const data = await getReceivables({ actorId: auth.user.id, filters });
        return { status: 200, body: { data } };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/receivables$/,
      handler: async ({ req, auth }) => {
        const body = parseOrThrow(receivableCreateSchema, await parseJsonBody(req));
        const data = await createReceivable({
          actorId: auth.user.id,
          payload: body,
          idempotencyKey: getIdempotencyKey(req),
        });
        return { status: 200, body: data };
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/v1\/receivables\/([0-9a-fA-F-]{36})$/,
      handler: async ({ req, auth, params }) => {
        const body = parseOrThrow(receivableUpdateSchema, await parseJsonBody(req));
        const data = await updateReceivable({
          actorId: auth.user.id,
          id: params[1],
          payload: body,
          idempotencyKey: getIdempotencyKey(req),
        });
        return { status: 200, body: data };
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/v1\/receivables\/([0-9a-fA-F-]{36})$/,
      handler: async ({ req, auth, searchParams, params }) => {
        const parsedBody = await parseJsonBody(req);
        const fallbackOrgId = searchParams.get('orgId') ?? undefined;
        const body = parseOrThrow(receivableDeleteSchema, {
          ...parsedBody,
          orgId: parsedBody.orgId ?? fallbackOrgId,
        });

        const data = await deleteReceivable({
          actorId: auth.user.id,
          id: params[1],
          orgId: body.orgId,
          idempotencyKey: getIdempotencyKey(req),
        });

        return { status: 200, body: data };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/payables$/,
      handler: async ({ auth, searchParams }) => {
        const filters = parseOrThrow(listQuerySchema, Object.fromEntries(searchParams.entries()));
        const data = await getPayables({ actorId: auth.user.id, filters });
        return { status: 200, body: { data } };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/payables$/,
      handler: async ({ req, auth }) => {
        const body = parseOrThrow(payableCreateSchema, await parseJsonBody(req));
        const data = await createPayable({
          actorId: auth.user.id,
          payload: body,
          idempotencyKey: getIdempotencyKey(req),
        });
        return { status: 200, body: data };
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/v1\/payables\/([0-9a-fA-F-]{36})$/,
      handler: async ({ req, auth, params }) => {
        const body = parseOrThrow(payableUpdateSchema, await parseJsonBody(req));
        const data = await updatePayable({
          actorId: auth.user.id,
          id: params[1],
          payload: body,
          idempotencyKey: getIdempotencyKey(req),
        });
        return { status: 200, body: data };
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/v1\/payables\/([0-9a-fA-F-]{36})$/,
      handler: async ({ req, auth, searchParams, params }) => {
        const parsedBody = await parseJsonBody(req);
        const fallbackOrgId = searchParams.get('orgId') ?? undefined;
        const body = parseOrThrow(payableDeleteSchema, {
          ...parsedBody,
          orgId: parsedBody.orgId ?? fallbackOrgId,
        });

        const data = await deletePayable({
          actorId: auth.user.id,
          id: params[1],
          orgId: body.orgId,
          idempotencyKey: getIdempotencyKey(req),
        });

        return { status: 200, body: data };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/cash-flow$/,
      handler: async ({ auth, searchParams }) => {
        const query = parseOrThrow(cashFlowQuerySchema, Object.fromEntries(searchParams.entries()));
        const data = await getCashFlow({
          actorId: auth.user.id,
          orgId: query.orgId,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        return { status: 200, body: { data } };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/top-clients$/,
      handler: async ({ auth, searchParams }) => {
        const query = parseOrThrow(topClientsQuerySchema, Object.fromEntries(searchParams.entries()));
        const data = await getTopClients({
          actorId: auth.user.id,
          orgId: query.orgId,
          startDate: query.startDate,
          endDate: query.endDate,
          limit: query.limit ?? 10,
        });
        return { status: 200, body: { data } };
      },
    },
  ];
}
