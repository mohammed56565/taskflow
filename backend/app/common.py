from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException, Query
from sqlalchemy import Integer, func, or_, select
from .config import settings
from .models import ActivityLog, Notification, Project, ProjectMember, Task, User


def today():
    return datetime.now(ZoneInfo(settings.timezone)).date()


def user_view(u):
    return {k: getattr(u, k) for k in ("id", "name", "email", "role", "is_active", "created_at", "updated_at")}


def visible_projects(user):
    if user.role == "Admin":
        return select(Project.id)
    return select(Project.id).where(or_(Project.manager_id == user.id, Project.id.in_(
        select(ProjectMember.project_id).where(ProjectMember.user_id == user.id))))


def can_manage(user, project):
    return user.role == "Admin" or (user.role == "Project Manager" and project.manager_id == user.id)


def get_project(db, project_id, user, manage=False, writable=False, lock=False):
    stmt = select(Project).where(Project.id == project_id, Project.id.in_(visible_projects(user)))
    if lock:
        stmt = stmt.with_for_update(of=Project)
    project = db.scalar(stmt)
    if not project:
        raise HTTPException(404, "Project not found")
    if manage and not can_manage(user, project):
        raise HTTPException(403, "Project management permission required")
    if writable and project.archived_at:
        raise HTTPException(409, "Archived projects are read-only")
    return project


def get_task(db, task_id, user, manage=False, writable=False, lock=False, allow_archived=False):
    task = db.scalar(select(Task).where(Task.id == task_id, Task.project_id.in_(visible_projects(user))))
    if not task:
        raise HTTPException(404, "Task not found")
    project = get_project(db, task.project_id, user, manage, writable, lock)
    if lock:
        db.refresh(task)
    if writable and task.archived_at and not allow_archived:
        raise HTTPException(409, "Archived tasks are read-only")
    task.project = project
    return task


def project_stats(db, ids):
    if not ids:
        return {}
    rows = db.execute(select(Task.project_id, func.count(Task.id),
                             func.sum((Task.status == "Completed").cast(Integer)))
                      .where(Task.project_id.in_(ids), Task.archived_at.is_(None)).group_by(Task.project_id))
    return {r[0]: {"total_tasks": r[1], "completed_tasks": int(r[2] or 0),
                   "progress": round((r[2] or 0) * 100 / r[1])} for r in rows}


def project_view(p, stats=None):
    return {**{k: getattr(p, k) for k in ("id", "name", "description", "manager_id", "status", "start_date", "due_date", "created_at", "updated_at", "archived_at")},
            "manager": user_view(p.manager), **(stats or {"total_tasks": 0, "completed_tasks": 0, "progress": 0})}


def task_view(t):
    current = today()
    pending = not t.archived_at and t.status != "Completed"
    return {**{k: getattr(t, k) for k in ("id", "project_id", "title", "description", "assigned_to", "priority", "status", "due_date", "created_by", "completed_at", "archived_at", "created_at", "updated_at")},
            "assignee": user_view(t.assignee) if t.assignee else None, "creator": user_view(t.creator),
            "project_name": t.project.name, "manager_id": t.project.manager_id,
            "project_archived": bool(t.project.archived_at),
            "overdue": bool(pending and t.due_date and t.due_date < current),
            "due_soon": bool(pending and t.due_date and current <= t.due_date <= current + timedelta(days=3))}


def paginate(db, stmt, page, page_size, serializer=lambda x: x):
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    records = db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).unique().all()
    return {"items": [serializer(x) for x in records], "total": total, "page": page, "page_size": page_size}


def paging(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    return page, page_size


def activity(db, user, action, entity, entity_id, description, project_id=None):
    db.add(ActivityLog(user_id=user.id, action=action, entity_type=entity, entity_id=entity_id,
                       description=description, project_id=project_id))


def notify(db, recipients, kind, task, message, exclude=None):
    for uid in set(recipients) - {None, exclude}:
        db.add(Notification(user_id=uid, type=kind, message=message, related_entity_id=task.id))


def check_assignee(db, project, uid):
    if uid is None:
        return
    person = db.get(User, uid)
    membership = db.scalar(select(ProjectMember.id).where(ProjectMember.project_id == project.id, ProjectMember.user_id == uid))
    if not person or not person.is_active or not membership:
        raise HTTPException(422, "Assignee must be an active project member")


def check_task_date(project, due_date):
    if due_date and not project.start_date <= due_date <= project.due_date:
        raise HTTPException(422, "Task due date must be within the project's dates")
