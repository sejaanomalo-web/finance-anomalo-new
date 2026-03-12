#!/usr/bin/env python3
from pathlib import Path
import sys

try:
    import psycopg
except Exception:
    print("psycopg não está instalado. Rode: python3 -m pip install --user 'psycopg[binary]'")
    sys.exit(1)


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


def load_env(env_path: Path) -> dict:
    out = {}
    if not env_path.exists():
        return out

    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip()
    return out


def run_sql_file(cur, path: Path) -> None:
    print(f"Aplicando {path.relative_to(ROOT)}...")
    cur.execute(path.read_text())
    print(f"OK: {path.name}")


def normalize_is_org_member(cur) -> None:
    cur.execute(
        """
        create schema if not exists private;
        create or replace function private.is_org_member(p_org_id uuid, p_user_id uuid)
        returns boolean
        language sql
        stable
        security definer
        set search_path = public
        as $$
          select exists (
            select 1
              from public.user_organization_roles uor
             where uor.org_id = p_org_id
               and uor.user_id = p_user_id
               and uor.active = true
          );
        $$;
        """
    )


def has_baseline(cur) -> bool:
    cur.execute(
        """
        select count(*)
          from information_schema.tables
         where table_schema = 'public'
           and table_name in ('profiles', 'organizations', 'user_organization_roles');
        """
    )
    return cur.fetchone()[0] == 3


def main() -> int:
    env = load_env(ENV_PATH)
    dsn = env.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL não encontrado em .env")
        return 1

    sync_setup = ROOT / "supabase/sql/finance_sync_setup.sql"
    avatar_support = ROOT / "supabase/sql/finance_avatar_support.sql"
    security_hardening = ROOT / "supabase/sql/finance_security_hardening.sql"
    stage3_hardening = ROOT / "supabase/sql/finance_stage3_hardening.sql"
    smoke_test = ROOT / "supabase/sql/finance_sync_smoke_test.sql"

    sql_files = [sync_setup, avatar_support, security_hardening, stage3_hardening, smoke_test]

    missing = [str(p) for p in sql_files if not p.exists()]
    if missing:
        print("Arquivos SQL ausentes:")
        for item in missing:
            print(f"- {item}")
        return 1

    with psycopg.connect(dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            normalize_is_org_member(cur)
            baseline_exists = has_baseline(cur)
            files_to_apply = [avatar_support, security_hardening, stage3_hardening]
            if not baseline_exists:
                files_to_apply.insert(0, sync_setup)
            else:
                print("Baseline detectada (tabelas principais existem). Pulando finance_sync_setup.sql.")

            for file_path in files_to_apply:
                try:
                    run_sql_file(cur, file_path)
                except Exception as error:
                    print(f"AVISO: {file_path.name} retornou erro e será continuado: {error}")

            run_sql_file(cur, smoke_test)

    print("Sequência SQL aplicada com sucesso.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
