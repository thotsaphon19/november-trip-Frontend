import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Badge, Select, statusTone, statusLabelTH, PageHeader, Tabs } from "../components/ui";
import { FileText, ArrowLeft } from "lucide-react";
import { QuoteDayGroup, QuotationPoliciesSection } from "./QuotationDetailPage";
import { useUndo } from "../lib/undoContext";

const emptyQuote = {
  quoteCode: "",
  tourCode: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerAddress: "",
  customerLineId: "",
  days: 3,
  adults: 2,
  children: 0,
  startDate: "",
};

const FORM_TABS = [
  { id: "customer", label: "ข้อมูลลูกค้า" },
  { id: "itinerary", label: "รายการเดินทาง" },
  { id: "policies", label: "นโยบายต่างๆ" },
];

export default function Quotations() {
  const { scheduleAction } = useUndo();
  const [quotes, setQuotes] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tourSuppliers, setTourSuppliers] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  // --- "Fill in a new quotation" panel state ---------------------------------
  const [adding, setAdding] = useState(false);
  const [formTab, setFormTab] = useState("customer");
  const [form, setForm] = useState(emptyQuote);
  const [draftQuote, setDraftQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(query = q, statusVal = statusFilter) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusVal) params.set("status", statusVal);
    const { data } = await api.get(`/quotations?${params.toString()}`);
    setQuotes(data);
  }

  async function loadSuppliers() {
    const [h, t] = await Promise.all([api.get("/suppliers/hotels"), api.get("/suppliers/tours")]);
    setHotels(h.data);
    setTourSuppliers(t.data);
  }

  useEffect(() => {
    load(q, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter]);

  useEffect(() => {
    loadSuppliers();
    suggestNextQuoteCode();
  }, []);

  async function suggestNextQuoteCode() {
    try {
      const { data } = await api.get("/quotations/next-code");
      setForm((f) => ({ ...f, quoteCode: data.code }));
    } catch {
      /* auto-code is a convenience only - the field stays editable either way */
    }
  }

  async function openAddPanel() {
    setForm(emptyQuote);
    setDraftQuote(null);
    setFormTab("customer");
    setError("");
    setAdding(true);
    await suggestNextQuoteCode();
  }

  function closeAddPanel() {
    setAdding(false);
    setDraftQuote(null);
    load();
  }

  async function resetForm() {
    setForm(emptyQuote);
    setDraftQuote(null);
    setFormTab("customer");
    setError("");
    await suggestNextQuoteCode();
  }

  async function reloadDraft() {
    if (!draftQuote) return;
    const { data } = await api.get(`/quotations/${draftQuote.id}`);
    setDraftQuote(data);
  }

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!draftQuote) {
        const { data } = await api.post("/quotations", form);
        setDraftQuote(data);
        await load();
        setFormTab("itinerary");
      } else {
        await api.put(`/quotations/${draftQuote.id}`, form);
        await reloadDraft();
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function deleteQuote(id) {
    const quote = quotes.find((x) => x.id === id);
    setQuotes((prev) => prev.filter((x) => x.id !== id));
    scheduleAction(`ลบใบเสนอราคา "${quote?.quoteCode}" แล้ว`, {
      onConfirm: () => api.delete(`/quotations/${id}`),
      onUndo: () => load(),
    });
  }

  async function updateDay(dayId, patch) {
    await api.put(`/quotations/days/${dayId}`, patch);
    reloadDraft();
  }

  async function addDayItem(dayNumber) {
    await api.post(`/quotations/${draftQuote.id}/days/${dayNumber}/items`);
    reloadDraft();
  }

  async function addDayTemplate(dayNumber) {
    await api.post(`/quotations/${draftQuote.id}/days/${dayNumber}/template`);
    reloadDraft();
  }

  async function deleteDayItem(dayId) {
    await api.delete(`/quotations/day-items/${dayId}`);
    reloadDraft();
  }

  function goToFormTab(tabId) {
    if (tabId !== "customer" && !draftQuote) {
      setError("กรุณาบันทึกข้อมูลลูกค้า (แท็บ ข้อมูลลูกค้า) ก่อน แล้วแท็บอื่นจะเปิดให้กรอกได้");
      return;
    }
    setError("");
    setFormTab(tabId);
  }

  const allActivities = tourSuppliers.flatMap((s) => s.activities.map((a) => ({ ...a, supplierName: s.name })));
  const roomOptions = hotels.flatMap((h) => h.roomTypes.map((rt) => ({ ...rt, hotelId: h.id, hotelName: h.name })));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <PageHeader icon={FileText} title="Quotation" subtitle="ดึงราคาต้นทุนจาก Supplier อัตโนมัติ พร้อมกรอกราคาขาย" />
        {!adding && <Button onClick={openAddPanel}>+ สร้างใบเสนอราคาใหม่</Button>}
      </div>

      {adding && (
      <Card className="overflow-hidden mb-5">
        <div className="flex items-center justify-between p-5 pb-4">
          <button onClick={closeAddPanel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} /> กลับไปหน้ารายการ
          </button>
          <h3 className="font-semibold text-slate-800">
            {draftQuote ? `แก้ไข/เพิ่มข้อมูล: ${draftQuote.customerName}` : "สร้างใบเสนอราคาใหม่"}
          </h3>
          {draftQuote ? (
            <Button variant="secondary" onClick={resetForm}>
              + สร้างใบใหม่อีกรายการ
            </Button>
          ) : (
            <span className="w-[88px]" />
          )}
        </div>

        {error && <div className="text-red-600 text-sm px-5 pb-3">{error}</div>}

        <Tabs tabs={FORM_TABS} active={formTab} onChange={goToFormTab} />

        <div className="p-5">
          {formTab === "customer" && (
            <form onSubmit={saveDetails} className="space-y-3 max-w-2xl">
              <Input label="รหัสใบเสนอราคา (สร้างให้อัตโนมัติ แก้ไขได้)" required value={form.quoteCode} onChange={(e) => setForm({ ...form, quoteCode: e.target.value })} />
              <Input label="รหัสทัวร์ (อ้างอิง)" value={form.tourCode} onChange={(e) => setForm({ ...form, tourCode: e.target.value })} />
              <Input label="ชื่อลูกค้า" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              <Input label="ที่อยู่ลูกค้า" value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="อีเมลลูกค้า" type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
                <Input label="เบอร์โทรลูกค้า" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </div>
              <Input label="LINE User ID ลูกค้า" value={form.customerLineId} onChange={(e) => setForm({ ...form, customerLineId: e.target.value })} placeholder="Uxxxxxxxxxxxxxxxx" />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="จำนวนวัน"
                  type="number"
                  min={1}
                  required
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
                  disabled={!!draftQuote}
                />
                <Input label="ผู้ใหญ่" type="number" min={0} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} />
                <Input label="เด็ก" type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} />
              </div>
              <Input
                label="วันเริ่มทัวร์ (ไม่บังคับ — ใส่แล้วราคาห้องพักจะดึงตามฤดูกาลอัตโนมัติ)"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <p className="text-xs text-slate-400">
                ราคาขายจะคำนวณอัตโนมัติจากราคาขายที่ใส่ในแต่ละวัน หลังจากสร้างแล้ว
              </p>
              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {draftQuote ? "บันทึกข้อมูล" : "สร้าง แล้วไปจัดรายการเดินทาง"}
                </Button>
              </div>
            </form>
          )}

          {formTab === "itinerary" && draftQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-500 block">ต้นทุนรวม (auto)</span>
                  <span className="font-semibold">
                    ฿{draftQuote.itinerary.reduce((sum, d) => sum + Number(d.costPrice), 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-500 block">ราคารวม (Subtotal)</span>
                  <span className="font-semibold">
                    ฿{draftQuote.itinerary.reduce((sum, d) => sum + Number(d.sellPrice), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {Array.from({ length: draftQuote.days }, (_, i) => i + 1).map((dayNumber) => (
                <QuoteDayGroup
                  key={dayNumber}
                  dayNumber={dayNumber}
                  items={draftQuote.itinerary.filter((d) => d.dayNumber === dayNumber)}
                  roomOptions={roomOptions}
                  activities={allActivities}
                  paxCount={Number(draftQuote.adults || 0) + Number(draftQuote.children || 0)}
                  onUpdateItem={updateDay}
                  onAddItem={() => addDayItem(dayNumber)}
                  onAddTemplate={() => addDayTemplate(dayNumber)}
                  onDeleteItem={deleteDayItem}
                />
              ))}

              <p className="text-xs text-slate-400">
                ตั้งค่าไกด์ ผู้ติดต่อ VAT และการส่งอีเมล/LINE/PDF ทำได้ที่หน้ารายละเอียดใบเสนอราคา (กดเข้าไปที่รายการด้านล่าง)
              </p>
            </div>
          )}

          {formTab === "policies" && draftQuote && (
            <QuotationPoliciesSection quotationId={draftQuote.id} policies={draftQuote.policies} onChange={reloadDraft} />
          )}
        </div>
      </Card>
      )}

      {/* --- List of quotations already created — click to view/edit as before --- */}
      <div className="flex gap-3 mb-3">
        <Input placeholder="ค้นหารหัสใบเสนอราคา / ชื่อลูกค้า" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
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
                <th className="text-left px-4 py-2">รหัส</th>
                <th className="text-left px-4 py-2">ลูกค้า</th>
                <th className="text-left px-4 py-2">ราคารวม</th>
                <th className="text-left px-4 py-2">สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  onClick={() => navigate(`/quotations/${quote.id}`)}
                  className="border-t border-slate-100 cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-4 py-2 font-mono text-xs">{quote.quoteCode}</td>
                  <td className="px-4 py-2">{quote.customerName}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">฿{Number(quote.sellPrice).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(quote.status)}>{statusLabelTH[quote.status]}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuote(quote.id);
                      }}
                    >
                      ลบ
                    </Button>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    ยังไม่มีใบเสนอราคา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
