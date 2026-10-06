from datetime import timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..common import project_stats, project_view, task_view, today, visible_projects
from ..config import settings
from ..database import get_db
from ..models import Project, Task, User
from ..security import current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    access = visible_projects(user)
    filters = [Task.project_id.in_(access), Task.archived_at.is_(None)]
    if user.role == "Member":
        filters.append(Task.assigned_to == user.id)
    def count(*extra):
        return db.scalar(select(func.count(Task.id)).where(*filters, *extra))
    def grouped(column):
        return dict(db.execute(select(column, func.count(Task.id)).where(*filters).group_by(column)).all())
    projects = db.scalars(select(Project).where(Project.id.in_(access), Project.archived_at.is_(None))
                          .order_by(Project.due_date, Project.id).limit(6)).all()
    stats = project_stats(db, [p.id for p in projects])
    by_member = db.execute(select(User.name, Task.assigned_to, func.count(Task.id)).outerjoin(User, User.id == Task.assigned_to)
                           .where(*filters).group_by(Task.assigned_to, User.name).order_by(func.count(Task.id).desc()).limit(10)).all()
    return {
        "business_date": today(), "business_timezone": settings.timezone,
        "active_projects": db.scalar(select(func.count(Project.id)).where(Project.id.in_(access), Project.status == "Active")),
        "total_tasks": count(), "my_tasks": count(Task.assigned_to == user.id, Task.status != "Completed"),
        "completed_tasks": count(Task.status == "Completed"), "unassigned_tasks": count(Task.assigned_to.is_(None)),
        "overdue": count(Task.status != "Completed", Task.due_date < today()),
        "due_soon": count(Task.status != "Completed", Task.due_date.between(today(), today() + timedelta(days=3))),
        "by_status": grouped(Task.status), "by_priority": grouped(Task.priority),
        "by_member": [{"name": name or "Unassigned", "user_id": uid, "count": total} for name, uid, total in by_member],
        "projects": [project_view(p, stats.get(p.id)) for p in projects],
        "recent_tasks": [task_view(t) for t in db.scalars(select(Task).where(*filters).order_by(Task.updated_at.desc(), Task.id.desc()).limit(6))],
    }
