from datetime import date, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, or_, select
from sqlalchemy.orm import Session
from ..common import activity, can_manage, check_assignee, check_task_date, get_project, get_task, notify, paging, paginate, task_view, today, visible_projects
from ..database import get_db
from ..models import Project, Task, User, now
from ..schemas import StatusChange, TaskCreate, TaskUpdate
from ..security import current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])
MEMBER_TRANSITIONS = {("To Do", "In Progress"), ("In Progress", "To Do"), ("In Progress", "In Review"), ("In Review", "In Progress")}
MANAGER_TRANSITIONS = MEMBER_TRANSITIONS | {("In Review", "Completed"), ("Completed", "In Progress")}


@router.get("")
def listing(q: str = Query("", max_length=200), project_id: int | None = None,
            status: str | None = None, priority: str | None = None, assigned_to: int | None = None,
            unassigned: bool = False, mine: bool = False, archived: bool = False,
            due: Literal["overdue", "soon"] | None = None, due_date: date | None = None,
            sort: Literal["created_at", "updated_at", "due_date", "priority", "name"] = "created_at",
            direction: Literal["asc", "desc"] = "desc", pagination=Depends(paging),
            user: User = Depends(current_user), db: Session = Depends(get_db)):
    stmt = select(Task).join(Project, Project.id == Task.project_id).where(Task.project_id.in_(visible_projects(user)),
        or_(Task.title.ilike(f"%{q}%"), Task.description.ilike(f"%{q}%"), Project.name.ilike(f"%{q}%")))
    stmt = stmt.where(Task.archived_at.is_not(None) if archived else Task.archived_at.is_(None))
    for column, value in ((Task.project_id, project_id), (Task.status, status), (Task.priority, priority), (Task.assigned_to, assigned_to), (Task.due_date, due_date)):
        if value is not None:
            stmt = stmt.where(column == value)
    if unassigned:
        stmt = stmt.where(Task.assigned_to.is_(None))
    if mine:
        stmt = stmt.where(Task.assigned_to == user.id)
    if due:
        stmt = stmt.where(Task.status != "Completed", Task.archived_at.is_(None))
        stmt = stmt.where(Task.due_date < today()) if due == "overdue" else stmt.where(Task.due_date.between(today(), today() + timedelta(days=3)))
    column = {"name": Task.title, "priority": case({"Low": 1, "Medium": 2, "High": 3, "Urgent": 4}, value=Task.priority)}.get(sort)
    if column is None:
        column = getattr(Task, sort)
    ordering = column.desc() if direction == "desc" else column.asc()
    return paginate(db, stmt.order_by(ordering.nulls_last(), Task.id), *pagination, task_view)


@router.post("", status_code=201)
def create(data: TaskCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = get_project(db, data.project_id, user, manage=True, writable=True, lock=True)
    check_assignee(db, project, data.assigned_to)
    check_task_date(project, data.due_date)
    task = Task(**data.model_dump(), created_by=user.id)
    db.add(task)
    db.flush()
    activity(db, user, "task_created", "task", task.id, f'{user.name} created "{task.title}".', project.id)
    if task.assigned_to:
        notify(db, [task.assigned_to], "assignment", task, f'You were assigned to "{task.title}".')
        activity(db, user, "task_assigned", "task", task.id, f'{user.name} assigned "{task.title}" to {task.assignee.name}.', project.id)
    return task_view(task)


@router.get("/{task_id}")
def detail(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return task_view(get_task(db, task_id, user))


@router.put("/{task_id}")
def edit(task_id: int, data: TaskUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = get_task(db, task_id, user, manage=True, writable=True, lock=True)
    check_assignee(db, task.project, data.assigned_to)
    check_task_date(task.project, data.due_date)
    previous = task.assigned_to
    for key, value in data.model_dump().items():
        setattr(task, key, value)
    if previous != data.assigned_to:
        notify(db, [previous], "reassignment", task, f'You are no longer assigned to "{task.title}".')
        notify(db, [data.assigned_to], "assignment", task, f'"{task.title}" has been assigned to you.')
        target = db.get(User, data.assigned_to).name if data.assigned_to else "Unassigned"
        activity(db, user, "task_reassigned", "task", task.id, f'{user.name} reassigned "{task.title}" to {target}.', task.project_id)
    else:
        activity(db, user, "task_updated", "task", task.id, f'{user.name} updated "{task.title}".', task.project_id)
    db.flush()
    db.expire(task, ["assignee"])
    return task_view(task)


@router.post("/{task_id}/status")
def change_status(task_id: int, data: StatusChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = get_task(db, task_id, user, writable=True, lock=True)
    manager = can_manage(user, task.project)
    if not manager and task.assigned_to != user.id:
        raise HTTPException(403, "Only the assignee or project manager may change task status")
    transition = task.status, data.status
    if transition not in (MANAGER_TRANSITIONS if manager else MEMBER_TRANSITIONS):
        raise HTTPException(422, "This task status transition is not allowed")
    if task.status == "Completed" and not data.reason:
        raise HTTPException(422, "A reason is required to reopen a completed task")
    old = task.status
    task.status = data.status
    task.completed_at = now() if data.status == "Completed" else None
    if data.status == "In Review":
        notify(db, [task.project.manager_id], "review", task, f'"{task.title}" is ready for review.')
    elif data.status == "Completed":
        notify(db, [task.assigned_to], "approval", task, f'"{task.title}" was approved.')
    elif old == "In Review":
        notify(db, [task.assigned_to], "returned", task, f'"{task.title}" was returned for additional work.')
    description = f'{user.name} changed "{task.title}": {old} → {data.status}.'
    if data.reason:
        description += f" Reason: {data.reason}"
    activity(db, user, "task_reopened" if old == "Completed" else "task_status_changed", "task", task.id, description, task.project_id)
    db.flush()
    return task_view(task)


@router.post("/{task_id}/archive")
def archive(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = get_task(db, task_id, user, manage=True, writable=True, lock=True)
    task.archived_at = now()
    activity(db, user, "task_archived", "task", task.id, f'{user.name} archived "{task.title}".', task.project_id)
    return {"detail": "Task archived"}


@router.post("/{task_id}/restore")
def restore(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = get_task(db, task_id, user, manage=True, writable=True, lock=True, allow_archived=True)
    if not task.archived_at:
        raise HTTPException(409, "Task is not archived")
    # Membership can change after completed work is archived.
    check_task_date(task.project, task.due_date)
    task.archived_at = None
    activity(db, user, "task_restored", "task", task.id, f'{user.name} restored "{task.title}".', task.project_id)
    return {"detail": "Task restored"}
