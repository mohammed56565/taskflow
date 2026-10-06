from sqlalchemy import select
from app.models import Notification


def recipients(sessions, kind):
    with sessions() as db:
        return [n.user_id for n in db.scalars(select(Notification).where(Notification.type == kind))]


def test_assignment_and_reassignment_notifications(env, task):
    c, sessions, h = env
    assert recipients(sessions, 'assignment') == [3]
    c.post(f'/api/projects/{task["project_id"]}/members', headers=h[2], json={'user_id': 4})
    r = c.put(f'/api/tasks/{task["id"]}', headers=h[2], json={'title': task['title'], 'assigned_to': 4})
    assert r.status_code == 200
    assert recipients(sessions, 'reassignment') == [3]
    assert recipients(sessions, 'assignment') == [3, 4]


def test_review_return_approval_notifications(env, task):
    c, sessions, h = env
    path = f'/api/tasks/{task["id"]}/status'
    for uid, status in [(3,'In Progress'), (3,'In Review'), (2,'In Progress'), (3,'In Review'), (2,'Completed')]:
        assert c.post(path, headers=h[uid], json={'status': status}).status_code == 200
    assert recipients(sessions, 'review') == [2,2]
    assert recipients(sessions, 'returned') == [3]
    assert recipients(sessions, 'approval') == [3]


def test_comments_ownership_moderation_and_no_self_notification(env, task):
    c, sessions, h = env
    path = f'/api/tasks/{task["id"]}/comments'
    assert c.post(path, headers=h[4], json={'content': 'No access'}).status_code == 404
    assert c.post(path, headers=h[3], json={'content': '   '}).status_code == 422
    comment = c.post(path, headers=h[3], json={'content': 'Ready for feedback'}).json()
    assert recipients(sessions, 'comment') == [2]
    assert c.put(f'/api/comments/{comment["id"]}', headers=h[2], json={'content': 'Cannot edit'}).status_code == 403
    assert c.put(f'/api/comments/{comment["id"]}', headers=h[3], json={'content': 'Updated'}).status_code == 200
    assert c.delete(f'/api/comments/{comment["id"]}', headers=h[2]).status_code == 403
    assert c.delete(f'/api/comments/{comment["id"]}', headers=h[1]).status_code == 200
    assert c.get(path, headers=h[3]).json()['total'] == 0


def test_comment_notifications_deduplicate_manager_assignee(env, task):
    c, sessions, h = env
    c.put(f'/api/tasks/{task["id"]}', headers=h[2], json={'title': task['title'], 'assigned_to': 2})
    c.post(f'/api/tasks/{task["id"]}/comments', headers=h[3], json={'content': 'Please review'})
    assert recipients(sessions, 'comment') == [2]


def test_notifications_private_read_and_read_all(env, task):
    c, _, h = env
    listing = c.get('/api/notifications?unread=true', headers=h[3]).json()
    assert listing['total'] == 1
    nid = listing['items'][0]['id']
    assert c.get('/api/notifications', headers=h[4]).json()['total'] == 0
    assert c.post(f'/api/notifications/{nid}/read', headers=h[4]).status_code == 404
    assert c.post(f'/api/notifications/{nid}/read', headers=h[3]).status_code == 200
    assert c.get('/api/notifications?unread=true', headers=h[3]).json()['total'] == 0
    assert c.post('/api/notifications/read-all', headers=h[3]).status_code == 200


def test_activity_permissions_immutable_and_transactional(env, task):
    c, _, h = env
    assert c.get('/api/activity', headers=h[3]).status_code == 403
    assert c.get('/api/activity', headers=h[5]).json()['total'] == 0
    logs = c.get('/api/activity', headers=h[2]).json()
    assert logs['total'] >= 3
    assert c.put(f'/api/activity/{logs["items"][0]["id"]}', headers=h[1], json={'description': 'tampered'}).status_code in [404,405]
    before = logs['total']
    c.post(f'/api/tasks/{task["id"]}/status', headers=h[3], json={'status':'Completed'})
    assert c.get('/api/activity', headers=h[2]).json()['total'] == before
