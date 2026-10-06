from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from ..common import activity, get_project, get_task, notify, paging, paginate, user_view
from ..database import get_db
from ..models import ActivityLog, Comment, Notification, Project, User
from ..schemas import CommentInput
from ..security import current_user

router = APIRouter(tags=["Collaboration"])


def comment_view(comment):
    return {"id": comment.id, "task_id": comment.task_id, "user_id": comment.user_id,
            "content": comment.content, "created_at": comment.created_at, "updated_at": comment.updated_at,
            "user": user_view(comment.user)}


@router.get("/tasks/{task_id}/comments")
def comments(task_id: int, pagination=Depends(paging), user: User = Depends(current_user), db: Session = Depends(get_db)):
    get_task(db, task_id, user)
    return paginate(db, select(Comment).where(Comment.task_id == task_id).order_by(Comment.created_at.desc(), Comment.id.desc()), *pagination, comment_view)


@router.post("/tasks/{task_id}/comments", status_code=201)
def add_comment(task_id: int, data: CommentInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = get_task(db, task_id, user, writable=True, lock=True)
    comment = Comment(task_id=task_id, user_id=user.id, content=data.content)
    db.add(comment)
    db.flush()
    notify(db, [task.assigned_to, task.project.manager_id], "comment", task, f'{user.name} commented on "{task.title}".', exclude=user.id)
    activity(db, user, "comment_added", "comment", comment.id, f'{user.name} commented on "{task.title}".', task.project_id)
    return comment_view(comment)


def own_comment(db, comment_id, user):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(404, "Comment not found")
    task = get_task(db, comment.task_id, user, writable=True, lock=True)
    if comment.user_id != user.id and user.role != "Admin":
        raise HTTPException(403, "Only the author or an Admin may modify this comment")
    return comment, task


@router.put("/comments/{comment_id}")
def edit_comment(comment_id: int, data: CommentInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    comment, task = own_comment(db, comment_id, user)
    comment.content = data.content
    activity(db, user, "comment_edited", "comment", comment.id, f'{user.name} edited a comment on "{task.title}".', task.project_id)
    db.flush()
    return comment_view(comment)


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    comment, task = own_comment(db, comment_id, user)
    activity(db, user, "comment_deleted", "comment", comment.id, f'{user.name} deleted a comment on "{task.title}".', task.project_id)
    db.delete(comment)
    return {"detail": "Comment deleted"}


def notification_view(n):
    return {k: getattr(n, k) for k in ("id", "type", "message", "related_entity_type", "related_entity_id", "is_read", "created_at")}


@router.get("/notifications")
def notifications(unread: bool = False, pagination=Depends(paging), user: User = Depends(current_user), db: Session = Depends(get_db)):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread:
        stmt = stmt.where(Notification.is_read.is_(False))
    return paginate(db, stmt.order_by(Notification.created_at.desc(), Notification.id.desc()), *pagination, notification_view)


@router.post("/notifications/read-all")
def read_all(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(is_read=True))
    return {"detail": "All notifications marked as read"}


@router.post("/notifications/{notification_id}/read")
def read_one(notification_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if not item:
        raise HTTPException(404, "Notification not found")
    item.is_read = True
    return {"detail": "Notification marked as read"}


@router.get("/activity")
def logs(project_id: int | None = None, pagination=Depends(paging), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "Member":
        raise HTTPException(403, "Activity logs require management permission")
    stmt = select(ActivityLog)
    if project_id:
        get_project(db, project_id, user, manage=True)
        stmt = stmt.where(ActivityLog.project_id == project_id)
    elif user.role != "Admin":
        stmt = stmt.where(ActivityLog.project_id.in_(select(Project.id).where(Project.manager_id == user.id)))
    return paginate(db, stmt.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()), *pagination,
                    lambda a: {"id": a.id, "action": a.action, "entity_type": a.entity_type, "entity_id": a.entity_id,
                               "description": a.description, "created_at": a.created_at, "user": user_view(a.user), "project_id": a.project_id})
