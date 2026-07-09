import logging

from app.core.logging import configure_logging


def _reset_root():
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    root.setLevel(logging.WARNING)


def test_configure_logging_sets_root_level():
    _reset_root()
    configure_logging("DEBUG")
    root = logging.getLogger()
    assert root.level == logging.DEBUG


def test_configure_logging_defaults_to_info():
    _reset_root()
    configure_logging()
    root = logging.getLogger()
    assert root.level == logging.INFO


def test_configure_logging_suppresses_module_loggers():
    _reset_root()
    configure_logging("DEBUG")

    suppressed = (
        "alembic",
        "asyncio",
        "sqlalchemy.engine",
        "uvicorn",
        "uvicorn.access",
    )
    for name in suppressed:
        logger = logging.getLogger(name)
        assert logger.level == logging.WARN, (
            f"Logger '{name}' should be WARN, got {logger.level}"
        )
        assert logger.propagate is False


def test_configure_logging_respects_level_case():
    _reset_root()
    configure_logging("debug")
    assert logging.getLogger().level == logging.DEBUG
