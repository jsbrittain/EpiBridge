import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth import get_identity_provider
from app.auth.base import AuthenticationError
from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ValidEmail
from app.schemas.user import UserRead
from app.services.session_service import (
    cleanup_user_sessions,
    create_session,
    delete_session,
)

router = APIRouter(prefix="/auth")

# In-memory rate limit tracking: email -> [(timestamp, ...)]
_attempts: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(key: str) -> None:
    now = time.time()
    window = settings.rate_limit_window_seconds
    max_attempts = settings.rate_limit_max_attempts
    attempts = _attempts[key]
    # Remove expired entries
    _attempts[key] = [t for t in attempts if now - t < window]
    if len(_attempts[key]) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )
    _attempts[key].append(now)


class LoginBody(BaseModel):
    email: ValidEmail
    password: str


@router.post("/login", response_model=UserRead)
def login(
    body: LoginBody,
    response: Response,
    db: DBSession = Depends(get_db),
):
    _check_rate_limit(body.email)

    provider = get_identity_provider()
    try:
        user = provider.authenticate(db, email=body.email, password=body.password)
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Rotate: invalidate all existing sessions for this user
    cleanup_user_sessions(db, user.id)

    session = create_session(db, user.id)
    response.set_cookie(
        key="session_id",
        value=session.id,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookie,
        path="/",
    )
    return user


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session_id = request.cookies.get("session_id")
    if session_id:
        delete_session(db, session_id)
    response.delete_cookie(
        key="session_id",
        path="/",
    )
