import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Edit3,
  KeyRound,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useApp, useDebounced, useResource } from "../context";
import { query } from "../api";
import { UserForm } from "../components/forms";
import {
  Avatar,
  Badge,
  Button,
  Confirm,
  Empty,
  ErrorState,
  Field,
  PageHeader,
  Pagination,
  Resource,
  SearchInput,
  timestamp,
} from "../components/ui";

export function Users() {
  const { user, mutate } = useApp();
  const [search, setSearch] = useState(""),
    [role, setRole] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState(null),
    [create, setCreate] = useState(false),
    [toggle, setToggle] = useState(null);
  const q = useDebounced(search);
  const resource = useResource(
    user.role === "Admin" ? `/users?${query({ q, role, active, page })}` : null,
  );
  if (user.role !== "Admin")
    return (
      <ErrorState
        error={{
          status: 403,
          message: "Only administrators can manage users.",
        }}
      />
    );
  return (
    <>
      <PageHeader
        title="People & access"
        description="Give your team the right access to do their best work."
      >
        <Button onClick={() => setCreate(true)}>
          <Plus size={17} />
          New user
        </Button>
      </PageHeader>
      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search people..."
        />
        <div className="filter-row">
          <select
            aria-label="User role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {["Admin", "Project Manager", "Member"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            aria-label="Account status"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All accounts</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div className="panel">
        <Resource resource={resource}>
          {(data) => (
            <>
              {data.items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email address</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <span className="person">
                              <Avatar user={p} />
                              {p.name}
                              {p.id === user.id && <small>(you)</small>}
                            </span>
                          </td>
                          <td>{p.email}</td>
                          <td>
                            <Badge value={p.role} />
                          </td>
                          <td>
                            <Badge
                              value={p.is_active ? "Active" : "Inactive"}
                            />
                          </td>
                          <td>{timestamp(p.created_at)}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="icon-btn"
                                aria-label={`Edit ${p.name}`}
                                onClick={() => setEdit(p)}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                className={`text-link ${p.is_active ? "danger-text" : ""}`}
                                onClick={() => setToggle(p)}
                              >
                                {p.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No people found"
                  text="Try another search or filter."
                />
              )}
              <Pagination data={data} page={page} onChange={setPage} />
            </>
          )}
        </Resource>
      </div>
      {(create || edit) && (
        <UserForm
          person={edit}
          onClose={() => {
            setEdit(null);
            setCreate(false);
          }}
        />
      )}
      {toggle && (
        <Confirm
          title={`${toggle.is_active ? "Deactivate" : "Activate"} account?`}
          text={
            toggle.is_active
              ? `${toggle.name} will be signed out and unable to log in. Their projects and tasks will remain stored.`
              : `${toggle.name} will be able to sign in again.`
          }
          danger={toggle.is_active}
          label={toggle.is_active ? "Deactivate account" : "Activate account"}
          onClose={() => setToggle(null)}
          onConfirm={() =>
            mutate(
              `/users/${toggle.id}`,
              "PUT",
              {
                name: toggle.name,
                email: toggle.email,
                role: toggle.role,
                is_active: !toggle.is_active,
              },
              "Account status updated.",
            )
          }
        />
      )}
    </>
  );
}

