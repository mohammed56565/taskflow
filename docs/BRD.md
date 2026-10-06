# Business Requirements Document (BRD)

# TaskFlow – Task & Project Management System

**Version:** 1.1
**Document Status:** Approved Development Baseline
**Date:** September 19, 2026
**Project Type:** Full-Stack Web Application
**Primary Interface Language:** English
**Project Owner:** To be defined

---

# 1. Executive Summary

TaskFlow is a full-stack web application designed to help teams manage projects, tasks, responsibilities, deadlines, progress, and collaboration within one centralized platform.

The system enables Project Managers to create projects, add team members, create and assign tasks, define priorities and due dates, review completed work, and monitor project progress.

Team Members can view projects they belong to, manage their assigned tasks, submit work for review, collaborate through task comments, and receive in-app notifications.

Administrators manage users, roles, account status, and system-wide access.

TaskFlow supports three user roles:

* Admin
* Project Manager
* Member

The platform also includes:

* Project dashboards
* Task management
* Role-Based Access Control
* Comments
* In-app notifications
* Activity logs
* Search
* Filtering
* Sorting
* Pagination
* Responsive web design
* Automated backend testing
* Docker support after core development is complete

The approved technology stack is:

* React
* Vite
* Tailwind CSS
* FastAPI
* PostgreSQL
* SQLAlchemy
* Alembic
* JWT Authentication
* Docker

The objective is to build a realistic, complete, maintainable, and portfolio-ready full-stack application appropriate for a recent university graduate.

---

# 2. Problem Statement

Teams often manage work through disconnected channels such as:

* Messaging applications
* Email
* Spreadsheets
* Personal notes
* Separate documents

This can cause:

* Unclear task ownership
* Missed deadlines
* Poor project visibility
* Difficulty identifying overdue work
* Scattered discussions
* Lack of accountability
* No reliable history of changes
* Difficulty knowing which tasks require review
* Difficulty monitoring overall project progress

TaskFlow solves these problems by centralizing project and task management in one structured platform.

---

# 3. Business Objectives

TaskFlow aims to:

1. Centralize projects and tasks.
2. Clearly identify task ownership.
3. Allow Project Managers to monitor project progress.
4. Allow Members to manage their assigned work.
5. Support a structured task review process.
6. Identify overdue and due-soon tasks.
7. Enforce clear role-based permissions.
8. Maintain a history of important activities.
9. Support collaboration through comments.
10. Notify users about relevant events.
11. Provide useful dashboards and progress indicators.
12. Provide consistent search, filtering, sorting, and pagination.
13. Provide a secure REST API.
14. Provide a responsive and professional user interface.
15. Produce a complete GitHub-ready software project.

---

# 4. Project Scope

## 4.1 In Scope

Version 1 includes:

### Authentication

* Login
* Logout
* JWT authentication
* Access Tokens
* Refresh Tokens
* Token refresh
* Refresh Token invalidation during logout

### User Management

* Create users
* Edit users
* Activate accounts
* Deactivate accounts
* Assign user roles
* Update personal profile information
* Change password

### Project Management

* Create projects
* Edit projects
* View projects
* Add project members
* Remove project members
* Assign Project Manager
* Track project progress
* Change project status
* Archive projects
* Restore archived projects

### Task Management

* Create tasks
* Create unassigned tasks
* Edit tasks
* Assign tasks
* Reassign tasks
* Define priority
* Define due date
* Update task status
* Submit tasks for review
* Approve tasks
* Return tasks for additional work
* Archive tasks
* Restore tasks

### Collaboration

* Add comments
* Edit own comments
* Delete own comments
* View comments

### Notifications

* Task assignment
* Task reassignment
* Review submission
* Task approval
* Task returned for additional work
* New task comments

### Dashboards

* Active projects
* My Tasks
* Completed Tasks
* Overdue Tasks
* Due Soon Tasks
* Tasks by status
* Tasks by priority
* Project progress

### Activity Tracking

* Project creation
* Project updates
* Project archiving
* Project restoration
* Member additions
* Member removals
* Task creation
* Task assignment
* Task reassignment
* Task status changes
* Task archiving
* Task restoration
* Important comment actions

### Data Navigation

* Search
* Filtering
* Sorting
* Pagination

### UI/UX

* Responsive layout
* Desktop
* Tablet
* Mobile
* Sidebar navigation
* Top navigation bar
* Loading states
* Empty states
* Error states
* Confirmation dialogs
* Toast feedback
* Skeleton loaders

---

# 5. Out of Scope

Version 1 does not include:

* AI features
* AI chatbot
* Generative AI
* Mobile native application
* Google authentication
* Microsoft authentication
* Calendar integration
* Email notifications
* SMS notifications
* Real-time chat
* Video calls
* Payments
* Billing
* Time tracking
* Recurring tasks
* Subtasks
* Task dependencies
* Multi-organization support
* Microservices
* Advanced analytics
* File attachments
* Cloud file storage
* Dark Mode
* Profile image uploads
* Automated scheduled reminder notifications

These may be considered in future versions.

---

# 6. User Roles

## 6.1 Admin

The Admin has system-wide management permissions.

An Admin can:

* Create users
* Edit users
* Assign roles
* Activate accounts
* Deactivate accounts
* View all projects
* View all tasks
* Manage projects when required
* View system-wide Activity Logs
* Access administrative pages

At least one active Admin must always remain in the system.

---

## 6.2 Project Manager

A Project Manager manages projects assigned to them.

A Project Manager can:

