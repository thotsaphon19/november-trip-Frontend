import { useEffect, useState } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Input, ImageUploader } from "../../components/ui";
import { Palette, Building2 } from "lucide-react";
import { useTheme } from "../../lib/themeContext";

const COLOR_PRESETS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Sky", value: "#0284c7" },
  { name: "Teal", value: "#0d9488" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Emerald", value: "#059669" },
  { name: "Rose", value: "#e11d48" },
];

const FONT_OPTIONS = ["Inter", "Noto Sans Thai", "Kanit", "Prompt", "Sarabun", "Mitr"];

const emptyForm = {
  primaryColor: "#2563eb",
  fontFamily: "Inter",
  companyName: "November Trip",
  companyLogoUrl: "",
  companyAddress: "",
  companyTaxId: "",
  companyPhone: "",
  companyEmail: "",
};

export default function AppearanceTab() {
  const { settings, reload, applyTheme } = useTheme();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm({ ...emptyForm, ...settings });
  }, [settings]);

  // Live-preview theme changes as the admin picks, before saving.
  function update(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    if (patch.primaryColor || patch.fontFamily || patch.companyName) applyTheme(next);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await api.put("/settings/appearance", form);
      await reload();
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <SectionCard icon={Palette} title="ธีมและหน้าตาระบบ" subtitle="เปลี่ยนสีหลักและฟอนต์ - เห็นผลทันทีทั้งระบบ">
        <div className="space-y-5">
          <Input label="ชื่อบริษัท / ระบบ" value={form.companyName} onChange={(e) => update({ companyName: e.target.value })} />

          <div>
            <span className="block text-sm text-slate-600 mb-2">สีหลัก (Primary Color)</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update({ primaryColor: c.value })}
                  className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.primaryColor === c.value ? "border-slate-800" : "border-white shadow"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <label className="w-9 h-9 rounded-full border-2 border-white shadow overflow-hidden cursor-pointer relative">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="absolute -top-1 -left-1 w-12 h-12 cursor-pointer"
                />
              </label>
              <code className="text-xs text-slate-500 ml-1">{form.primaryColor}</code>
            </div>
          </div>

          <div>
            <span className="block text-sm text-slate-600 mb-2">ฟอนต์</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => update({ fontFamily: font })}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                    form.fontFamily === font ? "border-[var(--nt-primary)] bg-[var(--nt-primary-light)]" : "border-slate-200 hover:bg-slate-50"
                  }`}
                  style={{ fontFamily: `"${font}", sans-serif` }}
                >
                  {font}
                  <div className="text-xs text-slate-400">ตัวอย่างข้อความ Aa กขค</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Building2}
        title="ข้อมูลบริษัท"
        subtitle="แสดงบนหัวใบเสนอราคา (PDF) — โลโก้, ที่อยู่, เบอร์โทร, เลขผู้เสียภาษี"
      >
        <div className="space-y-4">
          <ImageUploader label="โลโก้บริษัท" value={form.companyLogoUrl} onUploaded={(url) => update({ companyLogoUrl: url })} />
          <Input label="ที่อยู่บริษัท" value={form.companyAddress} onChange={(e) => update({ companyAddress: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="เบอร์โทร" value={form.companyPhone} onChange={(e) => update({ companyPhone: e.target.value })} />
            <Input label="อีเมล" value={form.companyEmail} onChange={(e) => update({ companyEmail: e.target.value })} />
          </div>
          <Input label="เลขประจำตัวผู้เสียภาษี" value={form.companyTaxId} onChange={(e) => update({ companyTaxId: e.target.value })} />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          บันทึก
        </Button>
        {saved && <span className="text-sm text-green-600">✅ บันทึกแล้ว</span>}
      </div>
    </form>
  );
}
