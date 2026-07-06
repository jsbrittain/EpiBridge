from sqlalchemy import text


def test_database_connection(db_connection):
    result = db_connection.execute(text("SELECT 1"))
    assert result.scalar() == 1
