#!/usr/bin/env python3
from pathlib import Path
import sys

try:
    import psycopg
except Exception:
    print("psycopg não está instalado. Rode: python3 -m pip install --user 'psycopg[binary]'")
    sys.exit(1)


def load_env() -> dict:
    env_path = Path(".env")
    if not env_path.exists():
        return {}

    env = {}
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def main() -> int:
    env = load_env()
    dsn = env.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL não encontrado em .env")
        return 1

    smoke_sql = Path("supabase/sql/finance_sync_smoke_test.sql")
    if not smoke_sql.exists():
        print(f"Arquivo ausente: {smoke_sql}")
        return 1

    with psycopg.connect(dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(smoke_sql.read_text())

    print("SMOKE_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
