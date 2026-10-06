from datetime import timedelta
import pytest
from sqlalchemy import select
from app.common import today
from app.models import ActivityLog, Project, Task, User


def create_task(client, headers, project_id, **values):
    return client.post('/api/tasks', headers=headers, json={'project_id': project_id, 'title': 'Test task', **values})


def test_project_access_and_manager_membership(env, project):
    c, _, h = env
    pid = project['id']
    members = c.get(f'/api/projects/{pid}/members', headers=h[2]).json()['items']
    assert {m['id'] for m in members} == {2, 3}
    assert c.get(f'/api/projects/{pid}', headers=h[4]).status_code == 404
    assert c.get('/api/projects?q=Website', headers=h[4]).json()['total'] == 0
    assert c.get(f'/api/projects/{pid}', headers=h[3]).status_code == 200
    assert c.delete(f'/api/projects/{pid}/members/2', headers=h[2]).status_code == 409


def test_project_creation_permissions_dates_and_manager(env):
    c, _, h = env
    data = {'name': 'A project', 'start_date': '2026-10-01', 'due_date': '2026-09-01'}
    assert c.post('/api/projects', headers=h[3], json=data).status_code == 403
    assert c.post('/api/projects', headers=h[2], json=data).status_code == 422
    data['due_date'] = '2026-11-01'
    assert c.post('/api/projects', headers=h[2], json={**data, 'manager_id': 5}).status_code == 403
    assert c.post('/api/projects', headers=h[1], json={**data, 'manager_id': 3}).status_code == 422
    assert c.post('/api/projects', headers=h[1], json={**data, 'manager_id': 5}).status_code == 201


def test_project_membership_and_removal_rules(env, task):
    c, _, h = env
    pid = task['project_id']
    assert c.post(f'/api/projects/{pid}/members', headers=h[2], json={'user_id': 3}).status_code == 409
    assert c.post(f'/api/projects/{pid}/members', headers=h[3], json={'user_id': 4}).status_code == 403
    assert c.delete(f'/api/projects/{pid}/members/3', headers=h[2]).status_code == 409
    assert c.put(f'/api/tasks/{task["id"]}', headers=h[2], json={'title': task['title'], 'assigned_to': None}).status_code == 200
    assert c.delete(f'/api/projects/{pid}/members/3', headers=h[2]).status_code == 200
    assert c.get(f'/api/tasks/{task["id"]}', headers=h[3]).status_code == 404


def test_manager_replacement_and_date_shrinking(env, project):
    c, _, h = env
    pid = project['id']
    create_task(c, h[2], pid, due_date='2026-02-01')
    data = {k: project[k] for k in ('name', 'description', 'manager_id', 'start_date', 'due_date', 'status')}
    assert c.put(f'/api/projects/{pid}', headers=h[2], json={**data, 'start_date': '2026-03-01'}).status_code == 409
    assert c.put(f'/api/projects/{pid}', headers=h[2], json={**data, 'manager_id': 5}).status_code == 200
    members = c.get(f'/api/projects/{pid}/members', headers=h[5]).json()['items']
    assert {m['id'] for m in members} == {2, 3, 5}
    assert c.post(f'/api/projects/{pid}/archive', headers=h[2]).status_code == 403
    assert c.get(f'/api/projects/{pid}', headers=h[2]).status_code == 200


def test_archived_project_blocks_all_changes_then_restores(env, task):
    c, _, h = env
    pid, tid = task['project_id'], task['id']
    comment = c.post(f'/api/tasks/{tid}/comments', headers=h[3], json={'content': 'Hello'}).json()
    assert c.post(f'/api/projects/{pid}/archive', headers=h[2]).status_code == 200
    operations = [
        ('post', '/api/tasks', {'project_id': pid, 'title': 'No'}),
        ('put', f'/api/tasks/{tid}', {'title': 'No'}),
        ('post', f'/api/tasks/{tid}/status', {'status': 'In Progress'}),
        ('post', f'/api/tasks/{tid}/comments', {'content': 'No'}),
        ('put', f'/api/comments/{comment["id"]}', {'content': 'No'}),
        ('delete', f'/api/comments/{comment["id"]}', None),
        ('post', f'/api/projects/{pid}/members', {'user_id': 4}),
        ('delete', f'/api/projects/{pid}/members/3', None),
        ('post', f'/api/tasks/{tid}/archive', None),
        ('put', f'/api/projects/{pid}', {'name': 'No', 'manager_id': 2, 'start_date': '2026-01-01', 'due_date': '2027-12-31', 'status': 'Active'}),
    ]
    for method, path, body in operations:
        r = c.request(method, path, headers=h[1], **({'json': body} if body is not None else {}))
        assert r.status_code == 409, (path, r.text)
    assert c.get(f'/api/tasks/{tid}/comments', headers=h[3]).status_code == 200
    assert c.post(f'/api/projects/{pid}/restore', headers=h[2]).status_code == 200
    assert c.get(f'/api/projects/{pid}', headers=h[2]).json()['status'] == 'Active'


def test_task_assignment_validation_and_unassigned(env, project):
    c, sessions, h = env
    pid = project['id']
    assert create_task(c, h[3], pid).status_code == 403
    assert create_task(c, h[2], pid, assigned_to=4).status_code == 422
    assert create_task(c, h[2], pid, due_date='2028-01-01').status_code == 422
    assert create_task(c, h[2], pid, due_date='2025-12-31').status_code == 422
    t = create_task(c, h[2], pid).json()
    assert t['assigned_to'] is None and t['status'] == 'To Do' and t['priority'] == 'Medium'
    assert c.put(f'/api/tasks/{t["id"]}', headers=h[3], json={'title': t['title'], 'assigned_to': 3}).status_code == 403
    with sessions.begin() as db:
        db.get(User, 3).is_active = False
    assert create_task(c, h[2], pid, assigned_to=3).status_code == 422


