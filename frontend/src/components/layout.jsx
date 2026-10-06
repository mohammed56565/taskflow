import React, { useEffect, useState } from "react";
import {
  NavLink,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Search,
  Settings2,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useApp, useResource } from "../context";
import { Avatar, timestamp } from "./ui";

export function Brand() {
  return (
    <Link to="/dashboard" className="brand">
      <span className="brand-mark">
        <Check size={23} strokeWidth={3} />
      </span>
      taskflow<span className="brand-period">.</span>
    </Link>
  );
}

export function Layout() {
  const { user, logout, mutate, notify } = useApp();
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  const [mobile, setMobile] = useState(false),
    [bell, setBell] = useState(false),
    [search, setSearch] = useState("");
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") {
        setMobile(false);
        setBell(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  const unread = useResource("/notifications?unread=true&page_size=5");
  const primary = [
    [LayoutDashboard, "Dashboard", "/dashboard"],
    [FolderKanban, "Projects", "/projects"],
    [ListTodo, "Tasks", "/tasks"],
  ];
  const admin = [
    ...(user.role === "Admin" ? [[Users, "Users", "/users"]] : []),
    ...(user.role !== "Member"
      ? [[Activity, "Activity log", "/activity"]]
      : []),
  ];
  const navItems = (items) =>
    items.map(([Icon, label, to]) => (
      <NavLink
        key={to}
        to={to}
        onClick={() => setMobile(false)}
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        <Icon size={19} />
        <span>{label}</span>
        {label === "Tasks" && <span className="nav-shortcut">T</span>}
      </NavLink>
    ));
  const current = location.pathname.split("/")[1] || "Dashboard";
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-btn mobile-only"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">TF</span>
          <div>
            <strong>Team workspace</strong>
            <small>TaskFlow workspace</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <p className="nav-label">WORKSPACE</p>
          {navItems(primary)}
          {admin.length > 0 && (
            <>
              <p className="nav-label nav-section">MANAGEMENT</p>
              {navItems(admin)}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <nav>
            {navItems([
              [Bell, "Notifications", "/notifications"],
              [Settings2, "Profile & settings", "/profile"],
            ])}
          </nav>
          <div className="sidebar-user">
            <Avatar user={user} />
            <Link to="/profile">
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </Link>
            <button
              className="icon-btn"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => logout().catch((e) => notify(e.message, true))}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-only"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>
              {current === "activity"
                ? "Activity log"
                : current.charAt(0).toUpperCase() + current.slice(1)}
            </strong>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/tasks?q=${encodeURIComponent(search)}`);
                setSearch("");
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search all tasks"
                placeholder="Search your workspace"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <div className="notification-anchor">
              <button
                className={`icon-btn bell ${bell ? "selected" : ""}`}
                aria-label={`Notifications${unread.data?.total ? `, ${unread.data.total} unread` : ""}`}
                aria-expanded={bell}
                onClick={() => setBell(!bell)}
              >
                <Bell size={20} />
                {unread.data?.total > 0 && <span />}
              </button>
              {bell && (
                <div className="notification-popover">
                  <header>
                    <strong>Notifications</strong>
                    <button
                      className="icon-btn"
                      aria-label="Close notifications"
                      onClick={() => setBell(false)}
                    >
                      <X size={16} />
                    </button>
                  </header>
                  {unread.data?.items.length ? (
                    unread.data.items.map((n) => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          try {
                            await mutate(
                              `/notifications/${n.id}/read`,
                              "POST",
                              undefined,
                              "",
                            );
                            navigate(`/tasks/${n.related_entity_id}`);
                            setBell(false);
                          } catch {}
                        }}
                      >
                        <span>{n.message}</span>
                        <small>{timestamp(n.created_at)}</small>
                      </button>
                    ))
                  ) : (
                    <p>You're all caught up.</p>
                  )}
                  <Link to="/notifications" onClick={() => setBell(false)}>
                    View all notifications <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <Link
              to="/profile"
              className="topbar-profile"
              aria-label="My profile"
            >
              <Avatar user={user} small />
              <ChevronDown size={15} />
            </Link>
          </div>
        </header>
        <main
          className="main-content"
          key={location.pathname + location.search}
        >
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>TaskFlow</span>
          <span>A little clarity. A lot of progress.</span>
        </footer>
      </div>
    </div>
  );
}
