import os

from alembic.config import Config
from sqlalchemy import inspect

from alembic import command

_ALEMBIC_INI = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "alembic.ini",
)


def _alembic_config() -> Config:
    return Config(_ALEMBIC_INI)


def ensure_migrated() -> None:
    """Ensure the database is at the current migration revision.

    - If the database is empty, applies all migrations.
    - If the database is already migrated, applies any pending migrations.
    - If the database has tables but no Alembic tracking, raises a clear
      error: the operator must manually verify schema compatibility and
      run ``alembic stamp head``.
    """
    from app.db.session import engine

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    has_alembic_version = "alembic_version" in existing_tables

    if not existing_tables:
        _upgrade()
        return

    if has_alembic_version:
        _upgrade()
        return

    raise RuntimeError(
        "Database contains tables but no alembic_version table. "
        "This indicates a schema created by the old development-time "
        "create_all() mechanism. Alembic cannot safely adopt this "
        "schema automatically. "
        "To adopt, manually verify the schema matches the initial "
        "migration and run: alembic stamp head"
    )


def _upgrade() -> None:
    config = _alembic_config()
    command.upgrade(config, "head")
