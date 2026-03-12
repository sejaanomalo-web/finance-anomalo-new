import { HttpError } from '../lib/httpError.js';
import { postgrestRpc } from '../lib/supabaseAdmin.js';

function mapPgCodeToStatus(pgCode) {
  if (pgCode === '42501') return 403;
  if (pgCode === 'P0002') return 404;
  if (pgCode === 'P0001') return 409;
  if (pgCode === '22P02' || pgCode === '22023') return 422;
  return 400;
}

function normalizeMutationError(error) {
  if (error instanceof HttpError) return error;

  const pgCode = String(error?.code ?? '');
  const message = String(error?.message ?? 'Falha de mutação no banco.');

  return new HttpError(mapPgCodeToStatus(pgCode), 'mutation_failed', message, {
    pgCode,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });
}

async function executeFinanceMutation(functionName, input) {
  try {
    const { data, error } = await postgrestRpc(functionName, {
      p_org_id: input.orgId,
      p_actor_id: input.actorId,
      p_action: input.action,
      p_entity_id: input.entityId ?? null,
      p_payload: input.payload ?? {},
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: input.requestHash,
    });

    if (error) {
      throw normalizeMutationError(error);
    }

    if (!data) {
      throw new HttpError(500, 'mutation_failed', 'RPC financeira retornou resultado vazio.');
    }

    return data;
  } catch (error) {
    throw normalizeMutationError(error);
  }
}

export async function mutateReceivable(input) {
  return executeFinanceMutation('finance_mutate_receivable', input);
}

export async function mutatePayable(input) {
  return executeFinanceMutation('finance_mutate_payable', input);
}
