import os
os.environ.setdefault("JWT_SECRET", "test-only-secret-012345678901234567890123456789")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.models import SystemLock, User
from app.security import hasher

PASSWORD = "Test-password-123"


@pytest.fixture(scope="session")
def password_hash():
    return hasher.hash(PASSWORD)


@pytest.fixture
def env(password_hash):
    url = os.getenv("TEST_DATABASE_URL", "sqlite://")
    engine = create_engine(url, **({"connect_args": {"check_same_thread": False}, "poolclass": StaticPool} if url == "sqlite://" else {}))
    if url == "sqlite://":
        @event.listens_for(engine, "connect")
        def fk(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
    # TEST_DATABASE_URL must point at a disposable, dedicated test database.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions.begin() as db:
        db.add(SystemLock(id=1))
        for uid, name, role in [(1, "Admin", "Admin"), (2, "Manager", "Project Manager"), (3, "Member", "Member"), (4, "Outsider", "Member"), (5, "Second manager", "Project Manager")]:
            db.add(User(id=uid, name=name, email=f"user{uid}@example.com", password_hash=password_hash, role=role))
        db.flush()
        if engine.dialect.name == 'postgresql':
            db.execute(text("SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users))"))
    def override():
        with sessions() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise
    app.dependency_overrides[get_db] = override
    with TestClient(app) as client:
        tokens = {}
        for uid in range(1, 6):
            result = client.post("/api/auth/login", json={"email": f"user{uid}@example.com", "password": PASSWORD})
            assert result.status_code == 200, result.text
            tokens[uid] = {"Authorization": "Bearer " + result.json()["access_token"]}
        yield client, sessions, tokens
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def project(env):
    client, db, h = env
    r = client.post("/api/projects", headers=h[2], json={"name": "Website redesign", "start_date": "2026-01-01", "due_date": "2027-12-31", "status": "Active"})
    assert r.status_code == 201, r.text
    p = r.json()
    assert client.post(f'/api/projects/{p["id"]}/members', headers=h[2], json={"user_id": 3}).status_code == 201
    return p


@pytest.fixture
def task(env, project):
    client, _, h = env
    r = client.post("/api/tasks", headers=h[2], json={"project_id": project["id"], "title": "Build dashboard", "assigned_to": 3})
    assert r.status_code == 201, r.text
    return r.json()
