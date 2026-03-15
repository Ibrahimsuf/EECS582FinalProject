import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { GroupProvider } from "./lib/GroupContext";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import Logs from "./pages/Logs";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import Disputes from "./pages/Disputes";
import Sprints from "./pages/Sprints";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected with app layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <GroupProvider>
                <Layout />
              </GroupProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="groups" element={<Groups />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:id" element={<TaskDetails />} />
          <Route path="logs" element={<Logs />} />
          <Route path="audit" element={<Audit />} />
          <Route path="sprints" element={<Sprints />} />
          <Route path="settings" element={<Settings />} />
          <Route path="disputes" element={<Disputes />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
