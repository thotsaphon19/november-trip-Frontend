import { useState } from "react";
import { Plug, GitCompareArrows, Palette, Mail, MessageCircle, Users } from "lucide-react";
import { useAuth } from "../lib/authContext";
import OdooTab from "./settings/OdooTab";
import FieldMappingTab from "./settings/FieldMappingTab";
import AppearanceTab from "./settings/AppearanceTab";
import EmailTab from "./settings/EmailTab";
import LineTab from "./settings/LineTab";
import UsersTab from "./settings/UsersTab";

const TABS = [
  { key: "odoo", label: "Odoo", icon: Plug, component: OdooTab },
  { key: "mapping", label: "Field Mapping", icon: GitCompareArrows, component: FieldMappingTab },
  { key: "appearance", label: "ธีม/หน้าตา", icon: Palette, component: AppearanceTab },
  { key: "email", label: "อีเมล", icon: Mail, component: EmailTab },
  { key: "line", label: "LINE", icon: MessageCircle, component: LineTab },
  { key: "users", label: "ผู้ใช้งาน", icon: Users, component: UsersTab, adminOnly: true },
];

export default function Settings() {
  const { user } = useAuth();
  const [active, setActive] = useState("odoo");

  const visibleTabs = TABS.filter((t) => !t.adminOnly || user?.role === "ADMIN");
  const ActiveComponent = visibleTabs.find((t) => t.key === active)?.component || OdooTab;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
        <p className="text-slate-500 text-sm">ตั้งค่าทุกอย่างได้ในหน้านี้ บันทึกลงฐานข้อมูลและใช้งานได้ทันที ไม่ต้องแก้ไฟล์ .env</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
              active === t.key
                ? "text-white border-transparent"
                : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
            }`}
            style={active === t.key ? { backgroundColor: "var(--nt-primary)" } : undefined}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <ActiveComponent />
    </div>
  );
}
