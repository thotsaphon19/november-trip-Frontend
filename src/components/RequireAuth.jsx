import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authContext";

export default function RequireAuth({ children }) {
  const { token, loading, needsBootstrap } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
