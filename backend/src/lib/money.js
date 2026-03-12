import { HttpError } from './httpError.js';

const STATUS_MAP = {
  pending: 'pending',
  paid: 'paid',
  overdue: 'overdue',
  Pendente: 'pending',
  Pago: 'paid',
  Realizado: 'paid',
  'Em Atraso': 'overdue',
};

export function normalizeStatus(status) {
  if (status === undefined || status === null || status === '') {
    return undefined;
  }

  const normalized = STATUS_MAP[status] ?? STATUS_MAP[String(status).trim()];
  if (!normalized) {
    throw new HttpError(422, 'validation_error', 'Status inválido.', {
      allowed: Object.keys(STATUS_MAP),
    });
  }

  return normalized;
}

export function normalizeDirection(direction) {
  if (!direction) {
    return undefined;
  }

  if (direction === 'in' || direction === 'out') {
    return direction;
  }

  throw new HttpError(422, 'validation_error', 'Direção inválida. Use in|out.');
}

export function moneyToCents(input) {
  if (input === undefined || input === null || input === '') {
    return undefined;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    throw new HttpError(422, 'validation_error', 'Valor monetário inválido.');
  }

  return Math.round(value * 100);
}

export function centsToMoney(input) {
  if (input === undefined || input === null) {
    return 0;
  }

  return Number(input) / 100;
}
