import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  Clock3,
  FolderKanban,
  ListTodo,
  Plus,
} from "lucide-react";
import { useApp, useResource } from "../context";
import {
  Badge,
  Button,
  Empty,
  PageHeader,
  Progress,
  Resource,
  statuses,
  priorities,
  dateLabel,
} from "../components/ui";
import { TaskForm } from "../components/forms";
import { TaskTable } from "../components/TaskList";

export default function Dashboard() {
  const { user } = useApp();
  const resource = useResource("/dashboard");
  const [create, setCreate] = useState(false);
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <>
      <PageHeader
        eyebrow={date}
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Here's where your team's work stands today."
      >
        <Link to="/tasks?mine=true" className="btn secondary">
          <ListTodo size={17} />
          My tasks
        </Link>
        {user.role !== "Member" && (
          <Button onClick={() => setCreate(true)}>
            <Plus size={18} />
            New task
          </Button>
        )}
      </PageHeader>
      <Resource resource={resource}>
        {(data) => (
          <>
            <div className="kpi-grid">
              {[
                [
                  FolderKanban,
                  "Active projects",
                  data.active_projects,
                  "/projects?status=Active",
                  "blue",
                  "Moving work forward",
                ],
                [
                  ListTodo,
                  user.role === "Member" ? "My tasks" : "Total tasks",
                  data.total_tasks,
                  user.role === "Member" ? "/tasks?mine=true" : "/tasks",
                  "violet",
                  `${data.completed_tasks} completed`,
                ],
                [
                  Clock3,
                  "Due soon",
                  data.due_soon,
                  `/tasks?due=soon${user.role === "Member" ? "&mine=true" : ""}`,
                  "orange",
                  "Today and the next 3 days",
                ],
                [
                  CalendarDays,
                  "Overdue tasks",
                  data.overdue,
                  `/tasks?due=overdue${user.role === "Member" ? "&mine=true" : ""}`,
                  "red",
                  data.overdue
                    ? "Ready for your attention"
                    : "Everything is on track",
                ],
              ].map(([Icon, label, value, to, color, note]) => (
                <Link className={`kpi ${color}`} key={label} to={to}>
                  <div className="kpi-top">
                    <span>{label}</span>
                    <span className="kpi-icon">
                      <Icon size={20} />
                    </span>
                  </div>
                  <strong>{value.toString().padStart(2, "0")}</strong>
                  <div className="kpi-bottom">
                    <small>{note}</small>
                    <ArrowUpRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
            <div className="dashboard-charts">
              <section className="panel status-panel">
                <div className="panel-heading">
                  <h2>Task overview</h2>
                  <span className="subtle">By status</span>
                </div>
                <div className="status-chart">
                  <div
                    className="donut"
                    style={{
                      background: donut(data.by_status, data.total_tasks),
                    }}
                    role="img"
                    aria-label={statuses
                      .map((s) => `${s}: ${data.by_status[s] || 0}`)
                      .join(", ")}
                  >
                    <div>
                      <strong>{data.total_tasks}</strong>
                      <span>Total tasks</span>
                    </div>
                  </div>
                  <div className="chart-legend">
                    {statuses.map((s, i) => (
                      <Link
                        to={`/tasks?status=${encodeURIComponent(s)}${user.role === "Member" ? "&mine=true" : ""}`}
                        key={s}
                      >
                        <span className={`legend-dot status-${i}`} />
                        <span>{s}</span>
                        <strong>{data.by_status[s] || 0}</strong>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
              <section className="panel priority-panel">
                <div className="panel-heading">
                  <h2>Task priorities</h2>
                  <span className="subtle">Current workload</span>
                </div>
                <div className="priority-chart">
                  {[...priorities].reverse().map((p) => (
                    <div key={p}>
                      <span>{p}</span>
                      <div className={`priority-track ${p.toLowerCase()}`}>
                        <span
                          style={{
                            width: `${((data.by_priority[p] || 0) / Math.max(data.total_tasks, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{data.by_priority[p] || 0}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="panel recent-tasks">
              <div className="panel-heading">
                <div>
                  <h2>Recent tasks</h2>
                  <p>A quick look at what's been moving.</p>
                </div>
                <Link to="/tasks" className="text-link">
                  View all tasks <ArrowRight size={16} />
                </Link>
              </div>
              <TaskTable items={data.recent_tasks} compact />
            </section>
            <div className="section-heading">
              <div>
                <h2>Project progress</h2>
                <p>Small steps, shared momentum.</p>
              </div>
              <Link className="text-link" to="/projects">
                All projects <ArrowRight size={16} />
              </Link>
            </div>
            <div className="project-grid dashboard-projects">
              {data.projects.length ? (
                data.projects.map((p) => <ProjectCard project={p} key={p.id} />)
              ) : (
                <Empty
                  title="No projects yet"
                  text={
                    user.role === "Member"
                      ? "You haven't been added to a project yet."
                      : "Create a project to start organizing your team’s work."
                  }
                />
              )}
            </div>
            {user.role !== "Member" && (
              <div className="dashboard-bottom">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Tasks by team member</h2>
                  </div>
                  <div className="workload-list">
                    {data.by_member.length ? (
                      data.by_member.map((m, i) => (
                        <div key={m.user_id || "none"}>
                          <span className="workload-rank">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{m.name}</span>
                          <strong>{m.count} tasks</strong>
                        </div>
                      ))
                    ) : (
                      <p className="subtle">No tasks to display yet.</p>
                    )}
                  </div>
                </section>
                <Link to="/tasks?unassigned=true" className="unassigned-card">
                  <span className="eyebrow">READY FOR AN OWNER</span>
                  <strong>{data.unassigned_tasks}</strong>
                  <h3>Unassigned tasks</h3>
                  <p>Give each task a clear next step.</p>
                  <span className="text-link">
                    Review unassigned work <ArrowRight size={17} />
                  </span>
                </Link>
              </div>
            )}
          </>
        )}
      </Resource>
      {create && <TaskForm onClose={() => setCreate(false)} />}
    </>
  );
}

const colors = ["#dce2ef", "#4263eb", "#b48ae7", "#39ad87"];
function donut(values, total) {
  let stop = 0;
  if (!total) return "#edf0f6";
  return `conic-gradient(${statuses
    .map((s, i) => {
      const start = stop;
      stop += ((values[s] || 0) / total) * 100;
      return `${colors[i]} ${start}% ${stop}%`;
    })
    .join(",")})`;
}

export function ProjectCard({ project: p }) {
  return (
    <Link className="project-card" to={`/projects/${p.id}`}>
      <div className="project-card-top">
        <span className={`project-symbol color-${p.id % 5}`}>
          <FolderKanban size={23} />
        </span>
        <Badge value={p.status} />
      </div>
      <h3>{p.name}</h3>
      <p>{p.description || "No description added yet."}</p>
      <div className="progress-label">
        <span>Progress</span>
        <strong>{p.progress}%</strong>
      </div>
      <Progress value={p.progress} />
      <div className="project-card-bottom">
        <span>
          <CheckCheck size={15} />
          {p.completed_tasks}/{p.total_tasks} tasks
        </span>
        <span>
          <CalendarDays size={15} />
          {dateLabel(p.due_date)}
        </span>
      </div>
    </Link>
  );
}
