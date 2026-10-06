import React, { useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  Edit3,
  FolderKanban,
  Plus,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { useApp, useDebounced, useResource } from "../context";
import { query } from "../api";
import { AddMemberForm, ProjectForm } from "../components/forms";
import {
  Avatar,
  BackLink,
  Badge,
  Button,
  canManage,
  Confirm,
  dateLabel,
  Empty,
  PageHeader,
  Pagination,
  Progress,
  RemoteSelect,
  Resource,
  SearchInput,
} from "../components/ui";
import { ProjectCard } from "./Dashboard";
import { TaskList } from "../components/TaskList";
import { ActivityList } from "./Supporting";

export function Projects() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(params.get("status") || ""),
    [archived, setArchived] = useState(""),
    [sort, setSort] = useState("created_at"),
    [manager, setManager] = useState(null),
    [page, setPage] = useState(1),
    [create, setCreate] = useState(false);
  const q = useDebounced(search);
  const resource = useResource(
    `/projects?${query({ q, status, archived, sort, direction: sort === "created_at" ? "desc" : "asc", manager_id: manager, page, page_size: 12 })}`,
  );
  return (
    <>
      <PageHeader
        title="Projects"
        description="A shared view of what you're building together."
      >
        {user.role !== "Member" && (
          <Button onClick={() => setCreate(true)}>
            <Plus size={18} />
            New project
          </Button>
        )}
      </PageHeader>
      <div className="toolbar project-toolbar">
        <SearchInput
          placeholder="Search projects..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <div className="filter-row">
          <select
            aria-label="Project status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["Planning", "Active", "Completed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Project visibility"
            value={archived}
            onChange={(e) => {
              setArchived(e.target.value);
              setStatus("");
              setPage(1);
            }}
          >
            <option value="">Active records</option>
            <option value="true">Archived</option>
          </select>
          <select
            aria-label="Project sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="created_at">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="start_date">Start date</option>
            <option value="due_date">Due date</option>
          </select>
        </div>
      </div>
      {user.role !== "Member" && (
        <div className="manager-filter">
          <RemoteSelect
            path="/users/directory"
            label="Project manager filter"
            emptyLabel="All project managers"
            optionFilter={(u) => u.role !== "Member"}
            value={manager}
            onChange={(id) => {
              setManager(id);
              setPage(1);
            }}
          />
        </div>
      )}
      <Resource resource={resource}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="project-grid">
                {data.items.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <div className="panel">
                <Empty
                  title="No projects found"
                  text={
                    user.role === "Member"
                      ? "Your projects will appear here when a manager adds you."
                      : "Try another filter, or start a new project."
                  }
                />
              </div>
            )}
            <Pagination data={data} page={page} onChange={setPage} />
          </>
        )}
      </Resource>
      {create && (
        <ProjectForm
          onClose={() => setCreate(false)}
          onCreated={(p) => navigate(`/projects/${p.id}`)}
        />
      )}
    </>
  );
}

export function ProjectDetails() {
  const { id } = useParams();
  const resource = useResource(`/projects/${id}`);
  return (
    <Resource resource={resource}>
      {(project) => <ProjectContent project={project} />}
    </Resource>
  );
}

