import os
import time
import logging
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.db.base import Base
import app.models  # noqa: F401 — import all models so metadata is populated

logger = logging.getLogger("alembic.env")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override URL from environment if available
# Prefer internal URL on Render (faster, paid plans), fall back to external
db_url = (os.environ.get("DATABASE_INTERNAL_URL") or "").strip() or os.environ.get("DATABASE_URL")
if db_url:
    # Render provides postgres:// but SQLAlchemy 2.0 requires postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    # Strip any async driver prefix — Alembic uses sync psycopg2
    if "+asyncpg" in db_url:
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # Retry logic: database may not be ready on first deploy (Render cold start)
    retries = 5
    for attempt in range(retries):
        try:
            with connectable.connect() as connection:
                context.configure(
                    connection=connection, target_metadata=target_metadata
                )
                with context.begin_transaction():
                    context.run_migrations()
            return
        except Exception as e:
            if attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                logger.warning(
                    "DB connection failed (attempt %d/%d), retrying in %ds: %s",
                    attempt + 1,
                    retries,
                    wait,
                    e,
                )
                time.sleep(wait)
            else:
                raise


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
