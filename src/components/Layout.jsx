import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  FileText,
  Building2,
  Ticket,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { useTheme } from "../lib/themeContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Product", icon: Compass },
  { to: "/quotations", label: "Quotation", icon: FileText },
  { to: "/suppliers/hotels", label: "Supplier: Hotels", icon: Building2 },
  { to: "/suppliers/tours", label: "Supplier: Tour", icon: Ticket },
  { to: "/reports", label: "Report", icon: BarChart3 },
];

function BrandMark({ settings }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: "var(--nt-primary)" }}
      >
        {(settings?.companyName || "NT").slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-800 truncate">
          {settings?.companyName || "November Trip"}
        </div>
        <div className="text-xs text-slate-400">Tour Ops + Odoo Sync</div>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive ? "text-white" : "text-slate-600 hover:bg-slate-100"
    }`;
  const linkStyle = ({ isActive }) => (isActive ? { backgroundColor: "var(--nt-primary)" } : undefined);

  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass} style={linkStyle} onClick={onNavigate}>
          <item.icon size={18} strokeWidth={2} />
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div className="pt-3 mt-3 border-t border-slate-100">
        <NavLink to="/settings" className={linkClass} style={linkStyle} onClick={onNavigate}>
          <SettingsIcon size={18} strokeWidth={2} />
          <span>ตั้งค่าระบบ</span>
        </NavLink>
      </div>
    </nav>
  );
}

function UserFooter({ user, logout }) {
  return (
    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-700 truncate">{user?.name}</div>
        <div className="text-[11px] text-slate-400">{user?.role}</div>
      </div>
      <button onClick={logout} className="text-slate-400 hover:text-slate-700 shrink-0" title="ออกจากระบบ">
        <LogOut size={16} />
      </button>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { settings } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer automatically whenever the route changes, so
  // tapping a link doesn't leave the menu open over the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 md:flex md:flex-col">
      <div className="md:flex md:flex-1 md:min-h-0">
        {/* Mobile top bar - only visible below md, sits above the page content */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <BrandMark settings={settings} />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
            aria-label="เปิดเมนู"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Desktop sidebar - always visible at md and up, hidden on mobile.
            Fixed to the viewport height (not part of the page's scroll) so
            it stays put while <main> scrolls independently. */}
        <aside className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 flex-col">
          <div className="px-5 py-5 border-b border-slate-100">
            <BrandMark settings={settings} />
          </div>
          <NavLinks />
          <UserFooter user={user} logout={logout} />
        </aside>

        {/* Mobile drawer - slides in over the page, only rendered/interactive
            below md. Backdrop click or the X button closes it. */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/40 transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative w-72 max-w-[80vw] bg-white flex flex-col shadow-xl transition-transform duration-200 translate-x-0">
              <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <BrandMark settings={settings} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0"
                  aria-label="ปิดเมนู"
                >
                  <X size={20} />
                </button>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <UserFooter user={user} logout={logout} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 h-full overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