* Create projects
* Edit managed projects
* Add Members
* Remove Members
* Create tasks
* Create unassigned tasks
* Assign tasks
* Reassign tasks
* Change priority
* Change due dates
* Review submitted tasks
* Approve tasks
* Return tasks for additional work
* Archive tasks
* Restore tasks
* Archive projects
* Restore projects
* View project Activity Logs
* Monitor project progress

---

## 6.3 Member

A Member participates in one or more projects.

A Member can:

* View projects they belong to
* View tasks inside authorized projects
* View assigned tasks
* Update the status of assigned tasks
* Submit assigned tasks for review
* Add task comments
* Edit or delete their own comments
* View notifications
* Manage personal profile information
* Change password

A Member cannot:

* Create projects
* Manage users
* Add project members
* Remove project members
* Assign tasks
* Approve tasks
* Archive projects
* Access unauthorized projects

---

# 7. Permission Matrix

| Action                      | Admin       | Project Manager  | Member              |
| --------------------------- | ----------- | ---------------- | ------------------- |
| Manage users                | Yes         | No               | No                  |
| Create Project              | Yes         | Yes              | No                  |
| Edit Project                | Yes         | Managed projects | No                  |
| Archive Project             | Yes         | Managed projects | No                  |
| Restore Project             | Yes         | Managed projects | No                  |
| Add Members                 | Yes         | Managed projects | No                  |
| Remove Members              | Yes         | Managed projects | No                  |
| View Project                | All         | Managed projects | Joined projects     |
| Create Task                 | Yes         | Managed projects | No                  |
| Create Unassigned Task      | Yes         | Yes              | No                  |
| Edit Task                   | Yes         | Managed projects | Limited             |
| Assign Task                 | Yes         | Managed projects | No                  |
| Reassign Task               | Yes         | Managed projects | No                  |
| Change Assigned Task Status | Yes         | Yes              | Yes                 |
| Approve Task                | Yes         | Yes              | No                  |
| Add Comments                | Yes         | Yes              | Authorized projects |
| View Activity Log           | System-wide | Managed projects | No                  |
| Manage User Roles           | Yes         | No               | No                  |

Backend authorization is mandatory for every protected operation.

Frontend visibility alone must never be considered a security control.

---

# 8. Authentication

## FR01 – User Login

Users must log in using:

* Email
* Password

### Acceptance Criteria

* Email is required.
* Password is required.
* Invalid credentials are rejected.
* Disabled accounts cannot log in.
* Successful login returns authentication credentials.
* Password values are never returned by the API.
* Authentication failures return a clear error message.

---

## FR02 – Access Token

The system uses JWT Access Tokens for protected API access.

### Rules

* Access Token lifetime: approximately 30 minutes.
* The Access Token must be included with protected API requests.
* Expired tokens must be rejected.

### Acceptance Criteria

* Requests without valid authentication are rejected.
* Invalid tokens cannot access protected resources.
* Expired tokens cannot access protected resources.

---

## FR03 – Refresh Token

The system must support Refresh Tokens.

Recommended lifetime:

**7 days**

Endpoint:

```text
POST /auth/refresh
```

### Acceptance Criteria

* A valid Refresh Token can generate a new Access Token.
* Invalid Refresh Tokens are rejected.
* Expired Refresh Tokens are rejected.
* Revoked Refresh Tokens are rejected.

---

## FR04 – Logout

Endpoint:

```text
POST /auth/logout
```

Logout must invalidate the user's active Refresh Token.

The frontend must then remove local session information.

---

# 9. Initial Administrator

Public registration is not available.

The first Admin must therefore be created through a seed script or equivalent development command.

Example:

```text
python seed_admin.py
```

Admin credentials must come from environment variables such as:

```text
ADMIN_NAME
ADMIN_EMAIL
ADMIN_PASSWORD
```

Admin credentials must never be hardcoded into source code.

---

# 10. User Management

## FR05 – Create User

Admin can create users.

Required information:

* Name
* Email
* Password
* Role

### Acceptance Criteria

* Only Admin can create users.
* Email must be unique.
* Email must use a valid format.
* Name cannot be empty.
* Password must contain at least 8 characters.
* Role must be valid.
* New users are active by default unless explicitly configured otherwise.

---

## FR06 – Edit User

Admin can update:

* Name
* Email
* Role
* Account status

### Acceptance Criteria

* Duplicate emails are rejected.
* Invalid roles are rejected.
* Users cannot change their own role through Profile Management.
* The final active Admin cannot be demoted or disabled.

---

## FR07 – Account Deactivation

Admin can deactivate a user.

### Acceptance Criteria

* Disabled users cannot log in.
* Existing tasks assigned to the user remain stored.
* Tasks are not automatically deleted.
* Project Managers can identify and reassign these tasks.
* Deactivation requires confirmation.

---

# 11. Profile Management

## FR08 – Profile

Users can update:

* Name
* Email

Users can also change their password.

Profile images are not supported.

The interface may display a user's initials as a visual identifier.

Example:

```text
Mohammed Alharbi → MA
```

### Acceptance Criteria

* Users can update their own name.
* Users can update their own email if it remains unique.
* Users cannot change their own role.
* Users cannot activate or deactivate themselves.

---

## FR09 – Change Password

Password changes require:

* Current Password
* New Password
* Confirm New Password

### Acceptance Criteria

* Current password must be correct.
* New password must contain at least 8 characters.
* Confirmation must match the new password.
* Passwords must be securely hashed.

---

# 12. Project Management

