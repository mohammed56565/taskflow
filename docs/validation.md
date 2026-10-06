# Delivery validation

Validation date: 19 September 2026. Sample names, projects, and comments are fictional.

## Executed checks

| Check | Result |
|---|---|
| Backend suite against PostgreSQL 18.4 | **41 passed**; two dependency deprecation warnings |
| Earlier backend suite against SQLite | 40 passed before the PostgreSQL-only concurrency case was added |
| PostgreSQL migrations | Upgrade to head, Alembic schema check, downgrade to base, and upgrade to head passed on a separate disposable database |
| SQLite migration portability | Upgrade/check/downgrade/upgrade passed |
| React production build | Passed with Vite 7.3.6; 1,601 modules transformed |
| Running integrated preview | React production preview, FastAPI, and PostgreSQL 18.4 communicate through `/api`; health endpoint returns OK |
| Authentication in browser | Admin, Project Manager, and Member sample sign-ins; sign-out and session restoration after reload verified |
| Search | Global search from the task page updates the query and returns the matching task |
| Member permissions | Administrative navigation and task creation/approval controls hidden; direct `/users` visit displays Access denied |
| Member task flow | Posted a discussion comment, submitted assigned work from In Progress to In Review; no approval action available |
| Manager review flow | Approved submitted work, verified completion timestamp, reopened with a reason, and verified return to In Progress with completion timestamp cleared |
| Audit trail | Comment, submission, approval, and reopen events visible; reopen reason included |
| Notifications | Inbox rendered, one notification marked read, success feedback displayed |
| Dashboard navigation | Member due-soon link retains both due-date and assigned-to-me filters and shows the two matching tasks |
| Desktop views | Login, dashboard, projects, project overview/members, tasks, task details, users, notifications, and activity inspected |
| Mobile at 390 × 844 | Dashboard, task table, and navigation drawer checked; table scroll stays inside its container, with no page-wide horizontal overflow |
| Tablet at 820 × 1180 | Task table and surrounding layout checked without page-wide horizontal overflow |
| Documentation artifacts | Nine screenshots and the generated OpenAPI schema included |
| Browser console | No errors recorded in the final browser check |

The browser review identified and fixed a table-header positioning issue that caused mobile overflow, keyboard visibility of the closed mobile drawer, and Member dashboard links that did not preserve task ownership filters. The production build was rerun after the final changes.

Local tooling: Windows, Python 3.12.14, Node.js 24.19.0, pnpm 11.19.0, PostgreSQL 18.4. Container configuration targets Python 3.12, Node.js 22, and PostgreSQL 17.

## Automated coverage

| Area | Test file / coverage |
|---|---|
| Authentication and users | `test_auth_users.py`: login failures, malformed tokens, refresh rotation/expiry/revocation, disabled accounts, role escalation prevention, password change, origin validation, final administrator protection, and concurrent administrator changes |
| Projects and tasks | `test_projects_tasks.py`: role and resource scopes, manager membership/replacement, project dates, member removal, archive/read-only behavior, assignment, unassigned tasks, workflow transitions, reopen reason, due-date boundaries, progress, search, filtering, sorting, and pagination |
| Collaboration | `test_collaboration.py`: assignment/reassignment recipients, review/return/approval recipients, comment ownership/moderation, recipient deduplication, private notifications, read actions, and authorized immutable activity |

The PostgreSQL concurrency test uses a dedicated disposable test database. The live preview database is separate. SQLite does not implement PostgreSQL row-lock semantics; the concurrency case is intentionally skipped in SQLite mode.

## Acceptance status and limits

The application, backend rules, database integration, responsive interface, source documentation, and local demo are implemented and exercised. The browser pass is a targeted manual regression check, not an exhaustive automated frontend test suite.

Dockerfiles, the Compose stack, and a CI Compose smoke job are supplied. **Docker is not installed on this machine, so container startup has not been executed here.** The GitHub Actions workflow has not been run remotely. Its presence is not evidence of a passing CI run. BRD acceptance item 44 (working Docker execution) and a complete fresh-machine installation check remain unverified until run in an environment with Docker.

No public deployment or GitHub repository push was performed. Public hosting requires a chosen host, HTTPS, production secrets, trusted origins, backups, and edge login throttling as described in the README. The local preview and generated sample credentials are only for demonstration.

No critical application defect was identified in the checks performed. This is not a penetration test or a guarantee of behavior outside the tested cases.
