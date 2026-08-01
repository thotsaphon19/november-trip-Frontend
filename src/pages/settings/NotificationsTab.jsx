import { useEffect, useState } from "react";
import api from "../../lib/api";
import { SectionCard, Button, Input } from "../../components/ui";
import { BellRing } from "lucide-react";
import { useTheme } from "../../lib/themeContext";

export default function NotificationsTab() {
  const { settings, reload } = useTheme();
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (settings?.contractWarningDays !== undefined) setDays(settings.contractWarningDays);
  }, [settings]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      // Send the whole settings object back, not just the changed field -
      // the PUT endpoint is shared with the appearance tab, so this avoids
      // any risk of clobbering colors/company info with undefined.
      await api.put("/settings/appearance", { ...settings, contractWarningDays: days });
      await reload();
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <SectionCard
        icon={BellRing}
        title="แจ้งเตือนสัญญาใกล้หมดอายุ"
        subtitle="กำหนดว่าจะเริ่มแจ้งเตือน (แบนเนอร์ + เสียง) ก่อนวันสิ้นสุดสัญญากี่วัน — ใช้ค่าเดียวกันทั้งหน้ารายการโรงแรมและหน้ารายละเอียดโรงแรม"
      >
        <div className="max-w-xs">
          <Input
            label="แจ้งเตือนล่วงหน้ากี่วัน"
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            ตัวอย่าง: ใส่ 7 = เริ่มเตือนเมื่อเหลืออีก 7 วันก่อนหมดสัญญา วันที่หมดอายุพอดี (หรือหมดแล้ว) จะแจ้งเตือนเป็นสีแดงเสมอไม่ว่าจะตั้งค่านี้เป็นเท่าไหร่
          </p>
        </div>
      </SectionCard>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          บันทึก
        </Button>
        {saved && <span className="text-sm text-green-600">✅ บันทึกแล้ว</span>}
      </div>
    </form>
  );
}
