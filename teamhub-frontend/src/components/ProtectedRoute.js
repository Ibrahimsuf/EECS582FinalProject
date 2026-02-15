import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthed } from "../lib/auth";

export default function ProtectedRoute({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}
