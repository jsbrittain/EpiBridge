from fastapi import Request
from fastapi.responses import JSONResponse

from app.auth.policy import PolicyError
from app.main import (
    policy_error_handler,
    unhandled_exception_handler,
    value_error_handler,
)


def _mock_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/test",
        "headers": [],
    }
    return Request(scope)


def test_policy_error_handler_returns_403():
    request = _mock_request()
    exc = PolicyError("User lacks capability 'test'")
    response = policy_error_handler(request, exc)
    assert isinstance(response, JSONResponse)
    assert response.status_code == 403
    assert response.body == b'{"detail":"Forbidden"}'


def test_value_error_handler_returns_422_with_generic_message():
    request = _mock_request()
    exc = ValueError("Some internal validation message")
    response = value_error_handler(request, exc)
    assert isinstance(response, JSONResponse)
    assert response.status_code == 422
    assert response.body == b'{"detail":"Invalid request."}'


def test_generic_exception_handler_returns_500():
    request = _mock_request()
    exc = RuntimeError("Something unexpected happened")
    response = unhandled_exception_handler(request, exc)
    assert isinstance(response, JSONResponse)
    assert response.status_code == 500
    assert response.body == b'{"detail":"Internal Server Error"}'
    assert "unexpected" not in response.body.decode()
    assert "runtime" not in response.body.decode()


def test_policy_error_does_not_leak_detail():
    request = _mock_request()
    exc = PolicyError("User lacks capability 'test'")
    response = policy_error_handler(request, exc)
    body = response.body.decode()
    assert "lacks" not in body.lower()
    assert "capability" not in body.lower()


def test_value_error_does_not_leak_message():
    request = _mock_request()
    exc = ValueError("Some internal validation message")
    response = value_error_handler(request, exc)
    body = response.body.decode()
    assert "validation" not in body.lower()
