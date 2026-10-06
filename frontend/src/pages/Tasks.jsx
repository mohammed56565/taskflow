import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Check,
  Edit3,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useApp, useResource } from "../context";
import { TaskList } from "../components/TaskList";
import { CommentForm, StatusForm, TaskForm } from "../components/forms";
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
  Resource,
  timestamp,
} from "../components/ui";

export function Tasks() {
  const { user } = useApp();
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Clear priorities. Focused work. One place for every next step."
      />
      <TaskList allowCreate={user.role !== "Member"} />
    </>
  );
}

export function TaskDetails() {
  const { id } = useParams();
  const resource = useResource(`/tasks/${id}`);
  return (
    <Resource resource={resource}>
      {(task) => <TaskContent task={task} />}
    </Resource>
  );
}

function TaskContent({ task }) {
  const { user, mutate } = useApp();
  const manage = canManage(user, task),
    readonly = task.archived_at || task.project_archived;
  const [edit, setEdit] = useState(false),
    [confirm, setConfirm] = useState(false),
    [next, setNext] = useState(null),
    [busy, setBusy] = useState(false);
  const transitions = {
    "To Do": ["In Progress"],
    "In Progress": ["To Do", "In Review"],
    "In Review": ["In Progress", ...(manage ? ["Completed"] : [])],
    Completed: manage ? ["In Progress"] : [],
  }[task.status];
  const labels = {
    "To Do": "Move to To Do",
    "In Progress":
      task.status === "Completed"
        ? "Reopen task"
        : task.status === "In Review"
          ? "Return for changes"
          : "Start task",
    "In Review": "Submit for review",
    Completed: "Approve task",
  };
  const change = async (status) => {
    if (
      task.status === "Completed" ||
      (task.status === "In Review" && status === "In Progress")
    ) {
      setNext(status);
      return;
    }
    setBusy(true);
    try {
      await mutate(
        `/tasks/${task.id}/status`,
        "POST",
        { status },
        "Task status updated.",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <BackLink to="/tasks">All tasks</BackLink>
      <PageHeader
        eyebrow={`TASK-${String(task.id).padStart(3, "0")}`}
        title={task.title}
      >
        <Badge value={task.status} />
        {manage && !readonly && (
          <Button variant="secondary" onClick={() => setEdit(true)}>
            <Edit3 size={16} />
            Edit task
          </Button>
        )}
        {manage && !task.project_archived && (
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            {task.archived_at ? <RotateCcw size={16} /> : <Archive size={16} />}
            {task.archived_at ? "Restore" : "Archive"}
          </Button>
        )}
      </PageHeader>
      {readonly && (
        <div className="notice">
          <Archive size={18} />
          {task.project_archived
            ? "The project is archived."
            : "This task is archived."}{" "}
          Changes are disabled until it is restored.
        </div>
      )}
      {!readonly &&
        (manage || task.assigned_to === user.id) &&
        transitions.length > 0 && (
          <div className="workflow-bar">
            <div>
              <span className="workflow-icon">
                <Check size={17} />
              </span>
              <span>
                {task.status === "In Review"
                  ? "Ready for a closer look"
                  : task.status === "Completed"
                    ? "This task has been approved"
                    : "Move this task forward"}
                <small>
                  {task.status === "In Review"
                    ? "Review the work or send it back with feedback."
                    : "Keep your team up to date with the next step."}
                </small>
              </span>
            </div>
            <div>
              {transitions.map((s) => (
                <Button
                  key={s}
                  variant={
                    s === "To Do" ||
                    (task.status === "In Review" && s === "In Progress")
                      ? "secondary"
                      : "primary"
                  }
                  disabled={busy}
                  onClick={() => change(s)}
                >
                  {labels[s]}
                  <ArrowRight size={16} />
                </Button>
              ))}
            </div>
          </div>
        )}
      <div className="detail-grid">
        <div>
          <section className="panel task-description">
            <h2>Description</h2>
            <p className="preserve-text">
              {task.description || "No description added."}
            </p>
          </section>
          <Comments task={task} readonly={readonly} />
        </div>
        <aside className="panel task-properties">
          <h2>Task details</h2>
          <dl>
            <dt>Status</dt>
            <dd>
              <Badge value={task.status} />
            </dd>
            <dt>Priority</dt>
            <dd>
              <Badge value={task.priority} />
            </dd>
            <dt>Assignee</dt>
            <dd>
              <span className="person">
                <Avatar user={task.assignee} small />
                {task.assignee?.name || "Unassigned"}
              </span>
              {task.assignee && !task.assignee.is_active && (
                <small className="danger-text">
                  Inactive account — reassignment needed
                </small>
              )}
            </dd>
            <dt>Project</dt>
            <dd>
              <Link className="text-link" to={`/projects/${task.project_id}`}>
                {task.project_name}
              </Link>
            </dd>
            <dt>Due date</dt>
            <dd className={task.overdue ? "danger-text" : ""}>
              {dateLabel(task.due_date, { year: "numeric" })}
              {task.overdue && " · Overdue"}
              {task.due_soon && " · Due soon"}
            </dd>
            <dt>Created by</dt>
            <dd>{task.creator.name}</dd>
            <dt>Created</dt>
            <dd>{timestamp(task.created_at)}</dd>
            <dt>Last updated</dt>
            <dd>{timestamp(task.updated_at)}</dd>
            {task.completed_at && (
              <>
                <dt>Completed</dt>
                <dd>{timestamp(task.completed_at)}</dd>
              </>
            )}
          </dl>
        </aside>
      </div>
      {edit && <TaskForm task={task} onClose={() => setEdit(false)} />}
      {next && (
        <StatusForm task={task} next={next} onClose={() => setNext(null)} />
      )}
      {confirm && (
        <Confirm
          title={`${task.archived_at ? "Restore" : "Archive"} task?`}
          text={
            task.archived_at
              ? "The task will become editable and count toward project progress again."
              : "This task will become read-only and be excluded from project progress."
          }
          label={task.archived_at ? "Restore task" : "Archive task"}
          onClose={() => setConfirm(false)}
          onConfirm={() =>
            mutate(
              `/tasks/${task.id}/${task.archived_at ? "restore" : "archive"}`,
              "POST",
              undefined,
              task.archived_at ? "Task restored." : "Task archived.",
            )
          }
        />
      )}
    </>
  );
}

function Comments({ task, readonly }) {
  const { user, mutate } = useApp();
  const [page, setPage] = useState(1),
    [content, setContent] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null);
  const resource = useResource(`/tasks/${task.id}/comments?page=${page}`);
  return (
    <section className="panel comments">
      <div className="panel-heading">
        <h2>
          Discussion{" "}
          <span className="count-badge">{resource.data?.total || 0}</span>
        </h2>
        <MessageSquare size={18} className="subtle" />
      </div>
      {!readonly && (
        <form
          className="comment-compose"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await mutate(
                `/tasks/${task.id}/comments`,
                "POST",
                { content },
                "Comment added.",
              );
              setContent("");
              setPage(1);
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          <Avatar user={user} />
          <div>
            <textarea
              aria-label="Add a comment"
              placeholder="Share an update or ask a question..."
              required
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div>
              <span>Keep the conversation moving.</span>
              <Button busy={busy} disabled={!content.trim()}>
                <Send size={15} />
                Post comment
              </Button>
            </div>
          </div>
        </form>
      )}
      <Resource resource={resource}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="comment-list">
                {data.items.map((c) => (
                  <article key={c.id}>
                    <Avatar user={c.user} />
                    <div className="comment-body">
                      <div className="comment-head">
                        <strong>{c.user.name}</strong>
                        <small>
                          {timestamp(c.created_at)}
                          {c.updated_at !== c.created_at && " · edited"}
                        </small>
                        {!readonly &&
                          (user.id === c.user_id || user.role === "Admin") && (
                            <span>
                              <button
                                aria-label={`Edit comment by ${c.user.name}`}
                                className="icon-btn"
                                onClick={() => setEdit(c)}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                aria-label={`Delete comment by ${c.user.name}`}
                                className="icon-btn"
                                onClick={() => setRemove(c)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </span>
                          )}
                      </div>
                      <p className="preserve-text">{c.content}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Start the conversation"
                text="Updates, questions, and feedback stay together here."
              />
            )}
            <Pagination data={data} page={page} onChange={setPage} />
          </>
        )}
      </Resource>
      {edit && <CommentForm comment={edit} onClose={() => setEdit(null)} />}
      {remove && (
        <Confirm
          title="Delete comment?"
          text="This comment will be permanently removed. The deletion will remain in the activity log."
          label="Delete comment"
          danger
          onClose={() => setRemove(null)}
          onConfirm={() =>
            mutate(
              `/comments/${remove.id}`,
              "DELETE",
              undefined,
              "Comment deleted.",
            )
          }
        />
      )}
    </section>
  );
}
