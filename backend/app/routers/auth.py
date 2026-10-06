import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from ..common import activity, user_view
from ..database import get_db
from ..models import RefreshSession, User, now
from ..schemas import Login, PasswordChange, ProfileUpdate
from ..security import DUMMY_HASH, check_origin, current_user, digest, hasher, issue_access, new_session, set_refresh

router = APIRouter(prefix="/auth", tags=["Authentication & profile"])


@router.post("/login")
def login(data: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    check_origin(request)
    user = db.scalar(select(User).where(User.email == data.email))
    valid = hasher.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid or not user.is_active:
        raise HTTPException(401, "Invalid email or password, or account is disabled")
    return {**new_session(db, user, response), "user": user_view(user)}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    check_origin(request)
    token = request.cookies.get("taskflow_refresh", "")
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == digest(token)).with_for_update())
    if not session or session.revoked or session.expires_at <= now():
        raise HTTPException(401, "Session expired. Please sign in again")
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Account is disabled")
    raw = secrets.token_urlsafe(48)
    session.token_hash = digest(raw)
    set_refresh(response, raw)
    return {"access_token": issue_access(user, session), "token_type": "bearer", "user": user_view(user)}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    check_origin(request)
    token = request.cookies.get("taskflow_refresh", "")
    db.execute(update(RefreshSession).where(RefreshSession.token_hash == digest(token)).values(revoked=True))
    response.delete_cookie("taskflow_refresh", path="/api/auth")
    return {"detail": "Signed out"}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return user_view(user)


@router.put("/me")
def profile(data: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.email == data.email, User.id != user.id)):
        raise HTTPException(409, "Email is already in use")
    user.name, user.email = data.name, data.email
    db.flush()
    return user_view(user)


@router.post("/password")
def password(data: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not hasher.verify(data.current_password, user.password_hash):
        raise HTTPException(422, "Current password is incorrect")
    user.password_hash = hasher.hash(data.new_password)
    db.execute(update(RefreshSession).where(RefreshSession.user_id == user.id).values(revoked=True))
    activity(db, user, "password_changed", "user", user.id, f"{user.name} changed their password.")
    return {"detail": "Password changed. Sign in again on all devices"}
