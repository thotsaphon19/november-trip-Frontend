import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("nt_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const loadMe = useCallback(async (t) => {
    try {
      const { data } = await api.get("/auth/me", { headers: { Authorization: `Bearer ${t}` } });
      setUser(data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("nt_token");
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (token) {
        await loadMe(token);
      } else {
        try {
          const { data } = await api.get("/auth/needs-bootstrap");
          setNeedsBootstrap(data.needsBootstrap);
        } catch {
          /* backend may be unreachable; the Dashboard already surfaces this */
        }
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("nt_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function bootstrap(email, password, name) {
    const { data } = await api.post("/auth/bootstrap", { email, password, name });
    localStorage.setItem("nt_token", data.token);
    setToken(data.token);
    setUser(data.user);
    setNeedsBootstrap(false);
  }

  function logout() {
    localStorage.removeItem("nt_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, needsBootstrap, login, bootstrap, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
