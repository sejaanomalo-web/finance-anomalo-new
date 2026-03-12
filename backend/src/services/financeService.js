import { HttpError } from '../lib/httpError.js';
import { moneyToCents, normalizeStatus } from '../lib/money.js';
import { sha256OfObject } from '../lib/hash.js';
import { mutatePayable, mutateReceivable } from '../repositories/financeMutationRepository.js';
import { assertPermission, getMembership } from '../repositories/membershipRepository.js';

function assertIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) {
    throw new HttpError(422, 'validation_error', 'Header Idempotency-Key é obrigatório.');
  }

  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new HttpError(422, 'validation_error', 'Idempotency-Key deve ter entre 8 e 200 caracteres.');
  }
}

function buildPayload(payload) {
  const normalized = { ...payload };

  if (normalized.status !== undefined) {
    normalized.status = normalizeStatus(normalized.status);
  }

  if (normalized.amount !== undefined) {
    normalized.amount_cents = moneyToCents(normalized.amount);
    delete normalized.amount;
  }

  return normalized;
}

async function ensureMutationPermission({ orgId, actorId, action }) {
  const membership = await getMembership(orgId, actorId);

  if (action === 'delete') {
    assertPermission(membership.role, 'delete');
    return;
  }

  assertPermission(membership.role, 'write');
}

export async function createReceivable({ actorId, payload, idempotencyKey }) {
  assertIdempotencyKey(idempotencyKey);
  await ensureMutationPermission({ orgId: payload.orgId, actorId, action: 'create' });

  const normalizedPayload = buildPayload(payload);
  const requestHash = sha256OfObject(normalizedPayload);

  return mutateReceivable({
    orgId: payload.orgId,
    actorId,
    action: 'create',
    payload: normalizedPayload,
    idempotencyKey,
    requestHash,
  });
}

export async function updateReceivable({ actorId, id, payload, idempotencyKey }) {
  assertIdempotencyKey(idempotencyKey);
  await ensureMutationPermission({ orgId: payload.orgId, actorId, action: 'update' });

  const normalizedPayload = buildPayload(payload);
  const requestHash = sha256OfObject({ id, ...normalizedPayload });

  return mutateReceivable({
    orgId: payload.orgId,
    actorId,
    action: 'update',
    entityId: id,
    payload: normalizedPayload,
    idempotencyKey,
    requestHash,
  });
}

export async function deleteReceivable({ actorId, id, orgId, idempotencyKey }) {
  assertIdempotencyKey(idempotencyKey);
  await ensureMutationPermission({ orgId, actorId, action: 'delete' });

  const payload = { orgId, id };
  const requestHash = sha256OfObject(payload);

  return mutateReceivable({
    orgId,
    actorId,
    action: 'delete',
    entityId: id,
    payload: {},
    idempotencyKey,
    requestHash,
  });
}

export async function createPayable({ actorId, payload, idempotencyKey }) {
  assertIdempotencyKey(idempotencyKey);
  await ensureMutationPermission({ orgId: payload.orgId, actorId, action: 'create' });

  const normalizedPayload = buildPayload(payload);
  const requestHash = sha256OfObject(normalizedPayload);

  return mutatePayable({
    orgId: payload.orgId,
    actorId,
    action: 'create',
    payload: normalizedPayload,
    idempotencyKey,
    requestHash,
  });
}

export async function updatePayable({ actorId, id, payload, idempotencyKey }) {
  assertIdempotencyKey(idempotencyKey);
  await ensureMutationPermission({ orgId: payload.orgId, actorId, action: 'update' });

  const normalizedPayload = buildPayload(payload);
  const requestHash = sha256OfObject({ id, ...normalizedPayload });

  return mutatePayable({
    orgId: payload.orgId,
    actorId,
    action: 'update',
    entityId: id,
    payload: normalizedPayload,
    idempotencyKey,
    requestHash,
  });
}

export async function deletePayable({ actorId, id, orgId, idempotencyKey }) {
  assertIdempotencyKey(idempotencyKey);
  await ensureMutationPermission({ orgId, actorId, action: 'delete' });

  const payload = { orgId, id };
  const requestHash = sha256OfObject(payload);

  return mutatePayable({
    orgId,
    actorId,
    action: 'delete',
    entityId: id,
    payload: {},
    idempotencyKey,
    requestHash,
  });
}