def test_task_workflow_review_approval_return_reopen(env, task):
    c, sessions, h = env
    path = f'/api/tasks/{task["id"]}/status'
    assert c.post(path, headers=h[3], json={'status': 'Completed'}).status_code == 422
    assert c.post(path, headers=h[2], json={'status': 'Completed'}).status_code == 422
    for status in ['In Progress', 'To Do', 'In Progress', 'In Review', 'In Progress', 'In Review']:
        assert c.post(path, headers=h[3], json={'status': status}).status_code == 200
    assert c.post(path, headers=h[3], json={'status': 'Completed'}).status_code == 422
    done = c.post(path, headers=h[2], json={'status': 'Completed'})
    assert done.status_code == 200 and done.json()['completed_at']
    assert c.post(path, headers=h[3], json={'status': 'In Progress', 'reason': 'Changes'}).status_code == 422
    assert c.post(path, headers=h[2], json={'status': 'In Progress'}).status_code == 422
    reopened = c.post(path, headers=h[2], json={'status': 'In Progress', 'reason': 'Add accessibility labels'})
    assert reopened.status_code == 200 and reopened.json()['completed_at'] is None
    with sessions() as db:
        log = db.scalar(select(ActivityLog).where(ActivityLog.action == 'task_reopened'))
        assert 'Add accessibility labels' in log.description


def test_unauthorized_task_and_non_assignee_status(env, task):
    c, _, h = env
    assert c.get(f'/api/tasks/{task["id"]}', headers=h[4]).status_code == 404
    assert c.get('/api/tasks?q=dashboard', headers=h[4]).json()['total'] == 0
    c.post(f'/api/projects/{task["project_id"]}/members', headers=h[2], json={'user_id': 4})
    assert c.post(f'/api/tasks/{task["id"]}/status', headers=h[4], json={'status': 'In Progress'}).status_code == 403


def test_archived_task_read_only_restore_and_progress(env, task):
    c, sessions, h = env
    tid, pid = task['id'], task['project_id']
    another = create_task(c, h[2], pid).json()
    with sessions.begin() as db:
        db.get(Task, tid).status = 'Completed'
    assert c.get(f'/api/projects/{pid}', headers=h[2]).json()['progress'] == 50
    assert c.post(f'/api/tasks/{another["id"]}/archive', headers=h[2]).status_code == 200
    assert c.get(f'/api/projects/{pid}', headers=h[2]).json()['progress'] == 100
    assert c.put(f'/api/tasks/{another["id"]}', headers=h[2], json={'title': 'No'}).status_code == 409
    assert c.post(f'/api/tasks/{another["id"]}/comments', headers=h[3], json={'content': 'No'}).status_code == 409
    assert c.get('/api/tasks?archived=true', headers=h[2]).json()['total'] == 1
    assert c.post(f'/api/tasks/{another["id"]}/restore', headers=h[2]).status_code == 200
    assert c.get(f'/api/projects/{pid}', headers=h[2]).json()['progress'] == 50


@pytest.mark.parametrize('offset,status,archived,overdue,soon', [(-1,'To Do',False,True,False),(0,'To Do',False,False,True),(3,'In Progress',False,False,True),(4,'To Do',False,False,False),(-1,'Completed',False,False,False),(0,'To Do',True,False,False),(None,'To Do',False,False,False)])
def test_due_boundaries(env, project, offset, status, archived, overdue, soon):
    from app.models import now
    c, sessions, h = env
    current = today()
    with sessions.begin() as db:
        p = db.get(Project, project['id']); p.start_date = current - timedelta(days=20); p.due_date = current + timedelta(days=20)
    task = create_task(c, h[2], project['id'], due_date=(current + timedelta(days=offset)).isoformat() if offset is not None else None, assigned_to=3).json()
    with sessions.begin() as db:
        t = db.get(Task, task['id']); t.status = status; t.archived_at = now() if archived else None
    result = c.get(f'/api/tasks/{task["id"]}', headers=h[3]).json()
    assert result['overdue'] == overdue and result['due_soon'] == soon
    dashboard = c.get('/api/dashboard', headers=h[3]).json()
    assert dashboard['overdue'] == int(overdue) and dashboard['due_soon'] == int(soon)


def test_search_filters_sort_pagination(env, project):
    c, _, h = env
    for title, priority in [('Charlie','Low'), ('Alpha','Urgent'), ('Bravo','High')]:
        assert create_task(c, h[2], project['id'], title=title, description='Searchable description', priority=priority).status_code == 201
    r = c.get('/api/tasks?sort=name&direction=asc&page_size=2', headers=h[2]).json()
    assert [t['title'] for t in r['items']] == ['Alpha', 'Bravo'] and r['total'] == 3
    assert c.get('/api/tasks?sort=priority&direction=desc', headers=h[2]).json()['items'][0]['priority'] == 'Urgent'
    assert c.get('/api/tasks?q=Searchable&unassigned=true', headers=h[2]).json()['total'] == 3
    assert c.get('/api/tasks?priority=High', headers=h[2]).json()['total'] == 1
    assert c.get('/api/tasks?page_size=101', headers=h[2]).status_code == 422
    assert c.get('/api/projects?page=0', headers=h[2]).status_code == 422
    assert c.get('/api/tasks?sort=__dict__', headers=h[2]).status_code == 422


def test_empty_project_progress_zero(env, project):
    assert env[0].get(f'/api/projects/{project["id"]}', headers=env[2][2]).json()['progress'] == 0
