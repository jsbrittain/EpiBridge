import logging.config

_LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S UTC",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "level": "NOTSET",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
    },
    "loggers": {
        "alembic": {
            "level": "WARN",
            "handlers": ["console"],
            "propagate": False,
        },
        "asyncio": {
            "level": "WARN",
            "handlers": ["console"],
            "propagate": False,
        },
        "sqlalchemy.engine": {
            "level": "WARN",
            "handlers": ["console"],
            "propagate": False,
        },
        "uvicorn": {
            "level": "WARN",
            "handlers": ["console"],
            "propagate": False,
        },
        "uvicorn.access": {
            "level": "WARN",
            "handlers": ["console"],
            "propagate": False,
        },
    },
}


def configure_logging(level: str = "INFO") -> None:
    _LOG_CONFIG["root"]["level"] = level.upper()
    logging.config.dictConfig(_LOG_CONFIG)
