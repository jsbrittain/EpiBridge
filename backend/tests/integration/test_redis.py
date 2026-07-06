def test_redis_connection(redis_client):
    assert redis_client.ping() is True
