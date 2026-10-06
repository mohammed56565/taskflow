import React, { useState } from "react";
import { useApp, useResource } from "../context";
import { Button, Field, Modal, RemoteSelect, priorities } from "./ui";

function FormShell({ title, onClose, onSubmit, submitLabel, children }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSubmit();
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-fields">
          {children}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            {submitLabel || "Save changes"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function ProjectForm({ project, onClose, onCreated }) {
  const { user, mutate } = useApp();
  const [form, setForm] = useState(
    project
      ? {
          name: project.name,
          description: project.description,
          manager_id: project.manager_id,
          start_date: project.start_date,
          due_date: project.due_date,
          status: project.status,
        }
      : {
          name: "",
          description: "",
          manager_id: user.id,
          start_date: "",
          due_date: "",
          status: "Planning",
        },
  );
  const set = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  return (
    <FormShell
      title={project ? "Edit project" : "Create a project"}
      onClose={onClose}
      submitLabel={project ? "Save changes" : "Create project"}
      onSubmit={async () => {
        const result = await mutate(
          project ? `/projects/${project.id}` : "/projects",
          project ? "PUT" : "POST",
          form,
          project ? "Project updated." : "Project created.",
        );
        onCreated?.(result);
      }}
    >
      <Field label="Project name" required>
        <input
          autoFocus
          required
          maxLength={150}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Website redesign"
        />
      </Field>
      <Field label="Description">
        <textarea
          rows={3}
          maxLength={5000}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What will this project achieve?"
        />
      </Field>
      {(user.role === "Admin" || project) && (
        <RemoteSelect
          label="Project manager"
          path="/users/directory"
          optionFilter={(u) => u.role !== "Member"}
          required
          value={form.manager_id}
          initialLabel={project?.manager.name || user.name}
          onChange={(id) => set("manager_id", id)}
        />
      )}
      <div className="form-grid">
        <Field label="Start date" required>
          <input
            required
            type="date"
            value={form.start_date}
            max={form.due_date || undefined}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </Field>
        <Field label="Due date" required>
          <input
            required
            type="date"
            value={form.due_date}
            min={form.start_date || undefined}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {["Planning", "Active", "Completed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
    </FormShell>
  );
}

export function TaskForm({ task, project, onClose, onCreated }) {
  const { user, mutate } = useApp();
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    project_id: task?.project_id || project?.id || null,
    assigned_to: task?.assigned_to || null,
    priority: task?.priority || "Medium",
    due_date: task?.due_date || "",
  });
  const selectedProject = useResource(
    form.project_id ? `/projects/${form.project_id}` : null,
  );
  const set = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  return (
    <FormShell
      title={task ? "Edit task" : "Create a task"}
      onClose={onClose}
      submitLabel={task ? "Save changes" : "Create task"}
      onSubmit={async () => {
        if (!form.project_id) throw new Error("Please select a project.");
        const body = { ...form, due_date: form.due_date || null };
        if (task) delete body.project_id;
        const result = await mutate(
          task ? `/tasks/${task.id}` : "/tasks",
          task ? "PUT" : "POST",
          body,
          task ? "Task updated." : "Task created.",
        );
        onCreated?.(result);
      }}
    >
      <Field label="Task title" required>
        <input
          required
          autoFocus
          maxLength={200}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="What needs to be done?"
        />
      </Field>
      <Field label="Description">
        <textarea
          maxLength={5000}
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Add context, requirements, or acceptance criteria"
        />
      </Field>
      {!task && !project && (
        <RemoteSelect
          required
          label="Project"
          path={`/projects?${user.role === "Project Manager" ? `manager_id=${user.id}` : ""}`}
          value={form.project_id}
          onChange={(id) => {
            set("project_id", id);
            set("assigned_to", null);
          }}
        />
      )}
      {form.project_id && (
        <RemoteSelect
          key={form.project_id}
          label="Assignee"
          path={`/projects/${form.project_id}/members`}
          optionFilter={(u) => u.is_active}
          emptyLabel="Unassigned"
          value={form.assigned_to}
          initialLabel={task?.assignee?.name || ""}
          onChange={(id) => set("assigned_to", id)}
        />
      )}
      <div className="form-grid">
        <Field label="Priority">
          <select
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            {priorities.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Due date" hint="Optional; within the project dates.">
          <input
            type="date"
            min={selectedProject.data?.start_date}
            max={selectedProject.data?.due_date}
            value={form.due_date}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </Field>
      </div>
    </FormShell>
  );
}

export function UserForm({ person, onClose }) {
  const { mutate } = useApp();
  const [form, setForm] = useState(
    person
      ? {
          name: person.name,
          email: person.email,
          role: person.role,
          is_active: person.is_active,
        }
      : { name: "", email: "", password: "", role: "Member", is_active: true },
  );
  const set = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  return (
    <FormShell
      title={person ? "Edit account" : "Create an account"}
      onClose={onClose}
      submitLabel={person ? "Save changes" : "Create account"}
      onSubmit={() =>
        mutate(
          person ? `/users/${person.id}` : "/users",
          person ? "PUT" : "POST",
          form,
          person ? "Account updated." : "Account created.",
        )
      }
    >
      <Field label="Full name" required>
        <input
          required
          autoFocus
          maxLength={100}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          autoComplete="name"
        />
      </Field>
      <Field label="Email address" required>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          autoComplete="email"
        />
      </Field>
      {!person && (
        <Field
          label="Initial password"
          required
          hint="At least 8 characters. Share it securely with the user."
        >
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
          />
        </Field>
      )}
      <Field label="Role">
        <select value={form.role} onChange={(e) => set("role", e.target.value)}>
          {["Member", "Project Manager", "Admin"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
    </FormShell>
  );
}

export function AddMemberForm({ project, onClose }) {
  const { mutate } = useApp();
  const [uid, setUid] = useState(null);
  return (
    <FormShell
      title="Add a project member"
      onClose={onClose}
      submitLabel="Add member"
      onSubmit={() => {
        if (!uid) throw new Error("Select a user.");
        return mutate(
          `/projects/${project.id}/members`,
          "POST",
          { user_id: uid },
          "Member added.",
        );
      }}
    >
      <RemoteSelect
        label="Team member"
        required
        path="/users/directory"
        value={uid}
        onChange={setUid}
      />
    </FormShell>
  );
}

export function StatusForm({ task, next, onClose }) {
  const { mutate } = useApp();
  const [reason, setReason] = useState("");
  return (
    <FormShell
      title={
        task.status === "Completed"
          ? "Reopen task"
          : "Return for additional work"
      }
      onClose={onClose}
      submitLabel="Update task"
      onSubmit={() =>
        mutate(
          `/tasks/${task.id}/status`,
          "POST",
          { status: next, reason },
          "Task status updated.",
        )
      }
    >
      <Field label="Reason" required={task.status === "Completed"}>
        <textarea
          required={task.status === "Completed"}
          autoFocus
          maxLength={2000}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what needs to change"
        />
      </Field>
    </FormShell>
  );
}

export function CommentForm({ comment, onClose }) {
  const { mutate } = useApp();
  const [content, setContent] = useState(comment.content);
  return (
    <FormShell
      title="Edit comment"
      onClose={onClose}
      onSubmit={() =>
        mutate(
          `/comments/${comment.id}`,
          "PUT",
          { content },
          "Comment updated.",
        )
      }
    >
      <Field label="Comment" required>
        <textarea
          required
          autoFocus
          maxLength={2000}
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>
    </FormShell>
  );
}
