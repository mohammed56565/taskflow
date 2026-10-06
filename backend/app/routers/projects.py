from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session
from ..common import activity, get_project, paging, paginate, project_stats, project_view, user_view, visible_projects
from ..database import get_db
from ..models import Project, ProjectMember, Task, User, now
from ..schemas import MemberAdd, ProjectCreate, ProjectUpdate
from ..security import current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


def validate_manager(db, manager_id):
    manager = db.get(User, manager_id)
    if not manager or not manager.is_active or manager.role not in ("Admin", "Project Manager"):
        raise HTTPException(422, "Choose an active project manager")
    return manager


def ensure_membership(db, pid, uid):
    if not db.scalar(select(ProjectMember.id).where(ProjectMember.project_id == pid, ProjectMember.user_id == uid)):
        db.add(ProjectMember(project_id=pid, user_id=uid))


@router.get("")
def listing(q: str = Query("", max_length=200), status: str | None = None, manager_id: int | None = None,
            archived: bool = False, sort: Literal["name", "start_date", "due_date", "created_at"] = "created_at",
            direction: Literal["asc", "desc"] = "desc", pagination=Depends(paging),
            user: User = Depends(current_user), db: Session = Depends(get_db)):
    stmt = select(Project).where(Project.id.in_(visible_projects(user)), Project.name.ilike(f"%{q}%"))
    stmt = stmt.where(Project.archived_at.is_not(None) if archived else Project.archived_at.is_(None))
    if status:
        stmt = stmt.where(Project.status == status)
    if manager_id:
        stmt = stmt.where(Project.manager_id == manager_id)
    column = getattr(Project, sort)
    result = paginate(db, stmt.order_by(column.desc() if direction == "desc" else column.asc(), Project.id), *pagination)
    stats = project_stats(db, [p.id for p in result["items"]])
    result["items"] = [project_view(p, stats.get(p.id)) for p in result["items"]]
    return result


@router.post("", status_code=201)
def create(data: ProjectCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "Member":
        raise HTTPException(403, "Project management permission required")
    if data.start_date > data.due_date:
        raise HTTPException(422, "Start date must not be after due date")
    manager_id = data.manager_id or user.id
    if user.role != "Admin" and manager_id != user.id:
        raise HTTPException(403, "Project Managers must create projects under their own management")
    validate_manager(db, manager_id)
    project = Project(**data.model_dump(exclude={"manager_id"}), manager_id=manager_id)
    db.add(project)
    db.flush()
    ensure_membership(db, project.id, manager_id)
    activity(db, user, "project_created", "project", project.id, f'{user.name} created "{project.name}".', project.id)
    db.flush()
    return project_view(project)


@router.get("/{project_id}")
def detail(project_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, project_id, user)
    return project_view(project, project_stats(db, [project_id]).get(project_id))


@router.put("/{project_id}")
def edit(project_id: int, data: ProjectUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, project_id, user, manage=True, writable=True, lock=True)
    if data.start_date > data.due_date:
        raise HTTPException(422, "Start date must not be after due date")
    if db.scalar(select(Task.id).where(Task.project_id == project.id, Task.due_date.is_not(None),
                                      or_(Task.due_date < data.start_date, Task.due_date > data.due_date)).limit(1)):
        raise HTTPException(409, "Existing task due dates must remain inside the project date range")
    validate_manager(db, data.manager_id)
    ensure_membership(db, project.id, data.manager_id)
    for key, value in data.model_dump().items():
        setattr(project, key, value)
    activity(db, user, "project_updated", "project", project.id, f'{user.name} updated "{project.name}".', project.id)
    db.flush()
    db.expire(project, ["manager"])
    return project_view(project, project_stats(db, [project.id]).get(project.id))


@router.post("/{project_id}/archive")
def archive(project_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, project_id, user, manage=True, writable=True, lock=True)
    project.previous_status, project.status, project.archived_at = project.status, "Archived", now()
    activity(db, user, "project_archived", "project", project.id, f'{user.name} archived "{project.name}".', project.id)
    return {"detail": "Project archived"}


@router.post("/{project_id}/restore")
def restore(project_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, project_id, user, manage=True, lock=True)
    if not project.archived_at:
        raise HTTPException(409, "Project is not archived")
    project.status, project.archived_at = project.previous_status or "Planning", None
    activity(db, user, "project_restored", "project", project.id, f'{user.name} restored "{project.name}".', project.id)
    return {"detail": "Project restored"}


@router.get("/{project_id}/members")
def members(project_id: int, q: str = Query("", max_length=200), pagination=Depends(paging),
            user: User = Depends(current_user), db: Session = Depends(get_db)):
    get_project(db, project_id, user)
    stmt = select(ProjectMember).join(User, User.id == ProjectMember.user_id).where(
        ProjectMember.project_id == project_id, User.name.ilike(f"%{q}%")).order_by(User.name, ProjectMember.id)
    return paginate(db, stmt, *pagination, lambda m: {**user_view(m.user), "joined_at": m.joined_at})


@router.post("/{project_id}/members", status_code=201)
def add_member(project_id: int, data: MemberAdd, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, project_id, user, manage=True, writable=True, lock=True)
    member = db.get(User, data.user_id)
    if not member or not member.is_active:
        raise HTTPException(422, "Choose an active user")
    if db.scalar(select(ProjectMember.id).where(ProjectMember.project_id == project_id, ProjectMember.user_id == member.id)):
        raise HTTPException(409, "User is already a project member")
    db.add(ProjectMember(project_id=project_id, user_id=member.id))
    activity(db, user, "member_added", "project", project_id, f"{user.name} added {member.name} to the project.", project_id)
    return {"detail": "Member added"}


@router.delete("/{project_id}/members/{member_id}")
def remove_member(project_id: int, member_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, project_id, user, manage=True, writable=True, lock=True)
    if project.manager_id == member_id:
        raise HTTPException(409, "Assign a replacement manager before removing this member")
    membership = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == member_id))
    if not membership:
        raise HTTPException(404, "Membership not found")
    # Archived unfinished tasks still have ownership; restore and reassign those first.
    if db.scalar(select(Task.id).where(Task.project_id == project_id, Task.assigned_to == member_id, Task.status != "Completed").limit(1)):
        raise HTTPException(409, "Reassign this member's unfinished tasks before removing them")
    activity(db, user, "member_removed", "project", project_id, f"{user.name} removed {membership.user.name} from the project.", project_id)
    db.delete(membership)
    return {"detail": "Member removed"}
