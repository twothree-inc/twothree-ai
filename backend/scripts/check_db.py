"""Standalone DB connectivity check.

Run from the backend dir:
    python scripts/check_db.py

Prints the Postgres version and current timestamp, or the raw error.
"""

import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings


async def main() -> int:
    settings = get_settings()
    if not settings.database_url:
        print("✗ DATABASE_URL is empty. Set it in .env (or root .env).")
        return 1
    if "+asyncpg" not in settings.database_url:
        print(
            "✗ DATABASE_URL must use the asyncpg driver. "
            "Use: postgresql+asyncpg://USER:PASS@HOST:6543/postgres"
        )
        return 1

    engine = create_async_engine(
        settings.database_url,
        connect_args={"statement_cache_size": 0},
    )
    try:
        async with engine.connect() as conn:
            version = (await conn.execute(text("SELECT version()"))).scalar_one()
            now = (await conn.execute(text("SELECT now()"))).scalar_one()
            print("✓ connected")
            print(f"  version: {version}")
            print(f"  now:     {now}")
        return 0
    except Exception as exc:
        print(f"✗ connection failed: {exc!r}")
        return 1
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
