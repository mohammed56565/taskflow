import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppProvider, useApp } from "./context";
import { Layout } from "./components/layout";
import { ErrorState, Skeleton } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ProjectDetails, Projects } from "./pages/Projects";
import { Tasks, TaskDetails } from "./pages/Tasks";
import {
  ActivityPage,
  Notifications,
  Profile,
  Users,
} from "./pages/Supporting";
import "./styles.css";

function App() {
  const { user, initializing } = useApp();
  const location = useLocation();
  if (initializing)
    return (
      <div className="boot-screen">
        <span className="brand">taskflow.</span>
        <Skeleton />
      </div>
    );
  if (!user)
    return location.pathname === "/login" ? (
      <Login />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetails />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/:id" element={<TaskDetails />} />
        <Route path="users" element={<Users />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="*"
          element={
            <ErrorState
              error={{
                status: 404,
                message: "The page you’re looking for does not exist.",
              }}
            />
          }
        />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppProvider>
      <App />
    </AppProvider>
  </BrowserRouter>,
);