## FR10 – Create Project

Admin and Project Manager can create projects.

Each project contains:

* ID
* Name
* Description
* Project Manager
* Start Date
* Due Date
* Status
* Created At
* Updated At
* Archived At

### Acceptance Criteria

* Project Name is required.
* Name must contain meaningful text.
* Maximum recommended length is 150 characters.
* Start Date is required.
* Due Date is required.
* Start Date cannot be after Due Date.
* Project Manager must be active.
* A Project Manager creating a project becomes its manager by default.
* Admin may select another active Project Manager.
* Project Manager is automatically added as a project member.
* Default project status is Planning.
* Invalid data must not create a project.

---

# 13. Project Status

Project statuses are:

* Planning
* Active
* Completed
* Archived

Default:

**Planning**

---

# 14. Project Members

## FR11 – Add Member

Project Manager may add active users to a managed project.

### Acceptance Criteria

* User must exist.
* User must be active.
* Duplicate membership is not allowed.
* Project Manager is already considered a project member.
* Member becomes visible in the project member list.

---

## FR12 – Remove Member

Project Manager may remove a Member.

### Rules

A Member with unfinished assigned tasks cannot be removed until those tasks are reassigned.

### Acceptance Criteria

* Removal requires confirmation.
* Project Manager cannot remove themselves while they remain Project Manager.
* Unfinished tasks must be reassigned first.
* Removing membership does not delete historical Activity Logs.

---

# 15. Project Manager Membership

The Project Manager is automatically a member of the managed project.

A Project Manager cannot be removed from project membership without first assigning a replacement Project Manager.

When Project Manager changes:

1. New manager becomes a project member automatically.
2. Old manager may remain as a normal Member.
3. Old manager may later be removed if no business rule prevents it.

---

# 16. Project Date Rules

The following rule must always apply:

```text
Project Start Date <= Project Due Date
```

Projects use date-only values for Start Date and Due Date.

Dates do not include a specific time of day.

---

# 17. Project Archiving

## FR13 – Archive Project

Admin or authorized Project Manager may archive a project.

Archived projects become **Read-Only**.

No project data is deleted.

### While Archived

Users may:

* View project information
* View members
* View tasks
* View comments
* View historical Activity Logs

Users may not:

* Create Tasks
* Edit Tasks
* Change Task Status
* Assign Tasks
* Add Members
* Remove Members
* Add Comments
* Edit Project information

### Acceptance Criteria

* Archiving requires confirmation.
* Project data remains stored.
* Related tasks remain stored.
* Related comments remain stored.
* Related Activity Logs remain stored.
* Archived project displays an Archived state clearly.
* Modification endpoints reject changes to archived projects.

---

## FR14 – Restore Project

Admin or Project Manager may restore an archived project.

The project should return to the operational status it had immediately before archiving where possible.

The restoration must be recorded in the Activity Log.

---

# 18. Task Management

## FR15 – Create Task

Admin or Project Manager may create tasks.

A task contains:

* ID
* Project
* Title
* Description
* Assignee
* Priority
* Status
* Due Date
* Created By
* Created At
* Updated At
* Completed At
* Archived At

### Acceptance Criteria

* Task Title is required.
* Task Title maximum recommended length is 200 characters.
* Task belongs to exactly one project.
* Project must not be archived.
* Description is optional.
* Task may be created without an Assignee.
* If an Assignee exists, the Assignee must be an active project member.
* Default Priority is Medium.
* Default Status is To Do.
* Due Date is optional.
* Invalid data must not create the task.

---

# 19. Unassigned Tasks

Tasks may exist without an Assignee.

Example:

```text
Task: Build Dashboard
Assignee: Unassigned
Status: To Do
```

Only Admin or Project Manager may assign an unassigned task.

Members cannot self-assign tasks in Version 1.

Unassigned tasks should appear clearly on the Project Manager Dashboard.

---

# 20. Task Date Rules

Task Due Date uses a **date-only** value.

Task Due Date must satisfy:

```text
Project Start Date <= Task Due Date <= Project Due Date
```

A task cannot have a Due Date before the project's Start Date.

A task cannot have a Due Date after the project's Due Date.

---

# 21. Task Priority

Available values:

* Low
* Medium
* High
* Urgent

Default:

**Medium**

---

# 22. Task Status

Available statuses:

* To Do
* In Progress
* In Review
* Completed

Default:

**To Do**

---

# 23. Task Workflow

Standard workflow:

```text
To Do
  ↓
In Progress
  ↓
In Review
  ↓
Completed
```

---

## Member Transitions

Members may perform the following transitions on tasks assigned to them:

```text
To Do → In Progress
In Progress → To Do
In Progress → In Review
In Review → In Progress
```

Members cannot mark a task as Completed.

---

## Project Manager Transitions

Project Managers may perform:

```text
To Do ↔ In Progress
In Progress ↔ In Review
In Review → Completed
Completed → In Progress
```

When a task is moved from:

```text
In Review → In Progress
```

it is treated as returned for additional work.

When:

```text
In Review → Completed
```

the task is considered approved.

---

## Reopening Completed Tasks

Only Admin or Project Manager may reopen a Completed Task.

The transition is:

```text
Completed → In Progress
```

A reason should be recorded.

The action must be saved in the Activity Log.

---

# 24. Task Archiving

## FR16 – Archive Task

Admin or Project Manager may archive tasks.

Archived tasks become read-only.

Archived tasks:

* Remain stored
* Remain visible when Archived filter is selected
* Do not count toward active project progress
* Cannot be modified until restored

