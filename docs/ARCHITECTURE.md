# Arquitetura Profissional - Finance Anomalo

## Camadas

1. `src/` (Frontend)
- UI, roteamento e estado de tela
- Leituras/mutações financeiras via `services/backend/financeApi.ts`
- Leituras/mutações não críticas via Supabase com RLS (clientes/plataformas/app_settings)

2. `backend/src/routes`
- Contrato HTTP `/api/v1/*`
- Parsing e validação de entrada (Zod)
- Encaminhamento para serviços

3. `backend/src/services`
- Regras de negócio
- RBAC por organização
- Idempotência e normalização de payloads financeiros
- Orquestração entre repositórios

4. `backend/src/repositories`
- Persistência de leitura com Prisma ORM
- Persistência de mutação crítica via RPC atômica stage3

5. `prisma/schema.prisma`
- Modelagem de entidades
- Tipagem e consistência de acesso PostgreSQL

6. `supabase/sql`
- RLS, policies, hardening e RPCs transacionais

## Segurança

- JWT validado no backend via Supabase Admin
- `SUPABASE_SERVICE_ROLE_KEY` restrita ao backend/scripts
- Tabelas financeiras críticas com write revogado para `authenticated`
- Mutações críticas somente via RPC segura (`service_role`)

## Consistência

- `Idempotency-Key` obrigatório em mutações financeiras
- Hash determinístico de payload
- Soft delete (`deleted_at/deleted_by`)
- `audit_logs` em create/update/delete
- Settlement sincronizado por status pago/não pago

## Sincronização

- Supabase Realtime Bridge invalidando query cache com debounce
- Query keys centralizadas em `src/lib/queryKeys.ts`

## Observabilidade

- Logs estruturados JSON no backend
- `X-Request-Id` em respostas
- Erros padronizados (`HttpError`)
