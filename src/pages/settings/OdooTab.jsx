import { useEffect, useState } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Input, Badge } from "../../components/ui";
import { Plug, DownloadCloud, Webhook, Layers, RotateCcw } from "lucide-react";

// Odoo's technical model name for each entity we sync. Defaults match a
// stock Odoo install; overridable below for setups where the model was
// renamed, doesn't exist (e.g. no Sales app -> "sale.order" is missing),
// or is a Studio custom model instead.
const ENTITY_MODEL_DEFAULTS = {
  HotelSupplier: "res.partner",
  TourSupplier: "res.partner",
  Product: "product.template",
  Quotation: "sale.order",
};

const ENTITY_MODEL_LABELS = {
  HotelSupplier: "Hotel Supplier (Supplier > Hotels)",
  TourSupplier: "Tour Supplier (Supplier > Tour)",
  Product: "Product (สร้างทัวร์)",
  Quotation: "Quotation (ใบเสนอราคา)",
};

export default function OdooTab() {
  const [form, setForm] = useState({ url: "", db: "", username: "", apiKey: "" });
  const [apiKeySet, setApiKeySet] = useState(false);
  const [rawConfig, setRawConfig] = useState(null);
  const [modelMapForm, setModelMapForm] = useState({ ...ENTITY_MODEL_DEFAULTS });
  const [modelMapBusy, setModelMapBusy] = useState(false);
  const [modelMapSaved, setModelMapSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pullResult, setPullResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  async function load() {
    const { data } = await api.get("/odoo/config");
    if (data) {
      setForm({ url: data.url, db: data.db, username: data.username, apiKey: "" });
      setApiKeySet(data.apiKeySet);
      setRawConfig(data);
      setModelMapForm({ ...ENTITY_MODEL_DEFAULTS, ...(data.modelMap || {}) });
    }
    const logsRes = await api.get("/odoo/logs");
    setLogs(logsRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveModelMap(e) {
    e.preventDefault();
    setModelMapBusy(true);
    setModelMapSaved(false);
    try {
      await api.put("/odoo/config", { ...rawConfig, modelMap: modelMapForm });
      await load();
      setModelMapSaved(true);
    } finally {
      setModelMapBusy(false);
    }
  }

  async function saveConfig(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/odoo/config", form);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/odoo/config/test");
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function runPull(endpoint, label) {
    setBusy(true);
    setPullResult(null);
    try {
      const { data } = await api.post(`/odoo/pull/${endpoint}`);
      setPullResult({ label, data });
      await load();
    } catch (e) {
      setPullResult({ label, error: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function runImportQuotations() {
    if (!confirm("จะสร้างใบเสนอราคาใหม่ในเว็บนี้ สำหรับทุกใบที่สร้างใน Odoo โดยตรงและยังไม่เคยเชื่อมกับเว็บนี้ ต้องการดำเนินการต่อหรือไม่?")) return;
    setBusy(true);
    setImportResult(null);
    try {
      const { data } = await api.post("/odoo/import/sale-orders");
      setImportResult({ data });
      await load();
    } catch (e) {
      setImportResult({ error: e.message });
    } finally {
      setBusy(false);
    }
  }

  const pullButtons = [
    { endpoint: "hotel-partners", label: "Hotel Suppliers" },
    { endpoint: "tour-partners", label: "Tour Suppliers" },
    { endpoint: "products", label: "Products" },
    { endpoint: "supplier-products", label: "Room/Activity Prices" },
    { endpoint: "sale-orders", label: "Quotation Status" },
  ];

  return (
    <div className="space-y-5">
      <SectionCard icon={Plug} title="การเชื่อมต่อ Odoo" subtitle="URL, Database, Username, API Key — ไม่ต้องแก้ .env">
        <form onSubmit={saveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Odoo URL" placeholder="https://yourcompany.odoo.com" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <Input label="Database name" required value={form.db} onChange={(e) => setForm({ ...form, db: e.target.value })} />
          <Input label="Username (email)" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input
            label={`API Key ${apiKeySet ? "(ตั้งไว้แล้ว - เว้นว่างเพื่อไม่เปลี่ยน)" : ""}`}
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          <div className="md:col-span-2 flex gap-2 pt-1">
            <Button type="submit" disabled={busy}>
              บันทึก
            </Button>
            <Button type="button" variant="secondary" onClick={testConnection} disabled={busy}>
              ทดสอบการเชื่อมต่อ
            </Button>
          </div>
        </form>
        {testResult && (
          <div className={`mt-3 text-sm ${testResult.success ? "text-green-600" : "text-red-600"}`}>
            {testResult.success ? "✅ " : "❌ "}
            {testResult.message}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={Layers}
        title="การแมปโมเดล Odoo"
        subtitle={'ถ้าเจอ error แบบ "Object xxx doesn\'t exist" แปลว่า Odoo ไม่มีโมเดลนั้น (เช่น ไม่ได้ติดตั้งแอป Sales) หรือใช้ชื่อโมเดล Studio custom แทน — แก้ชื่อโมเดลตรงนี้ได้เลย'}
      >
        <form onSubmit={saveModelMap} className="space-y-3">
          {Object.keys(ENTITY_MODEL_DEFAULTS).map((entity) => (
            <div key={entity} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <label className="text-sm text-slate-600">{ENTITY_MODEL_LABELS[entity]}</label>
              <div className="flex gap-1.5">
                <input
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--nt-primary)]/40"
                  value={modelMapForm[entity] || ""}
                  onChange={(e) => setModelMapForm({ ...modelMapForm, [entity]: e.target.value })}
                  placeholder={ENTITY_MODEL_DEFAULTS[entity]}
                />
                {modelMapForm[entity] !== ENTITY_MODEL_DEFAULTS[entity] && (
                  <button
                    type="button"
                    title={`รีเซ็ตเป็นค่าเริ่มต้น (${ENTITY_MODEL_DEFAULTS[entity]})`}
                    onClick={() => setModelMapForm({ ...modelMapForm, [entity]: ENTITY_MODEL_DEFAULTS[entity] })}
                    className="shrink-0 px-2 text-slate-400 hover:text-slate-700"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={modelMapBusy}>
              บันทึกการแมปโมเดล
            </Button>
            {modelMapSaved && <span className="text-sm text-green-600">✅ บันทึกแล้ว</span>}
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={DownloadCloud} title="ดึงข้อมูลจาก Odoo (Pull)" subtitle="ใช้เมื่อมีคนแก้ไขข้อมูลฝั่ง Odoo โดยตรง">
        <p className="text-sm text-slate-500 mb-3">
          การเปลี่ยนราคาต้นทุนจะไล่อัปเดตทุกวันในทัวร์/ใบเสนอราคาที่ใช้ supplier นั้นอยู่ให้อัตโนมัติ
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {pullButtons.map((b) => (
            <Button key={b.endpoint} variant="secondary" onClick={() => runPull(b.endpoint, b.label)} disabled={busy}>
              ⬇ {b.label}
            </Button>
          ))}
          <Button onClick={() => runPull("all", "ทั้งหมด")} disabled={busy}>
            ⬇ Pull ทั้งหมด
          </Button>
        </div>
        {pullResult && (
          <div className={`text-sm ${pullResult.error ? "text-red-600" : "text-green-600"}`}>
            {pullResult.error ? `❌ ${pullResult.label}: ${pullResult.error}` : `✅ ${pullResult.label}: ${JSON.stringify(pullResult.data)}`}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={DownloadCloud}
        title="นำเข้าใบเสนอราคาใหม่จาก Odoo"
        subtitle="สำหรับใบเสนอราคาที่สร้างใน Odoo โดยตรง ไม่เคยผ่านเว็บนี้มาก่อน"
      >
        <p className="text-sm text-slate-500 mb-1">
          ใช้เมื่อสร้าง/ตีราคาใบเสนอราคาใน Odoo ก่อน แล้วอยากได้ข้อมูลนั้นมาไว้ในเว็บนี้ (เช่น เพื่อโหลด PDF ภาษาอังกฤษ) โดยไม่ต้องพิมพ์ชื่อลูกค้า/ราคาใหม่
        </p>
        <p className="text-xs text-amber-600 mb-3">
          ข้อควรรู้: Odoo เก็บรายการสินค้าเป็น list เดียว ไม่มีข้อมูล "วันไหนไปไหน" เหมือนเว็บนี้ ระบบจะนำเข้ารายการทั้งหมดไปไว้ที่ Day 1 ก่อน
          แล้วค่อยจัดเรียงเป็นรายวันเองอีกที (ราคาต้นทุนก็ต้องกรอกใหม่ เพราะ Odoo ไม่มีข้อมูลต้นทุนของเรา)
        </p>
        <Button onClick={runImportQuotations} disabled={busy}>
          ⬇ นำเข้าใบเสนอราคาใหม่
        </Button>
        {importResult && (
          <div className={`text-sm mt-2 ${importResult.error ? "text-red-600" : "text-green-600"}`}>
            {importResult.error
              ? `❌ ${importResult.error}${
                  /doesn't exist|does not exist/i.test(importResult.error)
                    ? " — ลองแก้ชื่อโมเดลของ Quotation ที่การ์ด \"การแมปโมเดล Odoo\" ด้านบน (Odoo อาจไม่มีโมเดลนี้ หรือใช้ชื่ออื่น)"
                    : ""
                }`
              : `✅ นำเข้าแล้ว ${importResult.data.imported} ใบ (พบทั้งหมด ${importResult.data.fetched} ใบใน Odoo, ${importResult.data.skipped} ใบเชื่อมกับเว็บนี้อยู่แล้ว)`}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={Webhook} title="Webhook (Odoo → App แบบ Real-time)" subtitle="ตั้งค่าใน Odoo Automation Rules">
        <p className="text-sm text-slate-500 mb-2">เรียก URL นี้เมื่อมีการสร้าง/แก้ไขข้อมูลฝั่ง Odoo:</p>
        <code className="block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs break-all">
          POST {(import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`).replace(/\/$/, "")}/odoo/webhook
          <br />
          Header: X-Webhook-Secret: &lt;ODOO_WEBHOOK_SECRET&gt;
        </code>
      </SectionCard>

      <SectionCard icon={DownloadCloud} title="Sync Log" subtitle="ประวัติการซิงค์ล่าสุด 100 รายการ">
        <p className="text-xs text-slate-400 mb-3">
          ระบบเช็คฟิลด์จริงใน Odoo ก่อน sync ทุกครั้ง — ถ้าฟิลด์ไหนไม่มีในเวอร์ชัน/setup ของคุณ ระบบจะข้ามฟิลด์นั้นแล้ว sync
          ต่อโดยอัตโนมัติ (ไม่ error ทั้งก้อน) พร้อมโชว์ในคอลัมน์ "รายละเอียด" ว่าข้ามฟิลด์ไหนไปบ้าง
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left py-1">เวลา</th>
                <th className="text-left py-1">Entity</th>
                <th className="text-left py-1">ทิศทาง</th>
                <th className="text-left py-1">Odoo Model</th>
                <th className="text-left py-1">สถานะ</th>
                <th className="text-left py-1">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString("th-TH")}</td>
                  <td className="py-1">{l.entity}</td>
                  <td className="py-1">{l.direction === "PUSH" ? "App → Odoo" : "Odoo → App"}</td>
                  <td className="py-1 font-mono text-xs">{l.odooModel}</td>
                  <td className="py-1">
                    <Badge tone={l.status === "SUCCESS" ? "green" : "red"}>{l.status}</Badge>
                  </td>
                  <td className="py-1 text-xs text-slate-500">{l.message || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    ยังไม่มีประวัติการ sync
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
