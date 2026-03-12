import { centsToMoney, moneyToCents, normalizeStatus } from '../lib/money.js';
import { assertPermission, getMembership } from '../repositories/membershipRepository.js';
import {
  listPayables,
  listProjectedPayables,
  listProjectedReceivables,
  listReceivables,
  listSettlementsByPeriod,
  listTopClientsByPeriod,
} from '../repositories/financeReadRepository.js';

export async function getReceivables({ actorId, filters }) {
  const membership = await getMembership(filters.orgId, actorId);
  assertPermission(membership.role, 'read');

  const status = normalizeStatus(filters.status);
  const rows = await listReceivables({ ...filters, status });

  return rows;
}

export async function getPayables({ actorId, filters }) {
  const membership = await getMembership(filters.orgId, actorId);
  assertPermission(membership.role, 'read');

  const status = normalizeStatus(filters.status);
  const rows = await listPayables({ ...filters, status });

  return rows;
}

export async function getCashFlow({ actorId, orgId, startDate, endDate }) {
  const membership = await getMembership(orgId, actorId);
  assertPermission(membership.role, 'read');

  const [settlements, projectedReceivables, projectedPayables] = await Promise.all([
    listSettlementsByPeriod({ orgId, startDate, endDate }),
    listProjectedReceivables({ orgId, startDate, endDate }),
    listProjectedPayables({ orgId, startDate, endDate }),
  ]);

  const timelineMap = new Map();

  const ensureDay = (date) => {
    if (!timelineMap.has(date)) {
      timelineMap.set(date, {
        date,
        realizedInCents: 0,
        realizedOutCents: 0,
        projectedInCents: 0,
        projectedOutCents: 0,
      });
    }

    return timelineMap.get(date);
  };

  for (const settlement of settlements) {
    const day = ensureDay(settlement.settlement_date);
    const cents = moneyToCents(settlement.amount) ?? 0;
    if (settlement.direction === 'in') {
      day.realizedInCents += cents;
    } else {
      day.realizedOutCents += cents;
    }
  }

  for (const receivable of projectedReceivables) {
    const day = ensureDay(receivable.due_date);
    day.projectedInCents += moneyToCents(receivable.amount) ?? 0;
  }

  for (const payable of projectedPayables) {
    const day = ensureDay(payable.due_date);
    day.projectedOutCents += moneyToCents(payable.amount) ?? 0;
  }

  let runningBalanceCents = 0;
  const timeline = [...timelineMap.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((item) => {
      runningBalanceCents += item.realizedInCents - item.realizedOutCents;
      runningBalanceCents += item.projectedInCents - item.projectedOutCents;

      return {
        date: item.date,
        realizedIn: centsToMoney(item.realizedInCents),
        realizedOut: centsToMoney(item.realizedOutCents),
        projectedIn: centsToMoney(item.projectedInCents),
        projectedOut: centsToMoney(item.projectedOutCents),
        balance: centsToMoney(runningBalanceCents),
      };
    });

  return {
    startDate,
    endDate,
    totals: {
      realizedIn: centsToMoney(settlements.filter((x) => x.direction === 'in').reduce((acc, row) => acc + (moneyToCents(row.amount) ?? 0), 0)),
      realizedOut: centsToMoney(settlements.filter((x) => x.direction === 'out').reduce((acc, row) => acc + (moneyToCents(row.amount) ?? 0), 0)),
      projectedIn: centsToMoney(projectedReceivables.reduce((acc, row) => acc + (moneyToCents(row.amount) ?? 0), 0)),
      projectedOut: centsToMoney(projectedPayables.reduce((acc, row) => acc + (moneyToCents(row.amount) ?? 0), 0)),
    },
    timeline,
  };
}

export async function getTopClients({ actorId, orgId, startDate, endDate, limit }) {
  const membership = await getMembership(orgId, actorId);
  assertPermission(membership.role, 'read');

  const rows = await listTopClientsByPeriod({ orgId, startDate, endDate, limit: limit ?? 10 });

  return rows.map((row) => ({
    clientId: row.clientId,
    name: row.name,
    total: centsToMoney(row.totalCents),
    paid: centsToMoney(row.paidCents),
    pending: centsToMoney(row.pendingCents),
    invoiceCount: row.invoiceCount,
  }));
}
