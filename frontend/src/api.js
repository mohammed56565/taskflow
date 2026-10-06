let token = null;
let pendingRefresh = null;
export const setToken = (value) => {
  token = value;
};

export async function refreshSession() {
  if (!pendingRefresh)
    pendingRefresh = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Your session has ended. Please sign in again.");
        const result = await response.json();
        token = result.access_token;
        return result;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  return pendingRefresh;
}

export async function api(path, options = {}, retry = true) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    try {
      await refreshSession();
    } catch (e) {
      token = null;
      window.dispatchEvent(new Event("session-expired"));
      throw e;
    }
    return api(path, options, false);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.errors
        ?.map(
          (x) =>
            `${x.field ? x.field.replaceAll("_", " ") + ": " : ""}${x.message}`,
        )
        .join(". ") ||
        data.detail ||
        "Something went wrong. Please try again.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function query(params) {
  const values = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined &&
        value !== false,
    ),
  );
  return new URLSearchParams(values).toString();
}
