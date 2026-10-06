"""Create the first Admin using environment variables, after running Alembic."""
import os
from sqlalchemy import select
from app.database import SessionLocal
from app.models import User
from app.schemas import UserCreate
from app.security import hasher


def seed():
    data = UserCreate(name=os.environ["ADMIN_NAME"], email=os.environ["ADMIN_EMAIL"],
                      password=os.environ["ADMIN_PASSWORD"], role="Admin")
    with SessionLocal.begin() as db:
        if db.scalar(select(User.id).where(User.role == "Admin", User.is_active.is_(True))):
            print("An active administrator already exists. No changes made.")
            return
        if db.scalar(select(User.id).where(User.email == data.email)):
            raise SystemExit("That email already exists. Use a different administrator email.")
        db.add(User(name=data.name, email=data.email, password_hash=hasher.hash(data.password), role="Admin"))
    print("Administrator created. Credentials were read from environment variables.")


if __name__ == "__main__":
    seed()
