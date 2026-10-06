import React, { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Search,
  X,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDebounced, useResource } from "../context";
import { query } from "../api";

export const statuses = ["To Do", "In Progress", "In Review", "Completed"];
export const priorities = ["Low", "Medium", "High", "Urgent"];
export const slug = (value) => String(value).toLowerCase().replaceAll(" ", "-");
export const canManage = (user, project) =>
  user.role === "Admin" ||
  (user.role === "Project Manager" && user.id === project.manager_id);
export function dateLabel(value, options = {}) {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...options,
      })
    : "No due date";
}
export function timestamp(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
export function Avatar({ user, small = false }) {
  return (
    <span
      title={user?.name || "Unassigned"}
      className={`avatar ${small ? "small" : ""} color-${(user?.id || 0) % 5}`}
    >
      {user?.name
        ?.split(" ")
        .filter(Boolean)
        .map((x) => x[0])
        .slice(0, 2)
        .join("") || "—"}
    </span>
  );
}
export function Badge({ value }) {
  return <span className={`badge ${slug(value)}`}>{value}</span>;
}
export function Button({
  children,
  variant = "primary",
  className = "",
  busy = false,
  ...props
}) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      {...props}
      disabled={props.disabled || busy}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
export function BackLink({ to, children }) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft size={15} />
      {children}
    </Link>
  );
}
export function Progress({ value }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Project progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "New items will appear here.",
  children,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FolderOpen size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-wrap" aria-label="Loading" aria-busy="true">
      {[1, 2, 3].map((n) => (
        <div className="skeleton" key={n} />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error-state" role="alert">
      <CircleAlert size={28} />
      <h2>
        {error.status === 403
          ? "Access denied"
          : error.status === 404
            ? "Not found"
            : "Unable to load this page"}
      </h2>
      <p>{error.message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}
export function Resource({ resource, children }) {
  return resource.loading ? (
    <Skeleton />
  ) : resource.error ? (
    <ErrorState error={resource.error} retry={resource.retry} />
  ) : resource.data ? (
    children(resource.data)
  ) : null;
}
export function Pagination({ data, page, onChange }) {
  if (!data?.total) return null;
  const pages = Math.ceil(data.total / data.page_size);
  return (
    <div className="pagination">
      <span>
        {(page - 1) * data.page_size + 1}–
        {Math.min(page * data.page_size, data.total)} of {data.total}
      </span>
      <div>
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  ...props
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  );
}
export function Field({ label, required, children, hint }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b aria-label="required"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef(null),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Confirm({
  title,
  text,
  label = "Confirm",
  onConfirm,
  onClose,
  danger = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <p className="confirm-text">{text}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {label}
        </Button>
      </footer>
    </Modal>
  );
}

export function RemoteSelect({
  path,
  value,
  onChange,
  label,
  required = false,
  initialLabel = "",
  emptyLabel = "Select an option",
  optionFilter = () => true,
}) {
  const labelId = useId();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [open, setOpen] = useState(false),
    [chosen, setChosen] = useState(initialLabel);
  const text = useDebounced(search);
  const resource = useResource(
    open && path
      ? `${path}${path.includes("?") ? "&" : "?"}${query({ q: text, page, page_size: 20 })}`
      : null,
  );
  const container = useRef(null);
  useEffect(() => {
    setChosen(initialLabel);
  }, [initialLabel]);
  useEffect(() => {
    const close = (e) => {
      if (!container.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div className="field remote-select" ref={container}>
      <span id={labelId}>
        {label}
        {required && <b> *</b>}
      </span>
      <button
        type="button"
        className="select-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {value ? chosen || `Selected #${value}` : emptyLabel}
        <ChevronRight size={15} />
      </button>
      {open && (
        <div className="select-popover">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={`Search ${label.toLowerCase()}...`}
            autoFocus
          />
          {!required && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setChosen("");
                setOpen(false);
              }}
            >
              {emptyLabel}
            </button>
          )}
          {resource.loading ? (
            <p>Loading options...</p>
          ) : resource.error ? (
            <p role="alert">{resource.error.message}</p>
          ) : (
            <>
              {resource.data?.items.filter(optionFilter).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onChange(item.id);
                    setChosen(item.name);
                    setOpen(false);
                  }}
                >
                  {item.name}
                  <small>{item.email || item.status}</small>
                </button>
              ))}
              {resource.data?.items.length === 0 && <p>No matches found.</p>}
              <Pagination data={resource.data} page={page} onChange={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