Archiving requires confirmation.

---

## FR17 – Restore Task

Admin or Project Manager may restore an archived task.

The restoration must be recorded in the Activity Log.

---

# 25. Overdue Tasks

A task is Overdue when:

```text
Current Date > Due Date
AND
Status != Completed
AND
Task is not Archived
```

Overdue is a calculated property.

It is not a separate Task Status.

Tasks without Due Dates cannot be Overdue.

---

# 26. Due Soon Tasks

A task is Due Soon when:

```text
Due Date is today or within the next 3 calendar days
AND
Current Date <= Due Date
AND
Status != Completed
AND
Task is not Archived
```

Example:

If the current date is September 18:

```text
September 18 → Due Soon
September 19 → Due Soon
September 20 → Due Soon
September 21 → Due Soon
```

A task whose Due Date has already passed is Overdue, not Due Soon.

Overdue and Due Soon must never overlap.

---

# 27. Project Progress

Project Progress is calculated as:

```text
Completed Active Tasks
---------------------- × 100
Total Active Tasks
```

Archived tasks are excluded.

Example:

```text
Total Active Tasks: 10
Completed Tasks: 7

Project Progress = 70%
```

If a project has no active tasks:

```text
Project Progress = 0%
```

---

# 28. Comments

## FR18 – Add Comment

Authorized users may add comments to Tasks inside projects they can access.

Comment fields:

* ID
* Task ID
* User ID
* Content
* Created At
* Updated At

### Acceptance Criteria

* User must have project access.
* Task must not be archived.
* Project must not be archived.
* Comment cannot be empty.
* Comment maximum recommended length is 2000 characters.

---

## FR19 – Edit Comment

Users may edit their own comments.

Admin may moderate comments when required.

---

## FR20 – Delete Comment

Users may delete their own comments.

Admin may delete any comment.

Deletion requires confirmation.

Important moderation or deletion actions may be recorded in the Activity Log.

---

# 29. Notifications

## FR21 – In-App Notifications

Notifications must only be created for meaningful events.

---

## Task Assignment

Recipient:

```text
New Assignee
```

Example:

```text
You were assigned to "Build Dashboard".
```

---

## Task Reassignment

New Assignee receives:

```text
"Build Dashboard" has been assigned to you.
```

Previous Assignee receives:

```text
You are no longer assigned to "Build Dashboard".
```

---

## Task Submitted for Review

When:

```text
In Progress → In Review
```

Recipient:

```text
Project Manager
```

---

## Task Approved

When:

```text
In Review → Completed
```

Recipient:

```text
Task Assignee
```

---

## Task Returned

When:

```text
In Review → In Progress
```

Recipient:

```text
Task Assignee
```

Example:

```text
"Build Dashboard" was returned for additional work.
```

---

## New Comment

Recipients:

* Task Assignee
* Project Manager

The user who created the comment must not receive a notification for their own comment.

---

## Notification Data

Each Notification contains:

* ID
* User ID
* Type
* Message
* Related Entity Type
* Related Entity ID
* Is Read
* Created At

Users can:

* View notifications
* Mark one notification as read
* Mark all notifications as read

---

# 30. Scheduled Notifications

Automatic scheduled reminders such as:

```text
Your task is due tomorrow.
```

are not included in Version 1.

Due Soon tasks are displayed through Dashboard logic instead.

This avoids introducing background schedulers in the initial version.

---

# 31. Dashboard

## FR22 – Member Dashboard

Member Dashboard contains:

* Active Projects
* My Tasks
* Completed Tasks
* Overdue Tasks
* Due Soon Tasks
* Tasks by Status
* Tasks by Priority
* Recent Tasks

---

## FR23 – Project Manager Dashboard

Project Manager Dashboard includes:

* Active Projects
* Total Tasks
* Unassigned Tasks
* Completed Tasks
* Overdue Tasks
* Due Soon Tasks
* Tasks by Status
* Tasks by Priority
* Project Progress
* Tasks by Member

---

# 32. Search

## FR24 – Search

Search must support:

* Task Title
* Task Description
* Project Name

Search results must respect user permissions.

Users must never discover unauthorized projects or tasks through search.

---

# 33. Filtering

## FR25 – Task Filters

Tasks may be filtered by:

* Project
* Status
* Priority
* Assigned User
* Unassigned
* Due Date
* Overdue
* Due Soon
* Active
* Archived

---

## Project Filters

Projects may be filtered by:

* Status
* Project Manager

---

# 34. Sorting

## FR26 – Sorting

Tasks may be sorted by:

* Created Date
* Updated Date
* Due Date
* Priority
* Name

Projects may be sorted by:

* Name
* Start Date
* Due Date
* Created Date

---

# 35. Pagination

## FR27 – Pagination

Large result sets must use pagination.

Recommended default:

```text
20 records per page
```

API parameters should support:

```text
page
page_size
```

Results must use a stable ordering.

---

# 36. Activity Log

## FR28 – Activity Tracking

Important actions must be recorded.

Each Activity Log contains:

* ID
* User ID
* Action
* Entity Type
* Entity ID
* Description
* Created At

Examples:

```text
Mohammed created project "Website Redesign".

Mohammed assigned "Build Dashboard" to Ahmed.

Ahmed changed "Build Dashboard":
In Progress → In Review.

Mohammed approved "Build Dashboard".
```

Users cannot manually edit Activity Logs.

---

# 37. Data Validation

General validation rules include:

