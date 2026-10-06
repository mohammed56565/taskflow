# API guide

Base URL for local development: `http://localhost:8000/api`. The frontend uses relative `/api` URLs through a same-origin proxy. Interactive schemas are available at `/docs`; the saved schema is [openapi.json](openapi.json).

## Authentication

`POST /auth/login`

```json
{"email":"your-admin@example.com","password":"your-configured-password"}
```

Returns `access_token`, `token_type`, and a public user object; sets the HttpOnly refresh cookie. Use `Authorization: Bearer <access_token>` for protected endpoints.

`POST /auth/refresh` rotates a valid refresh cookie and returns a new access token. `POST /auth/logout` revokes that session and clears the cookie. Do not store bearer tokens in localStorage. Cookies require a matching configured Origin and same-site requests.

## Endpoint map

All paths below are prefixed with `/api`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Process health |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | Session lifecycle |
| GET, PUT | `/auth/me` | Current profile |
| POST | `/auth/password` | Change password and revoke sessions |
| GET, POST | `/users` | Admin account listing/creation |
| PUT | `/users/{id}` | Admin edits name, email, role, active status |
| GET | `/users/directory` | Paginated active account picker for managers/admins |
| GET, POST | `/projects` | Authorized project collection and creation |
| GET, PUT | `/projects/{id}` | Project details/update |
| POST | `/projects/{id}/archive`, `/projects/{id}/restore` | Project archive lifecycle |
| GET, POST | `/projects/{id}/members` | Member listing/addition |
| DELETE | `/projects/{id}/members/{user_id}` | Remove eligible member |
| GET, POST | `/tasks` | Authorized task collection and creation |
| GET, PUT | `/tasks/{id}` | Task details/update |
| POST | `/tasks/{id}/status` | Validated workflow transition |
| POST | `/tasks/{id}/archive`, `/tasks/{id}/restore` | Task archive lifecycle |
| GET, POST | `/tasks/{id}/comments` | Comment listing/creation |
| PUT, DELETE | `/comments/{id}` | Own comment edit/delete; Admin moderation |
| GET | `/notifications` | Current user's history |
| POST | `/notifications/{id}/read`, `/notifications/read-all` | Read state |
| GET | `/activity` | Authorized immutable activity |
| GET | `/dashboard` | Aggregates and bounded recent items |

PUT requests use complete editable-resource payloads, as documented in OpenAPI. Extra fields are rejected to prevent privilege escalation through profile/task requests.

## Example payloads

Create project (Admin/Project Manager):

```json
{
  "name": "Website redesign",
  "description": "Refresh the customer experience",
  "start_date": "2026-09-01",
  "due_date": "2026-12-31",
  "status": "Planning"
}
```

`manager_id` is optional on creation; defaults to the caller. A Project Manager cannot create a project under another manager. Admins may choose another active manager. Updates require `manager_id`.

Create task:

```json
{
  "project_id": 1,
  "title": "Build dashboard",
  "description": "Implement the agreed KPIs",
  "assigned_to": null,
  "priority": "Medium",
  "due_date": "2026-10-01"
}
```

For task PUT updates, omit `project_id`. Task status is changed separately:

```json
{"status":"In Review","reason":""}
```

Reopen a completed task:

```json
{"status":"In Progress","reason":"Address the accessibility review"}
```

Other payloads:

```json
{"user_id": 3}
```

```json
{"content":"The first pass is ready for review."}
```

```json
{"current_password":"current-value","new_password":"new-value-at-least-8","confirm_password":"new-value-at-least-8"}
```

## Search, filters, and sorting

All collection endpoints accept `page` (1+) and `page_size` (1–100; default 20).

| Collection | Filters |
|---|---|
| Projects | `q`, `status`, `manager_id`, `archived` |
| Tasks | `q`, `project_id`, `status`, `priority`, `assigned_to`, `unassigned`, `mine`, `due_date`, `due=overdue` or `due=soon`, `archived` |
| Users | `q`, `role`, `active` |
| Members | `q` |
| Notifications | `unread=true` |
| Activity | `project_id` |

`archived=false` is the default for project/task lists. It selects unarchived records; it is separate from the project status Active. Task search covers title, description, and project name. Project search covers project name.

Task sort values: `created_at`, `updated_at`, `due_date`, `priority`, `name`. Project sort values: `name`, `start_date`, `due_date`, `created_at`. Both accept `direction=asc` or `desc`; the default is created date descending. Priority sorts numerically Low < Medium < High < Urgent. Undated tasks sort last.

```text
GET /api/tasks?q=dashboard&status=In%20Review&priority=High&page=1&page_size=20&sort=due_date&direction=asc
```

Response shape:

```json
{"items": [], "total": 0, "page": 1, "page_size": 20}
```

## Errors

| Status | Meaning |
|---|---|
| 401 | Missing, invalid, expired, revoked authentication or disabled account |
| 403 | Visible resource but forbidden action, or forbidden role/origin |
| 404 | Missing resource or outside the caller's project scope |
| 409 | Archive, membership, final-admin, duplicate, or existing-data conflict |
| 422 | Invalid input or workflow transition |

```json
{"detail":"Archived projects are read-only"}
```

Field-validation responses include sanitized `errors` with field names and messages. They never echo request inputs such as passwords.
