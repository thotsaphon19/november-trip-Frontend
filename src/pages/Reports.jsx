import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, Input, Select, statusLabelTH, PageHeader } from "../components/ui";
import { BarChart3 } from "lucide-react";

// This page reads straight from Quotation - every row here is a quotation
// that was already built on the Quotation page. Nothing is re-typed here;
// only the "confirmed booking" fields (status/guide/flight) are editable
// inline, since those are usually only known after the sale closes.
export default function Reports() {
  const [report, setReport] = useState({ rows: [], totals: { totalCost: 0, totalSell: 0, totalProfit: 0 }, count: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const { data } = await api.get(`/reports?${params.toString()}`);
    setReport(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  async function updateRow(id, patch) {
    await api.put(`/reports/${id}`, patch);
    await load();
  }

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Report"
        subtitle="ดึงข้อมูลจากใบเสนอราคาที่สร้างไว้แล้วโดยอัตโนมัติ — แก้ไขสถานะ/ไกด์/ตั๋วเครื่องบินได้ตรงนี้"
      />

      <div className="flex gap-3 mb-4">
        <Input placeholder="ค้นหารหัสทัวร์ / ใบเสนอราคา / ชื่อลูกค้า" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">ทุกสถานะ</option>
          {Object.entries(statusLabelTH).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">รหัสทัวร์</th>
              <th className="text-left px-4 py-2">ลูกค้า</th>
              <th className="text-right px-4 py-2">ต้นทุน</th>
              <th className="text-right px-4 py-2">ราคาขาย</th>
              <th className="text-right px-4 py-2">กำไร</th>
              <th className="text-left px-4 py-2">สถานะ</th>
              <th className="text-center px-4 py-2">ตั๋วเครื่องบิน</th>
              <th className="text-left px-4 py-2">ไกด์</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <ReportRow key={r.id} row={r} onUpdate={(patch) => updateRow(r.id, patch)} />
            ))}
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  ยังไม่มีใบเสนอราคา — สร้างได้จากหน้า Quotation
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={2}>
                รวมทั้งหมด ({report.count} รายการ)
              </td>
              <td className="px-4 py-2 text-right">฿{report.totals.totalCost.toLocaleString()}</td>
              <td className="px-4 py-2 text-right">฿{report.totals.totalSell.toLocaleString()}</td>
              <td className="px-4 py-2 text-right">฿{report.totals.totalProfit.toLocaleString()}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
        </div>
      </Card>
    </div>
  );
}

function ReportRow({ row, onUpdate }) {
  const [guideName, setGuideName] = useState(row.guideName || "");

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 font-mono text-xs">
        {row.tourCode || "—"}
        <div className="text-slate-400">{row.quoteCode}</div>
      </td>
      <td className="px-4 py-2">{row.customerName}</td>
      <td className="px-4 py-2 text-right">฿{Number(row.costPrice).toLocaleString()}</td>
      <td className="px-4 py-2 text-right">฿{Number(row.sellPrice).toLocaleString()}</td>
      <td className="px-4 py-2 text-right font-medium">
        ฿{(Number(row.sellPrice) - Number(row.costPrice)).toLocaleString()}
      </td>
      <td className="px-4 py-2">
        <select
          value={row.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
          className="text-xs rounded border border-slate-200 px-1 py-0.5"
        >
          {Object.entries(statusLabelTH).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-center">
        <input
          type="checkbox"
          checked={row.includesFlight}
          onChange={(e) => onUpdate({ includesFlight: e.target.checked })}
        />
      </td>
      <td className="px-4 py-2">
        <input
          className="w-28 border-b border-dashed border-slate-300 text-xs px-1 py-0.5 focus:outline-none focus:border-blue-500"
          value={guideName}
          onChange={(e) => setGuideName(e.target.value)}
          onBlur={() => onUpdate({ guideName })}
          placeholder="ชื่อไกด์"
        />
      </td>
    </tr>
  );
}
