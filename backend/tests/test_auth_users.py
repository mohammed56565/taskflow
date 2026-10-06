from datetime import timedelta
import jwt
import pytest
from sqlalchemy import select
from app.config import settings
from app.models import RefreshSession, User, now
from conftest import PASSWORD


def test_login_profile_and_no_password_exposure(env):
    client, _, h = env
    r = client.post('/api/auth/login', json={"email": "USER1@example.com", "password": PASSWORD})
    assert r.status_code == 200
    assert "password" not in str(r.json()["user"]).lower()
    assert 'HttpOnly' in r.headers['set-cookie'] and 'SameSite=strict' in r.headers['set-cookie']
    assert client.get('/api/auth/me', headers=h[1]).json()['role'] == 'Admin'


@pytest.mark.parametrize('payload', [
    {"email": "user1@example.com", "password": "wrong"},
    {"email": "unknown@example.com", "password": PASSWORD},
])
def test_invalid_credentials(env, payload):
    assert env[0].post('/api/auth/login', json=payload).status_code == 401


@pytest.mark.parametrize('token', ['', 'invalid', 'expired'])
def test_bad_access_tokens(env, token):
    if token == 'expired':
        token = jwt.encode({"sub": "1", "sid": "fake", "type": "access", "iat": now() - timedelta(hours=2), "exp": now() - timedelta(hours=1)}, settings.jwt_secret, algorithm='HS256')
    assert env[0].get('/api/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_refresh_rotation_logout_and_revocation(env):
    client, _, _ = env
    login = client.post('/api/auth/login', json={"email": "user1@example.com", "password": PASSWORD}).json()
    old = client.cookies.get('taskflow_refresh')
    r = client.post('/api/auth/refresh')
    assert r.status_code == 200
    rotated = client.cookies.get('taskflow_refresh')
    assert old != rotated
    # Supply the old cookie explicitly, avoiding the client's current cookie jar.
    assert client.post('/api/auth/refresh', headers={'Cookie': f'taskflow_refresh={old}'}).status_code == 401
    assert client.post('/api/auth/logout').status_code == 200
    assert client.post('/api/auth/refresh').status_code == 401
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + login['access_token']}).status_code == 401


@pytest.mark.parametrize('mode', ['expired', 'revoked', 'invalid'])
def test_bad_refresh(env, mode):
    client, sessions, _ = env
    if mode == 'invalid':
        r = client.post('/api/auth/refresh', headers={'Cookie': 'taskflow_refresh=invalid'})
    else:
        with sessions.begin() as db:
            session = db.scalar(select(RefreshSession).where(RefreshSession.user_id == 5))
            if mode == 'expired':
                session.expires_at = now() - timedelta(days=1)
            else:
                session.revoked = True
        r = client.post('/api/auth/refresh')
    assert r.status_code == 401


def test_disabled_account_blocks_all_sessions(env):
    client, _, h = env
    r = client.put('/api/users/3', headers=h[1], json={'name': 'Member', 'email': 'user3@example.com', 'role': 'Member', 'is_active': False})
    assert r.status_code == 200
    assert client.get('/api/auth/me', headers=h[3]).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'user3@example.com', 'password': PASSWORD}).status_code == 401


def test_final_admin_cannot_be_disabled_or_demoted(env):
    client, _, h = env
    for role, active in [('Admin', False), ('Member', True)]:
        r = client.put('/api/users/1', headers=h[1], json={'name': 'Admin', 'email': 'user1@example.com', 'role': role, 'is_active': active})
        assert r.status_code == 409


def test_create_edit_unique_email_and_validation(env):
    client, _, h = env
    data = {'name': 'New person', 'email': 'new@example.com', 'role': 'Member', 'password': PASSWORD}
    assert client.post('/api/users', headers=h[3], json=data).status_code == 403
    r = client.post('/api/users', headers=h[1], json=data)
    assert r.status_code == 201 and r.json()['is_active']
    assert 'password' not in r.text
    assert client.post('/api/users', headers=h[1], json=data).status_code == 409
    for field, value in [('name', '   '), ('email', 'bad'), ('role', 'SuperUser'), ('password', 'short')]:
        bad = {**data, field: value}
        result = client.post('/api/users', headers=h[1], json=bad)
        assert result.status_code == 422
        assert 'short' not in result.text


def test_profile_cannot_escalate_role(env):
    client, _, h = env
    assert client.put('/api/auth/me', headers=h[3], json={'name': 'Changed', 'email': 'changed@example.com', 'role': 'Admin'}).status_code == 422
    assert client.put('/api/auth/me', headers=h[3], json={'name': 'Changed', 'email': 'user1@example.com'}).status_code == 409
    assert client.put('/api/auth/me', headers=h[3], json={'name': 'Changed', 'email': 'changed@example.com'}).status_code == 200


def test_password_change_checks_current_and_confirmation(env):
    client, _, h = env
    data = {'current_password': 'wrong', 'new_password': 'Changed-password-123', 'confirm_password': 'Changed-password-123'}
    assert client.post('/api/auth/password', headers=h[3], json=data).status_code == 422
    data['current_password'] = PASSWORD
    assert client.post('/api/auth/password', headers=h[3], json={**data, 'confirm_password': 'Mismatch-123'}).status_code == 422
    assert client.post('/api/auth/password', headers=h[3], json=data).status_code == 200
    assert client.get('/api/auth/me', headers=h[3]).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'user3@example.com', 'password': data['new_password']}).status_code == 200


def test_cookie_endpoints_reject_foreign_origin(env):
    assert env[0].post('/api/auth/refresh', headers={'Origin': 'https://untrusted.example'}).status_code == 403


def test_concurrent_admin_changes_keep_one_active(env):
    from concurrent.futures import ThreadPoolExecutor
    from sqlalchemy import func
    client, sessions, h = env
    with sessions.begin() as db:
        if db.bind.dialect.name != 'postgresql':
            pytest.skip('Row locking requires PostgreSQL')
        db.get(User, 5).role = 'Admin'
    def demote(uid):
        return client.put(f'/api/users/{uid}', headers=h[1], json={
            'name': f'User {uid}', 'email': f'user{uid}@example.com', 'role': 'Member', 'is_active': True,
        }).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(demote, [1, 5]))
    assert results.count(200) == 1, results
    # Self-demotion can make the other request fail its session check (401)
    # or role check (403), before it reaches the last-admin guard (409).
    assert all(code in [200, 401, 403, 409] for code in results), results
    with sessions() as db:
        assert db.scalar(select(func.count(User.id)).where(User.role == 'Admin', User.is_active.is_(True))) == 1
