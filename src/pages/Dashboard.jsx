import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card } from "../components/ui";
import { Building2, Ticket, Compass, FileText, TrendingUp, Wallet, LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [hotels, tours, products, quotations, report] = await Promise.all([
          api.get("/suppliers/hotels"),
          api.get("/suppliers/tours"),
          api.get("/products"),
          api.get("/quotations"),
          api.get("/reports"),
        ]);
        setStats({
          hotels: hotels.data.length,
          tours: tours.data.length,
          products: products.data.length,
          quotations: quotations.data.length,
          totalSell: report.data.totals.totalSell,
          totalProfit: report.data.totals.totalProfit,
        });
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, []);

  const cards = stats
    ? [
        { label: "Hotel Suppliers", value: stats.hotels, icon: Building2 },
        { label: "Tour Suppliers", value: stats.tours, icon: Ticket },
        { label: "Tour Products", value: stats.products, icon: Compass },
        { label: "Quotations", value: stats.quotations, icon: FileText },
        { label: "ยอดขายรวม (Sales)", value: `฿${stats.totalSell.toLocaleString()}`, icon: TrendingUp, accent: true },
        { label: "กำไรรวม (Profit)", value: `฿${stats.totalProfit.toLocaleString()}`, icon: Wallet, accent: true },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: "var(--nt-primary)" }}
        >
          <LayoutDashboard size={18} strokeWidth={2.25} />
        </span>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      </div>
      <p className="text-slate-500 mb-6 ml-11.5">ภาพรวมระบบ November Trip</p>

      {error && (
        <Card className="p-4 mb-4 text-red-600 text-sm">
          เชื่อมต่อ backend ไม่ได้: {error}. ตรวจสอบว่า backend รันอยู่ที่ port 4000
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: c.accent ? "var(--nt-primary)" : "var(--nt-primary-light)",
                  color: c.accent ? "white" : "var(--nt-primary)",
                }}
              >
                <c.icon size={17} strokeWidth={2} />
              </span>
            </div>
            <div className="text-slate-500 text-sm">{c.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{c.value ?? "—"}</div>
          </Card>
        ))}
        {!stats && !error && (
          <Card className="p-5 col-span-full text-slate-400 text-sm text-center">กำลังโหลดข้อมูล…</Card>
        )}
      </div>
    </div>
  );
}