```text
User Name:
1–100 characters

Project Name:
1–150 characters

Project Description:
Maximum 5000 characters

Task Title:
1–200 characters

Task Description:
Maximum 5000 characters

Comment:
1–2000 characters

Password:
Minimum 8 characters

Email:
Valid email format
```

Whitespace-only strings are invalid for required text fields.

Example:

```text
"        "
```

must not be accepted as a valid Project Name or Task Title.

---

# 38. Date and Time Standards

Business dates such as:

* Project Start Date
* Project Due Date
* Task Due Date

use date-only values.

Example:

```text
2026-09-30
```

System timestamps such as:

* Created At
* Updated At
* Completed At
* Archived At
* Comment Created At
* Notification Created At
* Activity Created At

must be stored in **UTC**.

The frontend converts UTC timestamps to the user's local timezone for display.

Date-only values must not be timezone-converted.

---

# 39. Main Data Entities

## User

```text
id
name
email
password_hash
role
is_active
created_at
updated_at
```

---

## Project

```text
id
name
description
manager_id
status
start_date
due_date
created_at
updated_at
archived_at
```

---

## Project Member

```text
id
project_id
user_id
joined_at
```

---

## Task

```text
id
project_id
title
description
status
priority
assigned_to
created_by
due_date
completed_at
archived_at
created_at
updated_at
```

`assigned_to` may be null.

---

## Comment

```text
id
task_id
user_id
content
created_at
updated_at
```

---

## Notification

```text
id
user_id
type
message
related_entity_type
related_entity_id
is_read
created_at
```

---

## Activity Log

```text
id
user_id
action
entity_type
entity_id
description
created_at
```

---

# 40. Entity Relationships

```text
User
 ├── manages Projects
 ├── belongs to Projects
 ├── receives Tasks
 ├── creates Tasks
 ├── creates Comments
 ├── receives Notifications
 └── generates Activity Logs


Project
 ├── Project Manager
 ├── Members
 └── Tasks


Task
 ├── belongs to Project
 ├── has optional Assignee
 ├── has Creator
 └── has Comments
```

---

# 41. Main Business Scenario

1. Initial Admin account is created through the seed process.
2. Admin creates user accounts.
3. Project Manager logs in.
4. Project Manager creates a Project.
5. Project Manager is automatically added as a project member.
6. Project Manager adds Members.
7. Project Manager creates Tasks.
8. Some Tasks may initially remain Unassigned.
9. Project Manager assigns Tasks to Members.
10. Members receive assignment notifications.
11. Member opens Dashboard.
12. Member starts an assigned Task.
13. Status changes from To Do to In Progress.
14. Member performs the work.
15. Member adds comments if necessary.
16. Member submits the Task for review.
17. Status changes to In Review.
18. Project Manager receives a notification.
19. Project Manager reviews the Task.
20. Project Manager either:

    * Approves the Task and changes it to Completed, or
    * Returns the Task to In Progress.
21. Relevant users receive notifications.
22. Important actions are recorded in the Activity Log.
23. Dashboard statistics and Project Progress update accordingly.

---

# 42. Approved Technical Stack

## Frontend

```text
React
Vite
Tailwind CSS
```

---

## Backend

```text
Python
FastAPI
```

---

## Database

```text
PostgreSQL
```

---

## ORM

```text
SQLAlchemy
```

---

## Database Migrations

```text
Alembic
```

---

## Authentication

```text
JWT
```

With:

* Access Token
* Refresh Token

---

## Icons

Recommended:

```text
Lucide React
```

---

# 43. REST API

React communicates with FastAPI using HTTP and JSON.

Main API groups:

```text
/auth
/users
/projects
/projects/{id}/members
/tasks
/comments
/notifications
/activity
```

HTTP methods include:

```text
GET
POST
PATCH
DELETE
```

Using DELETE at API level does not automatically mean permanent database deletion if the associated business rule requires archiving instead.

---

# 44. System Architecture

```text
React + Vite + Tailwind CSS
            │
            │ HTTP / JSON
            ↓
       FastAPI REST API
            │
            ↓
        SQLAlchemy
            │
            ↓
        PostgreSQL
```

Backend responsibilities:

* Authentication
* Authorization
* Validation
* Business Rules
* Database operations
* Notifications
* Activity Logs

Frontend responsibilities:

* User Interface
* Navigation
* API communication
* Client-side validation
* User feedback
* Permission-based visibility

---

# 45. Frontend Authorization

Frontend must hide actions the user is not authorized to perform.

Example:

A Member should not see:

* Create Project
* Manage Users
* Add Members
* Archive Project

However, frontend hiding is only a usability feature.

Backend authorization must independently enforce all permissions.

Example:

If a Member manually sends:

```text
POST /projects
```

the API must return:

```text
403 Forbidden
```

---

# 46. UI/UX Design Direction

TaskFlow must follow a **Modern SaaS Dashboard** design style.

The interface should feel:

* Clean
* Professional
* Simple
* Consistent
* Spacious
* Functional

The design must avoid:

* Heavy gradients
* Glassmorphism
* Excessive animations
* Decorative complexity
* Unnecessary visual effects

The focus is clarity and usability.

---

# 47. Theme

Version 1 uses:

**Light Mode only**

Recommended visual direction:

```text
Primary: Indigo / Blue
Background: Light Gray
Cards: White
Main Text: Dark Gray / Near Black
Secondary Text: Muted Gray
Borders: Light Gray
```

Suggested colors:

