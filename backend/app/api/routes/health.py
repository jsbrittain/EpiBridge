import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import SessionLocal

logger = logging.getLogger("epibridge")

router = APIRouter()


@router.get("/health")
def health():
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception as exc:
        logger.warning("Health check — database unreachable: %s", exc)

    status = "ok" if db_ok else "degraded"
    return {"status": status, "database": "connected" if db_ok else "disconnected"}
