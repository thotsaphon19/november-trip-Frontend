import { useEffect, useState } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Input } from "../../components/ui";
import { Mail } from "lucide-react";

const emptyForm = {
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
  fromName: "November Trip",
  fromEmail: "",
};

export default function EmailTab() {
  const [form, setForm] = useState(emptyForm);
  const [passSet, setPassSet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState(null);

  async function load() {
    const { data } = await api.get("/settings/email");
    if (data) {
      setForm({ ...data, smtpPass: "" });
      setPassSet(data.smtpPassSet);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/settings/email", form);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/settings/email/test", { to: testTo || undefined });
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard icon={Mail} title="เชื่อมต่ออีเมล (SMTP)" subtitle="ใช้ส่งใบเสนอราคาให้ลูกค้าโดยตรงจากระบบ">
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="SMTP Host" placeholder="smtp.gmail.com" required value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
          <Input label="SMTP Port" type="number" required value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} />
          <Input label="Username" required value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
          <Input
            label={`Password ${passSet ? "(ตั้งไว้แล้ว - เว้นว่างเพื่อไม่เปลี่ยน)" : ""}`}
            type="password"
            value={form.smtpPass}
            onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
          />
          <Input label="ชื่อผู้ส่ง (From Name)" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
          <Input label="อีเมลผู้ส่ง (From Email)" type="email" required value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
            <input type="checkbox" checked={form.smtpSecure} onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })} />
            ใช้ SSL/TLS ทันที (port 465) — ถ้าใช้ port 587 ปล่อยว่างไว้ (STARTTLS อัตโนมัติ)
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              บันทึก
            </Button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600 mb-2">ทดสอบการเชื่อมต่อ (ใส่อีเมลถ้าต้องการให้ส่งจริง)</p>
          <div className="flex gap-2">
            <Input placeholder="test@example.com (เว้นว่างเพื่อเช็คแค่การเชื่อมต่อ)" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="flex-1" />
            <Button variant="secondary" onClick={sendTest} disabled={busy}>
              ทดสอบ
            </Button>
          </div>
          {testResult && (
            <div className={`mt-2 text-sm ${testResult.success ? "text-green-600" : "text-red-600"}`}>
              {testResult.success ? "✅ " : "❌ "}
              {testResult.message}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
