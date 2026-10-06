import React, { createContext, useContext, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { api, refreshSession, setToken } from "./api";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null),
    [initializing, setInitializing] = useState(true);
  const [version, setVersion] = useState(0),
    [toast, setToast] = useState(null);
  useEffect(() => {
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setInitializing(false));
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const notify = (message, error = false) => setToast({ message, error });
  const mutate = async (
    path,
    method = "POST",
    body,
    message = "Changes saved.",
  ) => {
    try {
      const result = await api(path, { method, body });
      setVersion((v) => v + 1);
      if (message) notify(message);
      return result;
    } catch (error) {
      notify(error.message, true);
      throw error;
    }
  };
  const login = async (values) => {
    const data = await api("/auth/login", { method: "POST", body: values });
    setToken(data.access_token);
    setUser(data.user);
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setToken(null);
    setUser(null);
  };
  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        initializing,
        version,
        notify,
        mutate,
        login,
        logout,
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useResource(path, extra = 0) {
  const { version } = useApp();
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, [path, version, retry, extra]);
  return { ...state, retry: () => setRetry((v) => v + 1) };
}

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
