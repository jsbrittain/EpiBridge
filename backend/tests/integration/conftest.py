import pytest

from app.core.config import settings
from app.db.session import engine


@pytest.fixture
def db_connection():
    with engine.connect() as conn:
        yield conn


@pytest.fixture
def redis_client():
    import redis as redis_lib

    r = redis_lib.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password,
        decode_responses=True,
    )
    yield r
    r.close()
