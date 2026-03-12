import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const targetEnvPath = path.join(cwd, '.env');
const fallbackEnvPath = path.join(cwd, 'aiox-core', '.env');

const parseEnv = (raw) => {
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1);
    result[key] = value;
  }
  return result;
};

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, 'utf8'));
};

const current = readEnvFile(targetEnvPath);
const fallback = readEnvFile(fallbackEnvPath);

const env = {
  VITE_SUPABASE_URL: current.VITE_SUPABASE_URL ?? fallback.SUPABASE_URL ?? '',
  VITE_SUPABASE_ANON_KEY: current.VITE_SUPABASE_ANON_KEY ?? fallback.SUPABASE_ANON_KEY ?? '',
  VITE_FINANCE_API_URL: current.VITE_FINANCE_API_URL ?? 'http://localhost:8787/api',
  SUPABASE_URL: current.SUPABASE_URL ?? fallback.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: current.SUPABASE_SERVICE_ROLE_KEY ?? fallback.SUPABASE_SERVICE_ROLE_KEY ?? '',
  DATABASE_URL:
    current.DATABASE_URL ?? fallback.DATABASE_URL ?? fallback.SUPABASE_DB_URL ?? '',
  PORT: current.PORT ?? '8787',
  CORS_ORIGIN: current.CORS_ORIGIN ?? 'http://localhost:5173',
};

const output = [
  '# Frontend',
  `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL}`,
  `VITE_SUPABASE_ANON_KEY=${env.VITE_SUPABASE_ANON_KEY}`,
  `VITE_FINANCE_API_URL=${env.VITE_FINANCE_API_URL}`,
  '',
  '# Backend',
  `SUPABASE_URL=${env.SUPABASE_URL}`,
  `SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY}`,
  `DATABASE_URL=${env.DATABASE_URL}`,
  `PORT=${env.PORT}`,
  `CORS_ORIGIN=${env.CORS_ORIGIN}`,
  '',
].join('\n');

fs.writeFileSync(targetEnvPath, output, 'utf8');

const missing = Object.entries(env)
  .filter(([, value]) => !value)
  .map(([key]) => key);

console.log(`Arquivo .env atualizado em ${targetEnvPath}`);
if (missing.length > 0) {
  console.log(`Variáveis pendentes: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Todas as variáveis obrigatórias foram preenchidas.');
}
