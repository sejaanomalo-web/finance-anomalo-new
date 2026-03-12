import process from 'node:process';

const env = {
  url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

if (!env.url || !env.serviceRole) {
  throw new Error('Defina SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.');
}

const [email, password, fullName, orgName, orgSlug, roleArg] = process.argv.slice(2);
const role = roleArg === 'owner' ? 'admin' : roleArg ?? 'admin';

if (!email || !password || !orgName || !orgSlug) {
  console.log(
    'Uso: npm run provision:user -- <email> <password> <full_name> <org_name> <org_slug> [role]\n' +
      'Roles sugeridos: admin, finance_manager, finance_analyst, viewer',
  );
  process.exit(1);
}

if (roleArg === 'owner') {
  console.warn('Role "owner" convertido para "admin" para compatibilidade com o banco atual.');
}

const baseUrl = env.url.replace(/\/$/, '');
const serviceHeaders = {
  apikey: env.serviceRole,
  Authorization: `Bearer ${env.serviceRole}`,
  'Content-Type': 'application/json',
};

async function request(path, { method = 'GET', body, headers = {}, allowStatus = [] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...serviceHeaders, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok && !allowStatus.includes(response.status)) {
    const message = payload?.msg ?? payload?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return { status: response.status, data: payload };
}

async function createOrGetUser() {
  const { status, data } = await request('/auth/v1/admin/users', {
    method: 'POST',
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? email },
    },
    allowStatus: [422],
  });

  if (status !== 422 && data?.id) {
    return data.id;
  }

  return findUserIdByEmail(email);
}

async function findUserIdByEmail(targetEmail) {
  const { data } = await request('/auth/v1/admin/users?page=1&per_page=1000');
  const users = data?.users ?? [];
  const user = users.find((item) => item.email?.toLowerCase() === targetEmail.toLowerCase());
  return user?.id ?? null;
}

async function upsertProfile(userId) {
  await request('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: [{ id: userId, full_name: fullName ?? email }],
  });
}

async function upsertOrganization() {
  const { data } = await request('/rest/v1/organizations?on_conflict=slug&select=id,name,slug', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: [{ name: orgName, slug: orgSlug, active: true }],
  });

  const org = Array.isArray(data) ? data[0] : null;
  if (!org?.id) {
    throw new Error('Falha ao obter organização após upsert.');
  }

  return org;
}

async function upsertMembership(userId, organizationId) {
  const encodedRole = encodeURIComponent(role);
  const lookupPath = `/rest/v1/user_organization_roles?select=id&user_id=eq.${userId}&org_id=eq.${organizationId}&role=eq.${encodedRole}&limit=1`;
  const { data: existingRows } = await request(lookupPath, { method: 'GET' });
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  if (existing?.id) {
    await request(`/rest/v1/user_organization_roles?id=eq.${existing.id}`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal',
      },
      body: { active: true },
    });
    return;
  }

  await request('/rest/v1/user_organization_roles', {
    method: 'POST',
    headers: {
      Prefer: 'return=minimal',
    },
    body: [
      {
        user_id: userId,
        org_id: organizationId,
        role,
        active: true,
      },
    ],
  });
}

async function run() {
  const userId = await createOrGetUser();
  if (!userId) {
    throw new Error('Não foi possível resolver o id do usuário provisionado.');
  }

  await upsertProfile(userId);
  const organization = await upsertOrganization();
  await upsertMembership(userId, organization.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        userId,
        organizationId: organization.id,
        role,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
