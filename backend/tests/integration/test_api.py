def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["redis"] == "connected"


def test_health_endpoint_response_shape(client):
    response = client.get("/api/health")
    data = response.json()
    assert set(data.keys()) == {"status", "database", "redis"}
    assert data["status"] in ("ok", "degraded")
    assert data["database"] in ("connected", "disconnected")
    assert data["redis"] in ("connected", "disconnected")
