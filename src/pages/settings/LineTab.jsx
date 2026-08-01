import { useEffect, useState } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Input } from "../../components/ui";
import { MessageCircle } from "lucide-react";

export default function LineTab() {
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [tokenSet, setTokenSet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testUserId, setTestUserId] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const { data } = await api.get("/settings/line");
    if (data) setTokenSet(data.channelAccessTokenSet);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await api.put("/settings/line", { channelAccessToken });
      setChannelAccessToken("");
      await load();
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/settings/line/test", { testUserId: testUserId || undefined });
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard icon={MessageCircle} title="เชื่อมต่อ LINE Official Account" subtitle="ใช้ส่งใบเสนอราคาให้ลูกค้าผ่าน LINE โดยตรง">
        <p className="text-sm text-slate-500 mb-4">
          สร้าง Channel Access Token ได้จาก{" "}
          <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="text-[var(--nt-primary)] underline">
            LINE Developers Console
          </a>{" "}
          → เลือก Messaging API channel → Messaging API tab → Issue
        </p>
        <form onSubmit={save} className="space-y-3">
          <Input
            label={`Channel Access Token ${tokenSet ? "(ตั้งไว้แล้ว - เว้นว่างเพื่อไม่เปลี่ยน)" : ""}`}
            type="password"
            value={channelAccessToken}
            onChange={(e) => setChannelAccessToken(e.target.value)}
            placeholder="เริ่มต้นด้วยตัวอักษรและตัวเลขยาวๆ"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              บันทึก
            </Button>
            {saved && <span className="text-sm text-green-600">✅ บันทึกแล้ว</span>}
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600 mb-2">ทดสอบการเชื่อมต่อ (ใส่ LINE User ID ถ้าต้องการส่งข้อความจริง)</p>
          <div className="flex gap-2">
            <Input placeholder="Uxxxxxxxxxxxxxxxx (เว้นว่างเพื่อเช็คแค่การเชื่อมต่อ)" value={testUserId} onChange={(e) => setTestUserId(e.target.value)} className="flex-1" />
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
          <p className="text-xs text-slate-400 mt-2">
            หา LINE User ID ของลูกค้าได้จากการที่ลูกค้าทัก OA เข้ามาก่อน (LINE Messaging API ส่งข้อความหาคนที่เคยเพิ่มเพื่อนแล้วเท่านั้น)
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