export function Notifications() {
  const { mutate } = useApp();
  const navigate = useNavigate();
  const [page, setPage] = useState(1),
    [unread, setUnread] = useState(false);
  const resource = useResource(`/notifications?${query({ page, unread })}`);
  return (
    <>
      <PageHeader
        title="Notifications"
        description="The updates that keep your work connected."
      >
        <Button
          variant="secondary"
          onClick={() =>
            mutate(
              "/notifications/read-all",
              "POST",
              undefined,
              "All notifications marked as read.",
            ).catch(() => {})
          }
        >
          <CheckCheck size={17} />
          Mark all as read
        </Button>
      </PageHeader>
      <div className="tabs">
        <button
          className={!unread ? "active" : ""}
          onClick={() => {
            setUnread(false);
            setPage(1);
          }}
        >
          All updates
        </button>
        <button
          className={unread ? "active" : ""}
          onClick={() => {
            setUnread(true);
            setPage(1);
          }}
        >
          Unread
        </button>
      </div>
      <div className="panel">
        <Resource resource={resource}>
          {(data) => (
            <>
              {data.items.length ? (
                <div className="notification-list">
                  {data.items.map((n) => (
                    <article key={n.id} className={!n.is_read ? "unread" : ""}>
                      <span className="notification-icon">
                        <Bell size={20} />
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await mutate(
                              `/notifications/${n.id}/read`,
                              "POST",
                              undefined,
                              "",
                            );
                            navigate(`/tasks/${n.related_entity_id}`);
                          } catch {}
                        }}
                      >
                        <strong>{n.message}</strong>
                        <small>{timestamp(n.created_at)}</small>
                      </button>
                      {!n.is_read && (
                        <button
                          className="icon-btn"
                          aria-label="Mark notification as read"
                          title="Mark as read"
                          onClick={() =>
                            mutate(
                              `/notifications/${n.id}/read`,
                              "POST",
                              undefined,
                              "Marked as read.",
                            ).catch(() => {})
                          }
                        >
                          <CheckCheck size={18} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="You're all caught up"
                  text="Task assignments, reviews, and comments will appear here."
                />
              )}
              <Pagination data={data} page={page} onChange={setPage} />
            </>
          )}
        </Resource>
      </div>
    </>
  );
}

export function ActivityPage() {
  const { user } = useApp();
  if (user.role === "Member")
    return (
      <ErrorState
        error={{
          status: 403,
          message:
            "Activity logs are available to administrators and project managers.",
        }}
      />
    );
  return (
    <>
      <PageHeader
        title="Activity log"
        description="A clear history of the work and the people behind it."
      />
      <ActivityList />
    </>
  );
}
export function ActivityList({ projectId }) {
  const [page, setPage] = useState(1);
  const resource = useResource(
    `/activity?${query({ project_id: projectId, page })}`,
  );
  return (
    <div className="panel">
      <Resource resource={resource}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="activity-list">
                {data.items.map((a) => (
                  <article key={a.id}>
                    <span className="activity-icon">
                      <Activity size={17} />
                    </span>
                    <div>
                      <p>{a.description}</p>
                      <small>{timestamp(a.created_at)}</small>
                    </div>
                    {a.entity_type === "task" && (
                      <Link
                        className="icon-btn"
                        to={`/tasks/${a.entity_id}`}
                        aria-label="View related task"
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="No activity yet"
                text="Important project and task changes will be recorded here."
              />
            )}
            <Pagination data={data} page={page} onChange={setPage} />
          </>
        )}
      </Resource>
    </div>
  );
}

export function Profile() {
  const { user, setUser, mutate, logout, notify } = useApp();
  const [name, setName] = useState(user.name),
    [email, setEmail] = useState(user.email),
    [busy, setBusy] = useState(false),
    [pwBusy, setPwBusy] = useState(false);
  const [pw, setPw] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  return (
    <>
      <PageHeader
        title="Profile & settings"
        description="Keep your details up to date and your account secure."
      />
      <div className="profile-grid">
        <section className="panel profile-card">
          <Avatar user={user} />
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <Badge value={user.role} />
          <div>
            <ShieldCheck size={17} />
            Active account
          </div>
        </section>
        <div>
          <section className="panel settings-card">
            <h2>
              <UserRound size={19} />
              Personal information
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const data = await mutate(
                    "/auth/me",
                    "PUT",
                    { name, email },
                    "Profile updated.",
                  );
                  setUser(data);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Full name" required>
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email address" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field
                label="Role"
                hint="Your role is managed by an administrator."
              >
                <input readOnly value={user.role} />
              </Field>
              <Button busy={busy}>Save changes</Button>
            </form>
          </section>
          <section className="panel settings-card">
            <h2>
              <KeyRound size={19} />
              Change password
            </h2>
            <p className="subtle">
              Changing your password signs you out on all devices.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (pw.new_password !== pw.confirm_password) {
                  notify("New password confirmation must match.", true);
                  return;
                }
                setPwBusy(true);
                try {
                  await mutate(
                    "/auth/password",
                    "POST",
                    pw,
                    "Password changed. Please sign in again.",
                  );
                  await logout();
                } catch {
                } finally {
                  setPwBusy(false);
                }
              }}
            >
              {[
                ["current_password", "Current password"],
                ["new_password", "New password"],
                ["confirm_password", "Confirm new password"],
              ].map(([key, label]) => (
                <Field label={label} required key={key}>
                  <input
                    type="password"
                    required
                    minLength={key === "current_password" ? 1 : 8}
                    maxLength={128}
                    autoComplete={
                      key === "current_password"
                        ? "current-password"
                        : "new-password"
                    }
                    value={pw[key]}
                    onChange={(e) =>
                      setPw((s) => ({ ...s, [key]: e.target.value }))
                    }
                  />
                </Field>
              ))}
              <Button variant="secondary" busy={pwBusy}>
                Update password
              </Button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