```text
Primary       #4F46E5
Background    #F8FAFC
Card          #FFFFFF
Main Text     #0F172A
Secondary     #64748B
Border        #E2E8F0
```

Equivalent Tailwind design tokens may be used.

---

# 48. Status Colors

Task Status should use consistent visual badges.

Recommended:

```text
To Do          Gray
In Progress    Blue
In Review      Amber
Completed      Green
```

Priority badges:

```text
Low            Gray
Medium         Blue
High           Orange
Urgent         Red
```

The same status must use the same visual treatment throughout the application.

---

# 49. Main Application Layout

Desktop layout:

```text
┌────────────────────────────────────────────────────┐
│ Sidebar │                Main Content              │
│         │                                           │
│ TaskFlow│ Page Title                 Notifications │
│         │                                           │
│Dashboard│                                           │
│Projects │                                           │
│Tasks    │                                           │
│         │                                           │
│Users    │                                           │
│Activity │                                           │
│         │                                           │
│Profile  │                                           │
└────────────────────────────────────────────────────┘
```

---

# 50. Sidebar Navigation

Desktop Sidebar may contain:

```text
TaskFlow

Dashboard
Projects
Tasks

----------------

Users
Activity Log

----------------

Notifications
Profile
Logout
```

Items must be displayed according to permissions.

Example:

`Users` is visible to Admin only.

On mobile, the Sidebar becomes a Drawer opened through a menu button.

---

# 51. Top Bar

Top Bar should include:

* Current page context
* Notification button
* User identity
* User menu

Because Profile Images are not supported, the UI should display user initials.

Example:

```text
MA
```

User menu may contain:

```text
Mohammed Alharbi
Member

Profile
Logout
```

---

# 52. Dashboard Design

Dashboard should begin with KPI Cards.

Example:

```text
Active Projects
5

My Tasks
12

Due Soon
4

Overdue
2
```

The Dashboard should include no more than a few useful visualizations.

Recommended:

* Tasks by Status
* Tasks by Priority

Additional sections:

* Recent Tasks
* Project Progress

The Dashboard should prioritize useful information over decorative charts.

---

# 53. Projects Page

Projects should primarily use Cards.

Header example:

```text
Projects                       + New Project

[ Search projects... ] [ Status ▼ ]
```

Each Project Card may display:

* Project Name
* Description
* Status
* Progress
* Number of Tasks
* Due Date

---

# 54. Project Details Page

Project Details should include:

* Project Name
* Status
* Description
* Start Date
* Due Date
* Project Manager
* Progress

Recommended tabs:

```text
Overview | Tasks | Members | Activity
```

### Overview

Displays:

* Progress
* Total Tasks
* Completed Tasks
* Overdue Tasks
* Members

### Tasks

Displays project tasks.

### Members

Displays Project Manager and Members.

### Activity

Displays project activity in chronological order.

---

# 55. Tasks Page

Tasks should primarily use a Table because users may need to compare many tasks.

Header:

```text
Tasks                           + New Task

[ Search tasks... ]

[ Project ▼ ]
[ Status ▼ ]
[ Priority ▼ ]
[ Assignee ▼ ]
[ Due Date ▼ ]
```

Recommended columns:

| Task | Project | Assignee | Priority | Status | Due Date |
| ---- | ------- | -------- | -------- | ------ | -------- |

Status and Priority should use badges.

Each row may contain an action menu according to user permissions.

---

# 56. Task Details Page

Task Details should use a two-column desktop layout.

Main content:

* Title
* Description
* Comments

Side panel:

* Status
* Priority
* Assignee
* Project
* Due Date
* Created By

On smaller screens, these sections stack vertically.

---

# 57. Forms

Smaller forms should use Modals or Drawers.

Example:

**Create Task**

```text
Title
Description
Project
Assignee
Priority
Due Date

Cancel | Create Task
```

Larger forms may use dedicated pages where appropriate.

Forms must:

* Display validation messages
* Preserve entered values after validation errors where possible
* Clearly distinguish required and optional fields

---

# 58. Users Page

Admin-only page.

Recommended table:

| User | Email | Role | Status | Created |
| ---- | ----- | ---- | ------ | ------- |

Actions:

* Edit
* Activate
* Deactivate

Account deactivation requires confirmation.

---

# 59. Notifications UI

Notification Bell should provide a compact preview.

Example:

```text
Notifications

Ahmed commented on "Dashboard"
2 min ago

"Login API" was returned for changes
1 hour ago

View all notifications
```

A dedicated `/notifications` page displays full notification history.

Unread notifications should be visually distinguishable.

---

# 60. Profile Page

Profile page contains:

```text
Name
Email
Role
```

Role is read-only.

The page also includes:

```text
Change Password

Current Password
New Password
Confirm New Password
```

No Profile Image functionality is included.

---

# 61. Loading States

Pages that retrieve API data must provide loading feedback.

Preferred approach:

**Skeleton Loaders**

rather than only displaying:

```text
Loading...
```

---

# 62. Empty States

Empty lists must display meaningful messages.

Example:

```text
No projects yet.

Create your first project to start organizing your team's work.

[ Create Project ]
```

For users without creation permission:

```text
You haven't been added to any projects yet.
```

The UI must not display actions the user is not authorized to perform.

---

# 63. Error States

The UI must handle errors clearly.

Examples:

### API Failure

```text
Failed to load tasks.
Please try again.
```

### 403

```text
Access Denied

You do not have permission to view this page.

[ Back to Dashboard ]
```

### 404

```text
Page Not Found

The page you're looking for does not exist.

[ Back to Dashboard ]
```

