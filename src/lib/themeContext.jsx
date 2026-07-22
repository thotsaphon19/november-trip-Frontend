import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "./api";

const ThemeContext = createContext(null);

// Pick a readable hover shade a bit darker than whatever primary color the
// admin chose, and a very light tint for subtle backgrounds/badges.
function deriveShades(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const darken = (v) => Math.max(0, Math.round(v * 0.82));
  const hover = `#${[darken(r), darken(g), darken(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  const light = `rgba(${r}, ${g}, ${b}, 0.08)`;
  const soft = `rgba(${r}, ${g}, ${b}, 0.16)`;
  return { hover, light, soft };
}

function applyTheme(settings) {
  if (!settings) return;
  const root = document.documentElement;
  if (settings.primaryColor) {
    const { hover, light, soft } = deriveShades(settings.primaryColor);
    root.style.setProperty("--nt-primary", settings.primaryColor);
    root.style.setProperty("--nt-primary-hover", hover);
    root.style.setProperty("--nt-primary-light", light);
    root.style.setProperty("--nt-primary-soft", soft);
  }
  if (settings.fontFamily) {
    root.style.setProperty("--nt-font", `"${settings.fontFamily}", "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif`);
  }
  if (settings.companyName) {
    document.title = settings.companyName;
  }
}

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/settings/appearance");
      setSettings(data);
      applyTheme(data);
    } catch {
      /* backend unreachable - keep CSS defaults from index.css */
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <ThemeContext.Provider value={{ settings, reload, applyTheme: (s) => applyTheme(s) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
