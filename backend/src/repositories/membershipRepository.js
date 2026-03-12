import { HttpError } from '../lib/httpError.js';
import { postgrestSelect } from '../lib/supabaseAdmin.js';

const ROLE_PERMISSIONS = {
  owner: { read: true, write: true, delete: true },
  admin: { read: true, write: true, delete: true },
  finance_manager: { read: true, write: true, delete: true },
  finance_analyst: { read: true, write: true, delete: false },
  analyst: { read: true, write: false, delete: false },
  auditor: { read: true, write: false, delete: false },
  viewer: { read: true, write: false, delete: false },
  read_only: { read: true, write: false, delete: false },
};

export async function getMembership(orgId, userId) {
  try {
    const { data, error } = await postgrestSelect({
      table: 'user_organization_roles',
      select: 'id,role,active',
      filters: [
        { column: 'org_id', op: 'eq', value: orgId },
        { column: 'user_id', op: 'eq', value: userId },
        { column: 'active', op: 'eq', value: true },
      ],
      order: { column: 'created_at', ascending: true },
      limit: 1,
    });

    if (error) {
      throw new HttpError(500, 'membership_query_failed', 'Falha ao consultar vínculo de organização.');
    }

    const row = data?.[0];

    if (!row) {
      throw new HttpError(403, 'forbidden', 'Usuário não pertence à organização informada.');
    }

    return row;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, 'membership_query_failed', 'Falha ao consultar vínculo de organização.');
  }
}

export function assertPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS[role]?.[permission] === true;
  if (!allowed) {
    throw new HttpError(403, 'forbidden', 'Permissão insuficiente para esta operação.');
  }
}