---

# 64. Confirmation Dialogs

Confirmation Dialogs are required for destructive or significant actions.

Examples:

* Archive Project
* Restore Project
* Archive Task
* Remove Member
* Deactivate User
* Delete Comment

Example:

```text
Are you sure you want to archive this project?

Cancel | Archive
```

Routine changes such as changing Priority do not require confirmation.

---

# 65. Toast Feedback

Successful and failed operations should provide short Toast feedback.

Examples:

```text
Task created successfully.

Project archived.

Failed to update task.
```

---

# 66. Responsive Design

TaskFlow must use Responsive Web Design.

Supported layouts:

* Desktop
* Tablet
* Mobile

Desktop is the primary experience.

---

## Tablet

Examples:

* Dashboard cards may change from 4 columns to 2 columns.
* Sidebar may become compact.

---

## Mobile

Examples:

* Sidebar becomes a navigation Drawer.
* Cards stack vertically.
* Forms use full available width.
* Modals may become near-fullscreen.
* Tables may use horizontal scrolling or a compact layout.
* Two-column details pages become single-column.

The application does not need to behave like a native mobile application.

---

# 67. Reusable UI Components

The frontend should use reusable components.

Recommended examples:

```text
Button
Input
Textarea
Select
Badge
Card
Modal
Dialog
Table
Pagination
Toast
Skeleton
EmptyState
PageHeader
Sidebar
Topbar
```

The goal is consistent design and reduced duplicate UI code.

---

# 68. Iconography

Recommended icon library:

**Lucide React**

Icons should be consistent throughout the application.

Examples:

```text
Dashboard      LayoutDashboard
Projects       FolderKanban
Tasks          ListTodo
Users          Users
Notifications  Bell
Activity       History
```

Emojis should not be used as primary application icons.

---

# 69. UI Consistency Requirement

All application pages must use the same design system.

Codex or other implementation tools must not independently invent unrelated styles for individual pages.

Consistency must apply to:

* Typography
* Spacing
* Buttons
* Forms
* Cards
* Tables
* Badges
* Modals
* Colors
* Status indicators
* Error states
* Loading states

The system should visually appear as one cohesive product.

---

# 70. Non-Functional Requirements

## NFR01 – Security

The application must implement:

* Password Hashing
* JWT Authentication
* Refresh Token handling
* Role-Based Access Control
* Backend authorization
* Input validation
* Protection against unauthorized resource access

Sensitive values must not be exposed.

---

## NFR02 – Performance

Normal application operations should respond within reasonable time in portfolio deployment conditions.

The implementation should avoid:

* N+1 database queries
* Large unpaginated result sets
* Unnecessary queries
* Excessive repeated API calls

---

## NFR03 – Database Integrity

Database design must use:

* Primary Keys
* Foreign Keys
* Unique Constraints
* Transactions where appropriate

Invalid relationships between Users, Projects, and Tasks must be prevented.

---

## NFR04 – Error Handling

API errors must be consistent and understandable.

Example:

```json
{
  "detail": "Task not found"
}
```

The system must not expose:

* Stack traces
* Passwords
* Tokens
* Database credentials
* Internal secrets

---

## NFR05 – Maintainability

Backend should use clear modules such as:

```text
auth
users
projects
tasks
comments
notifications
activity
```

Frontend should similarly use clear separation between:

* Pages
* Components
* API services
* Hooks
* Authentication
* Utilities

---

## NFR06 – Testing

Automated backend tests must cover core business behavior.

---

# 71. Required Testing Scenarios

## Authentication

* Valid Login
* Invalid Login
* Disabled Account
* Invalid Token
* Expired Token
* Refresh Token
* Logout

---

## Authorization

* Member tries to create Project
* Member tries to manage Users
* User accesses unauthorized Project
* User accesses unauthorized Task
* Member attempts to approve Task

---

## Projects

* Create Project
* Invalid project dates
* Add Member
* Remove Member
* Member with active Tasks cannot be removed
* Archive Project
* Archived Project rejects edits
* Restore Project

---

## Tasks

* Create Task
* Create Unassigned Task
* Assign Task
* Reassign Task
* Reject invalid Assignee
* Reject Task Due Date outside Project date range
* Update Status
* Submit for review
* Approve Task
* Return Task
* Reopen Completed Task
* Archive Task
* Restore Task

---

## Comments

* Add Comment
* Edit own Comment
* Delete own Comment
* Unauthorized access
* Comments blocked on archived Projects

---

## Notifications

* Assignment notification
* Reassignment notification
* Review notification
* Approval notification
* Returned Task notification
* Comment notification
* User does not receive notification for own comment

---

## Dashboard

* Overdue calculation
* Due Soon calculation
* Project Progress calculation
* Archived Tasks excluded from Project Progress

---

# 72. Docker

Docker is not required during initial feature development.

Docker should be introduced after:

* Backend is stable
* Frontend is stable
* Database migrations work
* Core tests pass

Final Docker support may include:

```text
Frontend Container
Backend Container
PostgreSQL Container
```

using:

```text
Docker Compose
```

---

# 73. Deployment

Deployment is performed after application development is complete.

The chosen environment should support:

* React frontend
* FastAPI backend
* PostgreSQL database

The final project should preferably provide a publicly accessible demo for portfolio use.

---

# 74. Environment Configuration

Sensitive configuration must use environment variables.

Examples:

```text
DATABASE_URL
JWT_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS
ADMIN_NAME
ADMIN_EMAIL
ADMIN_PASSWORD
```

