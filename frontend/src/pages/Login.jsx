import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Layers3,
  LockKeyhole,
} from "lucide-react";
import { useApp } from "../context";
import { Brand } from "../components/layout";
import { Button, Field } from "../components/ui";

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="login-page">
      <div className="login-main">
        <Brand />
        <div className="login-form">
          <div className="login-symbol">
            <Layers3 size={28} />
          </div>
          <span className="eyebrow">YOUR TEAM'S WORKSPACE</span>
          <h1>
            Good work starts
            <br />
            with a clear plan.
          </h1>
          <p>Sign in to pick up where you left off.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await login({ email, password });
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email address" required>
              <input
                required
                type="email"
                placeholder="you@company.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" required>
              <div className="password-input">
                <input
                  required
                  type={show ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button busy={busy}>
              Sign in <ArrowRight size={18} />
            </Button>
          </form>
          <p className="login-help">
            Need an account? Contact your workspace administrator.
          </p>
        </div>
        <div className="login-footer">
          <LockKeyhole size={14} />A secure space for your team's next big
          thing.
        </div>
      </div>
      <aside className="login-art">
        <div className="login-art-top">
          <span className="tiny-label">LESS FRICTION. MORE FLOW.</span>
          <span>01 — 04</span>
        </div>
        <h2>
          Bring your
          <br />
          work together.
        </h2>
        <p>
          From the first idea to the final review,
          <br />
          every step has a place.
        </p>
        <div
          className="flow-visual"
          aria-label="Task workflow: To Do, In Progress, In Review, Completed"
        >
          {["To Do", "In Progress", "In Review", "Completed"].map((s, i) => (
            <div className={`flow-step step-${i}`} key={s}>
              <span>{i === 3 ? <Check size={19} /> : `0${i + 1}`}</span>
              <strong>{s}</strong>
              <span className="flow-line" />
            </div>
          ))}
        </div>
        <div className="login-art-bottom">
          <span>One team. A shared direction.</span>
          <span>TaskFlow</span>
        </div>
      </aside>
    </div>
  );
}
