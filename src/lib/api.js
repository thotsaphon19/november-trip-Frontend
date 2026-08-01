import axios from "axios";

// Same-origin by default (works for local dev via the Vite proxy, and for
// Docker where nginx proxies /api to the backend container). Set
// VITE_API_BASE_URL when the frontend and backend are separate domains -
// e.g. two separate Vercel projects - to point at the backend's full URL:
// VITE_API_BASE_URL=https://your-backend.vercel.app/api
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nt_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("nt_token");
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
    }
    const message = err.response?.data?.error || err.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default api;
