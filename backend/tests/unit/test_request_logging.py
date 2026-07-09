import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _build_test_app():
    app = FastAPI()

    @app.get("/hello")
    def hello():
        return {"message": "ok"}

    from app.main import request_logging_middleware

    app.middleware("http")(request_logging_middleware)

    return app


def test_request_logging_middleware_logs_method_path_status(caplog):
    caplog.set_level(logging.INFO)
    app = _build_test_app()
    client = TestClient(app)
    client.get("/hello")
    assert len(caplog.records) >= 1
    log = caplog.records[0]
    assert log.levelname == "INFO"
    assert "GET" in log.getMessage()
    assert "/hello" in log.getMessage()
    assert "200" in log.getMessage()
    assert "ms" in log.getMessage()


def test_request_logging_middleware_fires_on_all_methods(caplog):
    caplog.set_level(logging.INFO)
    app = _build_test_app()
    client = TestClient(app)
    client.post("/hello")
    log_messages = [r.getMessage() for r in caplog.records]
    assert any("POST" in m and "/hello" in m for m in log_messages)