An example environment file may be included:

```text
.env.example
```

Actual secrets must not be committed to GitHub.

---

# 75. Development Phases

## Phase 1 – Project Setup

* Create Git repository
* Backend setup
* Frontend setup
* PostgreSQL setup
* Environment variables
* Base architecture
* Database migrations

---

## Phase 2 – Authentication and Users

* User Model
* Roles
* Initial Admin Seed
* Login
* Access Token
* Refresh Token
* Logout
* User Management
* Profile
* Password Change

---

## Phase 3 – Projects

* Project Model
* Project CRUD
* Project Dates
* Project Members
* Manager Membership
* Permissions
* Archive and Restore

---

## Phase 4 – Tasks

* Task Model
* Task CRUD
* Unassigned Tasks
* Assignment
* Reassignment
* Priority
* Status Workflow
* Review Workflow
* Due Dates
* Overdue
* Due Soon
* Archive and Restore

---

## Phase 5 – Collaboration

* Comments
* Notifications
* Activity Logs

---

## Phase 6 – Dashboard and Navigation

* Dashboard KPIs
* Project Progress
* Search
* Filters
* Sorting
* Pagination

---

## Phase 7 – UI/UX Completion

* Responsive layouts
* Loading states
* Skeletons
* Empty states
* Error states
* Confirmation dialogs
* Toast notifications
* Design consistency

---

## Phase 8 – Testing

* Authentication Tests
* Permission Tests
* Business Rule Tests
* API Tests
* Bug Fixing

---

## Phase 9 – Docker

* Backend Dockerfile
* Frontend Dockerfile
* PostgreSQL Service
* Docker Compose

---

## Phase 10 – Documentation and Portfolio Preparation

* README
* API Documentation
* Screenshots
* ERD
* Architecture Diagram
* Demo Setup
* GitHub Repository Cleanup

---

# 76. GitHub README Requirements

The final README must contain:

1. Project Title
2. Project Overview
3. Main Features
4. Screenshots
5. Technology Stack
6. System Architecture
7. Database ERD
8. User Roles
9. Installation Instructions
10. Environment Variables
11. Database Setup
12. Backend Startup Instructions
13. Frontend Startup Instructions
14. Docker Instructions
15. Testing Instructions
16. API Documentation
17. Demo Credentials
18. Project Structure
19. Future Improvements

**ERD** means Entity Relationship Diagram and should show the database entities and their relationships.

---

# 77. Recommended Screenshots

The final GitHub README should ideally include screenshots of:

* Login
* Dashboard
* Projects
* Project Details
* Tasks
* Task Details
* User Management
* Notifications

---

# 78. Project Deliverables

The completed TaskFlow repository should include:

* React Frontend
* FastAPI Backend
* PostgreSQL database integration
* SQLAlchemy models
* Alembic migrations
* JWT Authentication
* Refresh Tokens
* Role-Based Access Control
* User Management
* Project Management
* Task Management
* Review Workflow
* Comments
* Notifications
* Activity Logs
* Dashboard
* Search
* Filters
* Sorting
* Pagination
* Responsive UI
* Automated Backend Tests
* Docker configuration
* README
* API Documentation
* ERD
* Screenshots

---

# 79. Final Acceptance Criteria

TaskFlow Version 1 is complete when:

1. Initial Admin can be created securely.
2. Admin can manage user accounts.
3. Users can log in and log out.
4. Access and Refresh Tokens work correctly.
5. Disabled users cannot log in.
6. RBAC works correctly.
7. Project Managers can create projects.
8. Project date rules are enforced.
9. Project Managers are automatically project members.
10. Members can be added and removed correctly.
11. Projects can be archived and restored.
12. Archived projects are read-only.
13. Tasks can be created.
14. Tasks can remain Unassigned.
15. Tasks can be assigned and reassigned.
16. Task Due Date rules are enforced.
17. Member Task workflow works correctly.
18. Review workflow works correctly.
19. Members cannot approve their own work.
20. Completed Tasks can be reopened by authorized users.
21. Tasks can be archived and restored.
22. Overdue logic works correctly.
23. Due Soon logic works correctly.
24. Project Progress is calculated correctly.
25. Comments work correctly.
26. Notifications follow the defined recipient rules.
27. Activity Logs record important events.
28. Search respects permissions.
29. Filters work correctly.
30. Sorting works correctly.
31. Pagination works correctly.
32. Unauthorized API access is prevented.
33. Frontend hides unauthorized actions.
34. Loading states are implemented.
35. Empty states are implemented.
36. Error states are implemented.
37. Confirmation dialogs are implemented.
38. Toast feedback is implemented.
39. Desktop layout works correctly.
40. Tablet layout works correctly.
41. Mobile layout works correctly.
42. Core automated tests pass.
43. Frontend, backend, and database integrate successfully.
44. Docker configuration works.
45. README contains the required documentation.
46. The project can be installed on a new machine by following the documentation.
47. No known Critical defects remain.

---

# 80. Definition of Project Success

TaskFlow is successful when it is:

* Complete
* Functional
* Consistent
* Responsive
* Organized
* Secure at the required portfolio level
* Properly documented
* Tested
* Maintainable
* Understandable by another developer
* Suitable for technical interview demonstrations
* Suitable for a public GitHub portfolio
* Deployable as a working application

The objective is not to reproduce Jira, Asana, or another enterprise project management platform.

The objective is to build a realistic, technically solid, and complete full-stack project that demonstrates the capabilities expected from a recent university graduate.
