import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays, ListFilter, Plus } from "lucide-react";
import { useApp, useDebounced, useResource } from "../context";
import { query } from "../api";
import {
  Avatar,
  Badge,
  Button,
  dateLabel,
  Empty,
  Pagination,
  RemoteSelect,
  Resource,
  SearchInput,
  statuses,
  priorities,
} from "./ui";
import { TaskForm } from "./forms";

export function TaskTable({ items, compact = false }) {
  if (!items.length)
    return (
      <Empty
        title="No tasks found"
        text="Try a different search or filter, or create a task to get started."
      />
    );
  return (
    <div className="table-scroll">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task name</th>
            {!compact && <th>Project</th>}
            <th>Assignee</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due date</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>
                <Link className="task-title" to={`/tasks/${t.id}`}>
                  <span
                    className={`task-check ${t.status === "Completed" ? "done" : ""}`}
                  >
                    {t.status === "Completed" ? "✓" : ""}
                  </span>
                  <span>
                    {t.title}
                    {t.archived_at && <small>Archived</small>}
                  </span>
                </Link>
              </td>
              {!compact && (
                <td>
                  <Link className="muted-link" to={`/projects/${t.project_id}`}>
                    {t.project_name}
                  </Link>
                </td>
              )}
              <td>
                <span className="person">
                  <Avatar user={t.assignee} small />
                  <span>
                    {t.assignee ? t.assignee.name.split(" ")[0] : "Unassigned"}
                    {t.assignee && !t.assignee.is_active && (
                      <small className="danger-text">Inactive</small>
                    )}
                  </span>
                </span>
              </td>
              <td>
                <Badge value={t.priority} />
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td className={t.overdue ? "danger-text" : ""}>
                {dateLabel(t.due_date)}
                {t.overdue && <small className="due-note">Overdue</small>}
              </td>
              <td>
                <Link
                  className="icon-btn"
                  to={`/tasks/${t.id}`}
                  aria-label={`Open ${t.title}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TaskList({ project, allowCreate = false }) {
  const { user } = useApp();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(
      project ? "" : searchParams.get("q") || "",
    ),
    [page, setPage] = useState(1),
    [create, setCreate] = useState(false);
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    priority: "",
    due: searchParams.get("due") || "",
    sort: "created_at",
    direction: "desc",
    archived: "",
    mine: searchParams.get("mine") || "",
    unassigned: searchParams.get("unassigned") || "",
    project_id: project?.id || null,
    assigned_to: null,
    due_date: "",
  });
  const [advanced, setAdvanced] = useState(false);
  const debounced = useDebounced(search);
  const resource = useResource(
    `/tasks?${query({ ...filters, q: debounced, page })}`,
  );
  const set = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  return (
    <div className="task-list">
      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search tasks..."
        />
        <div className="toolbar-actions">
          <Button variant="secondary" onClick={() => setAdvanced(!advanced)}>
            <ListFilter size={16} />
            Filters
          </Button>
          {allowCreate && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={17} />
              New task
            </Button>
          )}
        </div>
      </div>
      <div className="filter-row">
        <select
          aria-label="Task status"
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Task priority"
          value={filters.priority}
          onChange={(e) => set("priority", e.target.value)}
        >
          <option value="">All priorities</option>
          {priorities.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Due date filter"
          value={filters.due}
          onChange={(e) => set("due", e.target.value)}
        >
          <option value="">Any due date</option>
          <option value="soon">Due soon</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          aria-label="Task ownership"
          value={filters.mine ? "mine" : filters.unassigned ? "unassigned" : ""}
          onChange={(e) => {
            set("mine", e.target.value === "mine" ? "true" : "");
            set("unassigned", e.target.value === "unassigned" ? "true" : "");
          }}
        >
          <option value="">All assignees</option>
          <option value="mine">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select
          aria-label="Task sorting"
          value={`${filters.sort}:${filters.direction}`}
          onChange={(e) => {
            const [sort, direction] = e.target.value.split(":");
            set("sort", sort);
            set("direction", direction);
          }}
        >
          <option value="created_at:desc">Newest first</option>
          <option value="updated_at:desc">Recently updated</option>
          <option value="due_date:asc">Due date</option>
          <option value="priority:desc">Highest priority</option>
          <option value="name:asc">Name A–Z</option>
        </select>
        <select
          aria-label="Task archive filter"
          value={filters.archived}
          onChange={(e) => set("archived", e.target.value)}
        >
          <option value="">Active tasks</option>
          <option value="true">Archived tasks</option>
        </select>
      </div>
      {advanced && (
        <div className="advanced-filters">
          {!project && (
            <RemoteSelect
              label="Project filter"
              emptyLabel="All projects"
              path="/projects"
              value={filters.project_id}
              onChange={(id) => {
                set("project_id", id);
                set("assigned_to", null);
              }}
            />
          )}
          {filters.project_id && (
            <RemoteSelect
              label="Assignee filter"
              emptyLabel="All assignees"
              path={`/projects/${filters.project_id}/members`}
              value={filters.assigned_to}
              onChange={(id) => set("assigned_to", id)}
            />
          )}
          <label className="field">
            <span>Exact due date</span>
            <input
              type="date"
              value={filters.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="panel">
        <Resource resource={resource}>
          {(data) => (
            <>
              <TaskTable items={data.items} compact={!!project} />
              <Pagination data={data} page={page} onChange={setPage} />
            </>
          )}
        </Resource>
      </div>
      {create && (
        <TaskForm project={project} onClose={() => setCreate(false)} />
      )}
    </div>
  );
}
