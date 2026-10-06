"""Optional, idempotent development data. Run seed_admin.py first."""
import os
from datetime import timedelta
from sqlalchemy import select
from app.common import today
from app.database import SessionLocal
from app.models import ActivityLog, Comment, Notification, Project, ProjectMember, Task, User, now
from app.schemas import UserCreate
from app.security import hasher


def seed():
    password = os.environ["DEMO_PASSWORD"]
    UserCreate(name="Validation", email="validate@example.com", password=password)
    with SessionLocal.begin() as db:
        admin = db.scalar(select(User).where(User.role == "Admin", User.is_active.is_(True)).order_by(User.id))
        if not admin:
            raise SystemExit("Create the initial administrator with seed_admin.py first.")
        if db.scalar(select(User.id).where(User.email == "olivia@example.com")):
            print("Sample data already exists; no changes made.")
            return
        people = []
        for name, email, role in [("Olivia Rhye", "olivia@example.com", "Project Manager"),
                                   ("Phoenix Baker", "phoenix@example.com", "Member"),
                                   ("Lana Steiner", "lana@example.com", "Member"),
                                   ("Demi Wilkinson", "demi@example.com", "Member")]:
            person = User(name=name, email=email, password_hash=hasher.hash(password), role=role)
            db.add(person); people.append(person)
        db.flush()
        manager = people[0]
        projects = []
        for name, description, due, status in [
            ("Website redesign", "A fresh, accessible web experience that brings our brand and product story together.", 24, "Active"),
            ("Mobile app launch", "Bring the new mobile experience to market with a thoughtful, coordinated launch.", 38, "Active"),
            ("Brand guidelines", "Create a shared visual language for every customer touchpoint.", 16, "Planning"),
        ]:
            project = Project(name=name, description=description, manager_id=manager.id,
                              start_date=today() - timedelta(days=30), due_date=today() + timedelta(days=due), status=status)
            db.add(project); db.flush(); projects.append(project)
            for person in [admin, *people]:
                db.add(ProjectMember(project_id=project.id, user_id=person.id))
            db.add(ActivityLog(user_id=manager.id, project_id=project.id, action="project_created", entity_type="project",
                               entity_id=project.id, description=f'{manager.name} created "{project.name}".', created_at=now() - timedelta(days=12)))
        tasks = [
            (0,"Design system foundations",1,"High","Completed",-7),
            (0,"Map the information architecture",2,"Medium","Completed",-5),
            (0,"Build the navigation components",3,"High","Completed",-3),
            (0,"Audit accessibility across key pages",2,"Medium","In Progress",3),
            (1,"Prepare the launch checklist",1,"Medium","Completed",-4),
            (1,"Review onboarding copy",2,"Low","Completed",-2),
            (1,"Set up product analytics",3,"High","In Progress",5),
            (2,"Define the color palette",2,"Medium","Completed",-2),
            (2,"Document typography guidelines",3,"Low","To Do",7),
            (0,"Polish responsive layouts",1,"High","In Progress",2),
            (1,"Finalize app store assets",3,"Urgent","In Review",0),
            (0,"Review homepage wireframes",2,"High","In Review",-1),
            (2,"Create the iconography library",None,"Medium","To Do",5),
            (1,"Test the new onboarding flow",1,"High","In Progress",1),
            (2,"Prepare brand handoff documentation",None,"Low","To Do",8),
            (0,"Update the project stakeholders",0,"Medium","To Do",-2),
        ]
        review_task_id = None
        for i, (pi, title, assignee, priority, status, due) in enumerate(tasks):
            assigned = people[assignee] if assignee is not None else None
            task = Task(project_id=projects[pi].id, title=title,
                        description=f"{title} for {projects[pi].name.lower()}.\n\nCoordinate with the project team, document the decisions, and submit the finished work for review. Include a clear summary of changes in the discussion.",
                        assigned_to=assigned.id if assigned else None, priority=priority, status=status,
                        due_date=today() + timedelta(days=due), created_by=manager.id,
                        completed_at=now() - timedelta(days=2) if status == "Completed" else None,
                        created_at=now() - timedelta(days=10, hours=i), updated_at=now() - timedelta(hours=len(tasks) - i))
            db.add(task); db.flush()
            if title == "Review homepage wireframes":
                review_task_id = task.id
            db.add(ActivityLog(user_id=manager.id, project_id=task.project_id, action="task_created", entity_type="task", entity_id=task.id,
                               description=f'{manager.name} created "{title}".', created_at=task.created_at))
            if assigned:
                db.add(Notification(user_id=assigned.id, type="assignment", message=f'You were assigned to "{title}".', related_entity_id=task.id))
            if status == "In Review":
                db.add(Notification(user_id=manager.id, type="review", message=f'"{title}" is ready for review.', related_entity_id=task.id))
                db.add(Comment(task_id=task.id, user_id=assigned.id, content="The first pass is ready. I’ve covered the key requirements and would appreciate your feedback on the final details."))
        db.add(Comment(task_id=review_task_id, user_id=manager.id, content="Thanks for the update. Let's review the page hierarchy and accessibility before approval."))
        db.add(Notification(user_id=admin.id, type="comment", message='Olivia Rhye commented on "Review homepage wireframes".', related_entity_id=review_task_id))
    print("Sample projects created. Demo users use DEMO_PASSWORD from your environment.")


if __name__ == "__main__":
    seed()
