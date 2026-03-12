# FINANCE ANOMALO (Clone Funcional)

Clone arquitetural do sistema **FINANCE ANOMALO** com:
- Frontend React + TypeScript + Vite + Tailwind v4
- API financeira Node.js (HTTP nativo, sem Express)
- Supabase (PostgreSQL/Auth/Realtime/Storage)
- Segurança stage3 (RBAC, idempotência, soft delete, audit logs)

## Stack

- React 19 + TypeScript 5.9 + Vite 7
- React Router 7 + React Query 5
- Recharts + Lucide
- Tailwind CSS v4 (temas `dark`, `midnight`, `light`)
- Node.js ESM (`backend/src/server.js`)
- Zod + Supabase JS (service_role no backend)
- Prisma ORM (`prisma/schema.prisma`) para acesso de dados PostgreSQL

## Scripts

- `npm run dev` - frontend (`http://localhost:5173`)
- `npm run api` - backend (`http://localhost:8787`)
- `npm run build` - build TS + Vite
- `npm run lint` - ESLint
- `npm run provision:user -- <email> <password> <full_name> <org_name> <org_slug> [role]`
- `npm run env:bootstrap` - cria/atualiza `.env` (reaproveita `aiox-core/.env` quando existir)
- `npm run db:apply` - aplica SQL do Supabase em ordem (inclui smoke test)
- `npm run db:smoke` - executa apenas o smoke test SQL
- `npm run prisma:generate` - gera Prisma Client
- `npm run prisma:validate` - valida schema Prisma

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

### Frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FINANCE_API_URL` (local recomendado: `http://localhost:8787/api`; em produção use URL pública da API)
- `VITE_BASE_PATH` (opcional, default `/`; útil para GitHub Pages/subpath)

### Backend
- `SUPABASE_URL` (aceita fallback de `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (string PostgreSQL do Supabase para ORM)
- `PORT` (default `8787`)
- `CORS_ORIGIN` (default `http://localhost:5173`; aceita lista separada por vírgula ou `*`)

Regra crítica: **nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend**.

## Arquitetura Implementada

```
Frontend (React)
    ↓
Backend API (Node HTTP + Zod + Auth/RBAC)
    ↓
ORM (Prisma)
    ↓
Supabase PostgreSQL (RLS + RPC + Auth + Storage + Realtime)
```

- Leitura operacional: API usa repositórios com Prisma.
- Escrita financeira crítica: API usa RPC atômica stage3 com idempotência/auditoria.
- Auth JWT: validado server-side com Supabase Admin.
- Frontend não escreve tabelas financeiras críticas diretamente.

## Estrutura

- `src/` frontend
  - `pages/` telas
  - `hooks/` React Query e integrações
  - `contexts/` AuthContext e OrgContext
  - `services/backend/financeApi.ts` cliente da API financeira
  - `integrations/supabase/` client e tipos
  - `components/supabase/SupabaseRealtimeBridge.tsx`
  - `components/app/AppThemeSync.tsx`
- `backend/src/` backend
  - `server.js`
  - `routes/financeRoutes.js`
  - `validation/financeSchemas.js`
  - `middleware/auth.js`
  - `services/financeService.js`
  - `services/financeReadService.js`
  - `repositories/*`
  - `lib/*`
- `prisma/`
  - `schema.prisma`
- `supabase/sql/` scripts SQL

## Setup local

1. Instalar dependências:

```bash
npm install
npm run prisma:generate
npm run env:bootstrap
python3 -m pip install --user 'psycopg[binary]'
```

2. Preencher variáveis pendentes no `.env` (principalmente `DATABASE_URL`, se não vier do bootstrap).

3. Aplicar SQL no Supabase:

```bash
npm run db:apply
```

4. Provisionar usuário inicial:

```bash
npm run provision:user -- admin@empresa.com SenhaForte123 "Admin" "Minha Empresa" "minha-empresa" owner
```

5. Rodar API e frontend:

```bash
npm run api
npm run dev
```

## Deploy (GitHub/Web)

- Frontend em subpath (ex.: GitHub Pages): configure `VITE_BASE_PATH` com o caminho base (ex.: `/finance-anomalo/`).
- Frontend em domínio público: configure `VITE_FINANCE_API_URL` para a URL da API de produção.
- Backend: configure `CORS_ORIGIN` com todas as origens permitidas (ex.: `https://seuapp.com,https://usuario.github.io`).
- CI: o repositório agora inclui workflow em `.github/workflows/ci.yml` para rodar `npm ci`, `npm run lint` e `npm run build`.

## Contrato API

Base: `/api`

- `GET /api/health`
- `GET /api/v1/receivables?orgId=...`
- `POST /api/v1/receivables`
- `PATCH /api/v1/receivables/:id`
- `DELETE /api/v1/receivables/:id`
- `GET /api/v1/payables?orgId=...`
- `POST /api/v1/payables`
- `PATCH /api/v1/payables/:id`
- `DELETE /api/v1/payables/:id`
- `GET /api/v1/cash-flow?orgId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/v1/top-clients?orgId=...&startDate=...&endDate=...&limit=...`

Mutações exigem `Idempotency-Key` e Bearer token.

## Checklist de Validação Manual

1. Login/logout e troca de organização funcionais.
2. CRUD de clientes e plataformas funciona via Supabase com RLS.
3. CRUD de receivables/payables funciona somente via API.
4. Reenvio de mutação com mesma `Idempotency-Key` + mesmo payload retorna mesma resposta.
5. Reenvio com mesma key e payload diferente retorna conflito.
6. Mudar status para `paid` gera settlement automaticamente.
7. Voltar status para `pending/overdue` remove settlement.
8. `DELETE` financeiro faz soft delete (`deleted_at/deleted_by`) e remove settlement.
9. `audit_logs` são gerados em create/update/delete financeiro.
10. Dashboard e relatórios usam apenas dados reais do banco.
11. Realtime sincroniza múltiplas sessões (invalidação React Query).
12. Upload de avatar funciona em path seguro (`clients/{org_id}/{client_id}/...` e `users/{uid}/...`).
13. `finance_sync_smoke_test.sql` executa sem falhas.

## Observações de Paridade

- Artefatos legados de escrita direta no backend não foram expostos ao frontend.
- Tipos Supabase já incluem colunas stage3 (`deleted_at/deleted_by`, `finance_idempotency_keys`).
- A inconsistência de helper monetário foi corrigida funcionalmente (`centsToMoney` implementado no backend).
