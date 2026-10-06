from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session
from ..common import activity, paging, paginate, user_view
from ..database import get_db
from ..models import Project, RefreshSession, SystemLock, User
from ..schemas import UserCreate, UserUpdate
from ..security import admin_user, current_user, hasher

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
def users(q: str = Query("", max_length=200), role: str | None = None, active: bool | None = None,
          pagination=Depends(paging), user: User = Depends(admin_user), db: Session = Depends(get_db)):
    stmt = select(User).where(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    if role:
        stmt = stmt.where(User.role == role)
    if active is not None:
        stmt = stmt.where(User.is_active == active)
    return paginate(db, stmt.order_by(User.name, User.id), *pagination, user_view)


@router.get("/directory")
def directory(q: str = Query("", max_length=200), role: str | None = None, pagination=Depends(paging),
              user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "Member":
        raise HTTPException(403, "Project management permission required")
    stmt = select(User).where(User.is_active.is_(True), or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    if role:
        stmt = stmt.where(User.role == role)
    return paginate(db, stmt.order_by(User.name, User.id), *pagination, user_view)


@router.post("", status_code=201)
def create(data: UserCreate, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise HTTPException(409, "Email is already in use")
    person = User(**data.model_dump(exclude={"password"}), password_hash=hasher.hash(data.password))
    db.add(person)
    db.flush()
    activity(db, user, "user_created", "user", person.id, f"{user.name} created account for {person.name}.")
    return user_view(person)


@router.put("/{user_id}")
def edit(user_id: int, data: UserUpdate, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    # All administrator edits serialize on this row, including simultaneous demotions.
    db.scalar(select(SystemLock).where(SystemLock.id == 1).with_for_update())
    person = db.get(User, user_id, populate_existing=True)
    if not person:
        raise HTTPException(404, "User not found")
    if person.role == "Admin" and person.is_active and (data.role != "Admin" or not data.is_active):
        count = db.scalar(select(func.count(User.id)).where(User.role == "Admin", User.is_active.is_(True)))
        if count <= 1:
            raise HTTPException(409, "At least one active Admin must remain")
    if data.role not in ("Project Manager", "Admin") and db.scalar(select(Project.id).where(Project.manager_id == person.id).limit(1)):
        raise HTTPException(409, "Assign replacement project managers before changing this user's role")
    if db.scalar(select(User.id).where(User.email == data.email, User.id != user_id)):
        raise HTTPException(409, "Email is already in use")
    if not data.is_active or data.role != person.role:
        db.execute(update(RefreshSession).where(RefreshSession.user_id == person.id).values(revoked=True))
    for key, value in data.model_dump().items():
        setattr(person, key, value)
    activity(db, user, "user_updated", "user", person.id, f"{user.name} updated account for {person.name}.")
    db.flush()
    return user_view(person)
