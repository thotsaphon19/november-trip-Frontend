import { useEffect, useState } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Select } from "../../components/ui";
import { GitCompareArrows, RefreshCw } from "lucide-react";

const ENTITY_MODELS = {
  HotelSupplier: "res.partner",
  TourSupplier: "res.partner",
  Product: "product.template",
};

const ENTITY_LABELS = {
  HotelSupplier: "Hotel Supplier (Supplier > Hotels)",
  TourSupplier: "Tour Supplier (Supplier > Tour)",
  Product: "Product (สร้างทัวร์)",
};

export default function FieldMappingTab() {
  const [defaults, setDefaults] = useState({});
  const [config, setConfig] = useState(null);
  const [entity, setEntity] = useState("HotelSupplier");
  const [odooFields, setOdooFields] = useState([]);
  const [fieldsError, setFieldsError] = useState("");
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/odoo/field-map/defaults").then(({ data }) => setDefaults(data));
    api.get("/odoo/config").then(({ data }) => setConfig(data));
  }, []);

  useEffect(() => {
    if (!defaults[entity]) return;
    const override = config?.fieldMap?.[entity] || {};
    setMapping({ ...defaults[entity], ...override });
    loadOdooFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, defaults, config]);

  async function loadOdooFields() {
    setFieldsError("");
    setBusy(true);
    try {
      const model = config?.modelMap?.[entity] || ENTITY_MODELS[entity];
      const { data } = await api.get(`/odoo/fields/${model}`);
      setOdooFields(data);
    } catch (e) {
      setFieldsError(e.message);
      setOdooFields([]);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const newFieldMap = { ...(config?.fieldMap || {}), [entity]: mapping };
      await api.put("/odoo/config", {
        url: config.url,
        db: config.db,
        username: config.username,
        modelMap: config.modelMap || {},
        fieldMap: newFieldMap,
      });
      setConfig({ ...config, fieldMap: newFieldMap });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const logicalLabels = {
    name: "ชื่อ",
    email: "อีเมล",
    phone: "เบอร์โทร",
    address: "ที่อยู่",
    taxId: "เลขผู้เสียภาษี",
    code: "รหัส (ref/default_code)",
    price: "ราคา",
  };

  return (
    <div className="space-y-5">
      <SectionCard
        icon={GitCompareArrows}
        title="Field Mapping"
        subtitle="จับคู่ฟิลด์ของระบบกับฟิลด์จริงใน Odoo — เห็นรายชื่อฟิลด์ของ Odoo ได้เลย ไม่ต้องเดา"
        action={
          <Button variant="secondary" onClick={loadOdooFields} disabled={busy}>
            <RefreshCw size={14} className="inline mr-1" /> รีเฟรชฟิลด์จาก Odoo
          </Button>
        }
      >
        <Select label="เลือก Entity" value={entity} onChange={(e) => setEntity(e.target.value)} className="max-w-sm mb-4">
          {Object.keys(ENTITY_MODELS).map((k) => (
            <option key={k} value={k}>
              {ENTITY_LABELS[k]}
            </option>
          ))}
        </Select>

        <p className="text-xs text-slate-500 mb-3">
          Odoo model: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{config?.modelMap?.[entity] || ENTITY_MODELS[entity]}</code>
        </p>

        {fieldsError && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            ดึงรายชื่อฟิลด์จาก Odoo ไม่ได้ ({fieldsError}) — ยังตั้งชื่อฟิลด์เองได้ด้วยมือด้านล่าง
          </div>
        )}

        <div className="space-y-3">
          {Object.entries(mapping).map(([logicalField, odooField]) => (
            <div key={logicalField} className="grid grid-cols-2 gap-3 items-center">
              <div className="text-sm text-slate-600">{logicalLabels[logicalField] || logicalField}</div>
              {odooFields.length > 0 ? (
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--nt-primary)]/40"
                  value={odooField}
                  onChange={(e) => setMapping({ ...mapping, [logicalField]: e.target.value })}
                >
                  {!odooFields.some((f) => f.name === odooField) && <option value={odooField}>{odooField} (custom)</option>}
                  {odooFields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} — {f.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--nt-primary)]/40"
                  value={odooField}
                  onChange={(e) => setMapping({ ...mapping, [logicalField]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button onClick={save} disabled={busy}>
            บันทึก Mapping
          </Button>
          {saved && <span className="text-sm text-green-600">✅ บันทึกแล้ว</span>}
        </div>
      </SectionCard>
    </div>
  );
}