function ProjectContent({ project }) {
  const { user, mutate } = useApp();
  const manage = canManage(user, project),
    writable = manage && !project.archived_at;
  const [tab, setTab] = useState("Overview"),
    [edit, setEdit] = useState(false),
    [confirm, setConfirm] = useState(false);
  return (
    <>
      <BackLink to="/projects">All projects</BackLink>
      <PageHeader title={project.name} description={project.description}>
        <Badge value={project.status} />
        {writable && (
          <Button variant="secondary" onClick={() => setEdit(true)}>
            <Edit3 size={16} />
            Edit project
          </Button>
        )}
        {manage && (
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            {project.archived_at ? (
              <RotateCcw size={16} />
            ) : (
              <Archive size={16} />
            )}
            {project.archived_at ? "Restore" : "Archive"}
          </Button>
        )}
      </PageHeader>
      {project.archived_at && (
        <div className="notice">
          <Archive size={18} />
          This project is archived. Restore it to make changes.
        </div>
      )}
      <div className="project-meta">
        <span>
          <Avatar user={project.manager} small />
          <span>
            <small>Project manager</small>
            {project.manager.name}
            {!project.manager.is_active && " (inactive)"}
          </span>
        </span>
        <span>
          <CalendarDays size={19} />
          <span>
            <small>Timeline</small>
            {dateLabel(project.start_date)} –{" "}
            {dateLabel(project.due_date, { year: "numeric" })}
          </span>
        </span>
        <span>
          <CheckCheck size={19} />
          <span>
            <small>Completed tasks</small>
            {project.completed_tasks} of {project.total_tasks}
          </span>
        </span>
        <div className="meta-progress">
          <div className="progress-label">
            <span>Project progress</span>
            <strong>{project.progress}%</strong>
          </div>
          <Progress value={project.progress} />
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Project sections">
        {["Overview", "Tasks", "Members", ...(manage ? ["Activity"] : [])].map(
          (t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <div role="tabpanel">
        {tab === "Overview" && (
          <ProjectOverview project={project} onTasks={() => setTab("Tasks")} />
        )}
        {tab === "Tasks" && (
          <TaskList project={project} allowCreate={writable} />
        )}
        {tab === "Members" && (
          <MemberList project={project} writable={writable} />
        )}
        {tab === "Activity" && <ActivityList projectId={project.id} />}
      </div>
      {edit && <ProjectForm project={project} onClose={() => setEdit(false)} />}
      {confirm && (
        <Confirm
          title={`${project.archived_at ? "Restore" : "Archive"} project?`}
          text={
            project.archived_at
              ? "The project will return to its previous status and become editable."
              : "The project, its tasks, and comments will become read-only. All records will be preserved."
          }
          label={project.archived_at ? "Restore project" : "Archive project"}
          onClose={() => setConfirm(false)}
          onConfirm={() =>
            mutate(
              `/projects/${project.id}/${project.archived_at ? "restore" : "archive"}`,
              "POST",
              undefined,
              project.archived_at ? "Project restored." : "Project archived.",
            )
          }
        />
      )}
    </>
  );
}

function ProjectOverview({ project, onTasks }) {
  const resource = useResource(
    `/tasks?project_id=${project.id}&due=overdue&page_size=1`,
  );
  const members = useResource(`/projects/${project.id}/members?page_size=5`);
  return (
    <div className="project-overview">
      <section className="panel">
        <div className="panel-heading">
          <h2>At a glance</h2>
          <button className="text-link" onClick={onTasks}>
            View tasks <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="overview-metrics">
          <div>
            <strong>{project.total_tasks}</strong>
            <span>Total tasks</span>
          </div>
          <div>
            <strong>{project.completed_tasks}</strong>
            <span>Completed</span>
          </div>
          <div>
            <strong>{resource.data?.total ?? "—"}</strong>
            <span>Overdue</span>
          </div>
        </div>
        <div className="overview-description">
          <h3>About this project</h3>
          <p className="preserve-text">
            {project.description || "No description has been added."}
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Project team</h2>
          <span className="subtle">{members.data?.total || 0} members</span>
        </div>
        <Resource resource={members}>
          {(data) => (
            <div className="team-list">
              {data.items.map((person) => (
                <div key={person.id}>
                  <Avatar user={person} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>
                      {person.id === project.manager_id
                        ? "Project manager"
                        : person.role}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Resource>
      </section>
    </div>
  );
}

function MemberList({ project, writable }) {
  const { mutate } = useApp();
  const [page, setPage] = useState(1),
    [add, setAdd] = useState(false),
    [remove, setRemove] = useState(null);
  const resource = useResource(`/projects/${project.id}/members?page=${page}`);
  return (
    <>
      <div className="section-heading">
        <h2>Project members</h2>
        {writable && (
          <Button onClick={() => setAdd(true)}>
            <UserPlus size={17} />
            Add member
          </Button>
        )}
      </div>
      <div className="panel">
        <Resource resource={resource}>
          {(data) => (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      {writable && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <span className="person">
                            <Avatar user={m} small />
                            {m.name}
                          </span>
                        </td>
                        <td>{m.email}</td>
                        <td>
                          {m.id === project.manager_id
                            ? "Project manager"
                            : "Member"}
                        </td>
                        <td>
                          <Badge value={m.is_active ? "Active" : "Inactive"} />
                        </td>
                        {writable && (
                          <td>
                            {m.id !== project.manager_id && (
                              <button
                                className="text-link danger-text"
                                onClick={() => setRemove(m)}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination data={data} page={page} onChange={setPage} />
            </>
          )}
        </Resource>
      </div>
      {add && <AddMemberForm project={project} onClose={() => setAdd(false)} />}
      {remove && (
        <Confirm
          title="Remove member?"
          text={`${remove.name} will lose access to this project. Their unfinished tasks must be reassigned first.`}
          danger
          label="Remove member"
          onClose={() => setRemove(null)}
          onConfirm={() =>
            mutate(
              `/projects/${project.id}/members/${remove.id}`,
              "DELETE",
              undefined,
              "Member removed.",
            )
          }
        />
      )}
    </>
  );
}
