import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');

const parseEnv = (raw) => {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1);
    out[key] = value;
  }
  return out;
};

if (fs.existsSync(envPath)) {
  const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não encontrado. Preencha .env e execute novamente.');
  process.exit(1);
}

const files = [
  'supabase/sql/finance_sync_setup.sql',
  'supabase/sql/finance_avatar_support.sql',
  'supabase/sql/finance_security_hardening.sql',
  'supabase/sql/finance_stage3_hardening.sql',
  'supabase/sql/finance_sync_smoke_test.sql',
];

for (const relativeFile of files) {
  const absoluteFile = path.join(cwd, relativeFile);
  if (!fs.existsSync(absoluteFile)) {
    console.error(`Arquivo SQL não encontrado: ${relativeFile}`);
    process.exit(1);
  }

  console.log(`\nAplicando ${relativeFile}...`);
  const result = spawnSync(
    'npx',
    ['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', relativeFile],
    {
      cwd,
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    console.error(`Falha ao aplicar ${relativeFile}.`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nSQL aplicado com sucesso em toda a sequência.');
