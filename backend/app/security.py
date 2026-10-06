import hashlib
import secrets
import uuid
from datetime import timedelta
import jwt
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import RefreshSession, User, now

hasher = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(24))


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def issue_access(user, session):
    return jwt.encode({"sub": str(user.id), "sid": session.id, "type": "access", "iat": now(),
                       "exp": now() + timedelta(minutes=settings.access_minutes)}, settings.jwt_secret, algorithm="HS256")


def set_refresh(response: Response, raw):
    response.set_cookie("taskflow_refresh", raw, httponly=True, secure=settings.cookie_secure,
                        samesite="strict", path="/api/auth", max_age=settings.refresh_days * 86400)


def new_session(db, user, response):
    raw = secrets.token_urlsafe(48)
    session = RefreshSession(id=str(uuid.uuid4()), user_id=user.id, token_hash=digest(raw),
                             expires_at=now() + timedelta(days=settings.refresh_days))
    db.add(session)
    db.flush()
    set_refresh(response, raw)
    return {"access_token": issue_access(user, session), "token_type": "bearer"}


def check_origin(request: Request):
    origin = request.headers.get("origin")
    if origin and origin not in settings.origins:
        raise HTTPException(403, "Origin is not allowed")


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    try:
        if not credentials:
            raise ValueError()
        claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"],
                            options={"require": ["exp", "iat", "sub", "sid", "type"]})
        if claims["type"] != "access":
            raise ValueError()
        session = db.get(RefreshSession, claims["sid"])
        user = db.get(User, int(claims["sub"]))
        if not session or session.revoked or session.expires_at <= now() or not user or not user.is_active or session.user_id != user.id:
            raise ValueError()
        return user
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise HTTPException(401, "Authentication required", headers={"WWW-Authenticate": "Bearer"})


def admin_user(user: User = Depends(current_user)):
    if user.role != "Admin":
        raise HTTPException(403, "Administrator access required")
    return user
