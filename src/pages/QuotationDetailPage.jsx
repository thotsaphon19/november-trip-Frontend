import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Badge, Select, statusLabelTH, Tabs } from "../components/ui";
import { ArrowLeft, FileText, Mail, MessageCircle, Download, ChevronDown, ChevronRight } from "lucide-react";
import { daysOfWeekLabel } from "../lib/dayOfWeek";
import { useUndo } from "../lib/undoContext";
import { ConditionTypeSelect } from "./HotelDetailPage";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// Free-text policy lines on a quotation (payment terms, cancellation policy,
// documents required, etc.) tagged with a user-extensible type - the same
// "+ เพิ่มประเภทใหม่" catalog shared with Hotel Supplier conditions.
export function QuotationPoliciesSection({ quotationId, policies, onChange }) {
  const { scheduleAction } = useUndo();
  const [form, setForm] = useState({ conditionTypeId: "", content: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ conditionTypeId: "", content: "" });
  const [hiddenIds, setHiddenIds] = useState([]);

  async function addPolicy(e) {
    e.preventDefault();
    if (!form.conditionTypeId || !form.content.trim()) return;
    await api.post(`/quotations/${quotationId}/policies`, form);
    setForm({ conditionTypeId: "", content: "" });
    onChange();
  }

  async function saveEdit(policyId) {
    await api.put(`/quotations/policies/${policyId}`, editForm);
    setEditingId(null);
    onChange();
  }

  function removePolicy(policy) {
    setHiddenIds((prev) => [...prev, policy.id]);
    scheduleAction(`ลบนโยบาย "${policy.conditionType.label}" แล้ว`, {
      onConfirm: async () => {
        await api.delete(`/quotations/policies/${policy.id}`);
        onChange();
      },
      onUndo: () => setHiddenIds((prev) => prev.filter((id) => id !== policy.id)),
    });
  }

  const visiblePolicies = policies?.filter((p) => !hiddenIds.includes(p.id));

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {visiblePolicies?.map((p) =>
          editingId === p.id ? (
            <div key={p.id} className="border border-blue-200 bg-blue-50/40 rounded-lg p-2.5 space-y-1.5">
              <ConditionTypeSelect value={editForm.conditionTypeId} onChange={(id) => setEditForm({ ...editForm, conditionTypeId: id })} />
              <textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                className="w-full text-sm rounded border border-slate-300 px-2.5 py-1.5"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                  ยกเลิก
                </Button>
                <Button type="button" onClick={() => saveEdit(p.id)}>
                  บันทึก
                </Button>
              </div>
            </div>
          ) : (
            <div key={p.id} className="border border-slate-200 rounded-lg p-2.5 flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  {p.conditionType.label}
                </span>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{p.content}</p>
              </div>
              <div className="flex gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(p.id);
                    setEditForm({ conditionTypeId: p.conditionTypeId, content: p.content });
                  }}
                  className="text-blue-600"
                >
                  แก้ไข
                </button>
                <button type="button" onClick={() => removePolicy(p)} className="text-red-500">
                  ลบ
                </button>
              </div>
            </div>
          )
        )}
        {(!visiblePolicies || visiblePolicies.length === 0) && (
          <p className="text-sm text-slate-400">ยังไม่มีนโยบาย — เพิ่มได้ด้านล่าง เช่น เงื่อนไขการชำระเงิน, เงื่อนไขการยกเลิก, เอกสารที่ต้องเตรียม</p>
        )}
      </div>
      <form onSubmit={addPolicy} className="border border-dashed border-slate-300 rounded-lg p-2.5 space-y-1.5">
        <ConditionTypeSelect value={form.conditionTypeId} onChange={(id) => setForm({ ...form, conditionTypeId: id })} />
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="รายละเอียดนโยบาย"
          className="w-full text-sm rounded border border-slate-300 px-2.5 py-1.5"
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit">+ เพิ่มนโยบาย</Button>
        </div>
      </form>
    </div>
  );
}

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [tourSuppliers, setTourSuppliers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("customer");

  const [guideName, setGuideName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [contact, setContact] = useState(null);
  const [vat, setVat] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfLang, setPdfLang] = useState("th");
  const [pdfDetail, setPdfDetail] = useState("full");

  async function load() {
    const { data } = await api.get(`/quotations/${id}`);
    setQuote(data);
    setGuideName(data.guideName || "");
    setStartDate(data.startDate ? data.startDate.slice(0, 10) : "");
    setContact({
      customerEmail: data.customerEmail || "",
      customerPhone: data.customerPhone || "",
      customerAddress: data.customerAddress || "",
      customerLineId: data.customerLineId || "",
    });
    setVat({ includeVat: data.includeVat, vatRate: data.vatRate });
  }

  async function loadSuppliers() {
    const [h, t] = await Promise.all([api.get("/suppliers/hotels"), api.get("/suppliers/tours")]);
    setHotels(h.data);
    setTourSuppliers(t.data);
  }

  useEffect(() => {
    load();
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status) {
    await api.put(`/quotations/${id}`, { status });
    load();
  }

  async function pushToOdoo() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/quotations/${id}/odoo/push`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateDay(dayId, patch) {
    await api.put(`/quotations/days/${dayId}`, patch);
    load();
  }

  async function addDayItem(dayNumber) {
    await api.post(`/quotations/${id}/days/${dayNumber}/items`);
    load();
  }

  async function addDayTemplate(dayNumber) {
    await api.post(`/quotations/${id}/days/${dayNumber}/template`);
    load();
  }

  async function deleteDayItem(dayId) {
    await api.delete(`/quotations/day-items/${dayId}`);
    load();
  }

  async function saveGuide() {
    await api.put(`/quotations/${id}`, { guideName });
    load();
  }

  async function saveStartDate() {
    await api.put(`/quotations/${id}`, { startDate: startDate || null });
    load();
  }

  async function saveContact() {
    await api.put(`/quotations/${id}`, contact);
    load();
  }

  async function saveVat(patch) {
    const next = { ...vat, ...patch };
    setVat(next);
    await api.put(`/quotations/${id}`, next);
    load();
  }

  async function toggleFlight() {
    await api.put(`/quotations/${id}`, { includesFlight: !quote.includesFlight });
    load();
  }

  async function downloadPdf(lang = "th", detail = "full") {
    setDownloading(true);
    try {
      const token = localStorage.getItem("nt_token");
      const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await fetch(`${baseURL}/quotations/${id}/pdf?lang=${lang}&detail=${detail}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("สร้าง PDF ไม่สำเร็จ");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.quoteCode}${lang === "en" ? "-EN" : ""}${detail === "simple" ? "-Preliminary" : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setSendResult({ success: false, message: e.message });
    } finally {
      setDownloading(false);
    }
  }

  async function sendEmail() {
    setSending(true);
    setSendResult(null);
    try {
      const { data } = await api.post(`/quotations/${id}/send-email`, { lang: pdfLang, detail: pdfDetail });
      setSendResult({ success: true, message: `ส่งอีเมลไปที่ ${data.sentTo} แล้ว` });
    } catch (e) {
      setSendResult({ success: false, message: e.message });
    } finally {
      setSending(false);
    }
  }

  async function sendLine() {
    setSending(true);
    setSendResult(null);
    try {
      const { data } = await api.post(`/quotations/${id}/send-line`);
      setSendResult({ success: true, message: `ส่ง LINE ไปที่ ${data.sentTo} แล้ว` });
    } catch (e) {
      setSendResult({ success: false, message: e.message });
    } finally {
      setSending(false);
    }
  }

  if (!quote || !contact || !vat) {
    return <div className="text-slate-400 text-sm">กำลังโหลด…</div>;
  }

  const allActivities = tourSuppliers.flatMap((s) => s.activities.map((a) => ({ ...a, supplierName: s.name })));
  const roomOptions = hotels.flatMap((h) => h.roomTypes.map((rt) => ({ ...rt, hotelId: h.id, hotelName: h.name })));
  const totalCost = quote.itinerary.reduce((sum, d) => sum + Number(d.costPrice), 0);
  const totalSell = quote.itinerary.reduce((sum, d) => sum + Number(d.sellPrice), 0);
  const vatAmount = vat.includeVat ? totalSell * (Number(vat.vatRate) / 100) : 0;
  const grandTotal = totalSell + vatAmount;

  return (
    <div>
      <button
        onClick={() => navigate("/quotations")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft size={16} /> กลับไปหน้ารายการใบเสนอราคา
      </button>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: "var(--nt-primary)" }}
            >
              <FileText size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">{quote.customerName}</h2>
              <p className="text-xs text-slate-500">
                {quote.quoteCode} · {quote.days} วัน · ผู้ใหญ่ {quote.adults} · เด็ก {quote.children}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Select value={quote.status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(statusLabelTH).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            {quote.odooId ? <Badge tone="green">Synced #{quote.odooId}</Badge> : <Badge>Not synced</Badge>}
            <Select value={pdfDetail} onChange={(e) => setPdfDetail(e.target.value)} className="text-xs">
              <option value="full">PDF รายละเอียดครบ (หลังยืนยัน/ชำระเงิน)</option>
              <option value="simple">PDF เสนอราคาเบื้องต้น (ครั้งแรก)</option>
            </Select>
            <Select value={pdfLang} onChange={(e) => setPdfLang(e.target.value)} className="text-xs">
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </Select>
            <Button variant="secondary" onClick={() => downloadPdf(pdfLang, pdfDetail)} disabled={downloading}>
              <Download size={14} className="inline mr-1" /> ดาวน์โหลด PDF
            </Button>
            <Button variant="secondary" onClick={pushToOdoo} disabled={busy}>
              ⇅ Push to Odoo
            </Button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-500 block">ต้นทุนรวม (auto)</span>
            <span className="font-semibold">฿{totalCost.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-500 block">ราคารวม (Subtotal)</span>
            <span className="font-semibold">฿{totalSell.toLocaleString()}</span>
          </div>
          {vat.includeVat && (
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500 block">VAT {Number(vat.vatRate)}%</span>
              <span className="font-semibold">฿{vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="bg-[var(--nt-primary-light)] rounded-lg px-3 py-2">
            <span className="text-slate-500 block">ยอดรวมทั้งสิ้น</span>
            <span className="font-bold text-base" style={{ color: "var(--nt-primary)" }}>
              ฿{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: "customer", label: "ข้อมูลลูกค้า" },
            { id: "itinerary", label: "รายการเดินทาง" },
            { id: "policies", label: "นโยบายต่างๆ" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "customer" && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500">ข้อมูลติดต่อลูกค้า (ใช้ส่งใบเสนอราคา / ขึ้น PDF)</p>
              <Input
                label="ที่อยู่ลูกค้า"
                value={contact.customerAddress}
                onChange={(e) => setContact({ ...contact, customerAddress: e.target.value })}
                onBlur={saveContact}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="อีเมล"
                  value={contact.customerEmail}
                  onChange={(e) => setContact({ ...contact, customerEmail: e.target.value })}
                  onBlur={saveContact}
                />
                <Input
                  label="เบอร์โทร"
                  value={contact.customerPhone}
                  onChange={(e) => setContact({ ...contact, customerPhone: e.target.value })}
                  onBlur={saveContact}
                />
                <Input
                  label="LINE User ID"
                  value={contact.customerLineId}
                  onChange={(e) => setContact({ ...contact, customerLineId: e.target.value })}
                  onBlur={saveContact}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="secondary" onClick={sendEmail} disabled={sending || !contact.customerEmail}>
                  <Mail size={14} className="inline mr-1" /> ส่งอีเมล
                </Button>
                <Button variant="secondary" onClick={sendLine} disabled={sending || !contact.customerLineId}>
                  <MessageCircle size={14} className="inline mr-1" /> ส่ง LINE
                </Button>
                {sendResult && (
                  <span className={`text-xs ${sendResult.success ? "text-green-600" : "text-red-600"}`}>
                    {sendResult.success ? "✅ " : "❌ "}
                    {sendResult.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm items-end">
              <Input label="ไกด์ดูแล" value={guideName} onChange={(e) => setGuideName(e.target.value)} onBlur={saveGuide} />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={quote.includesFlight} onChange={toggleFlight} />
                รวมตั๋วเครื่องบิน
              </label>
            </div>

            <Input
              label="วันเริ่มทัวร์ (ไม่บังคับ — ใส่แล้วราคาห้องพักจะดึงตามฤดูกาลอัตโนมัติ)"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onBlur={saveStartDate}
            />

            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">ภาษีมูลค่าเพิ่ม (VAT) — ใส่หรือไม่ใส่ก็ได้ คำนวณให้อัตโนมัติ</p>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={vat.includeVat} onChange={(e) => saveVat({ includeVat: e.target.checked })} />
                  คิด VAT
                </label>
              </div>
              {vat.includeVat && (
                <Input
                  label="อัตรา VAT (%)"
                  type="number"
                  step="0.01"
                  className="max-w-[140px]"
                  value={vat.vatRate}
                  onChange={(e) => setVat({ ...vat, vatRate: e.target.value })}
                  onBlur={() => saveVat({ vatRate: vat.vatRate })}
                />
              )}
            </div>
          </div>
        )}

        {tab === "itinerary" && (
          <div className="space-y-4">
            {Array.from({ length: quote.days }, (_, i) => i + 1).map((dayNumber) => (
              <QuoteDayGroup
                key={dayNumber}
                dayNumber={dayNumber}
                items={quote.itinerary.filter((d) => d.dayNumber === dayNumber)}
                roomOptions={roomOptions}
                activities={allActivities}
                paxCount={Number(quote.adults || 0) + Number(quote.children || 0)}
                onUpdateItem={updateDay}
                onAddItem={() => addDayItem(dayNumber)}
                onAddTemplate={() => addDayTemplate(dayNumber)}
                onDeleteItem={deleteDayItem}
              />
            ))}
          </div>
        )}

        {tab === "policies" && <QuotationPoliciesSection quotationId={id} policies={quote.policies} onChange={load} />}
      </Card>
    </div>
  );
}

export function QuoteDayGroup({ dayNumber, items, roomOptions, activities, paxCount, onUpdateItem, onAddItem, onAddTemplate, onDeleteItem }) {
  const [expanded, setExpanded] = useState(dayNumber === 1);
  const dayCost = items.reduce((sum, d) => sum + Number(d.costPrice), 0);
  const daySell = items.reduce((sum, d) => sum + Number(d.sellPrice), 0);

  return (
    <div
      className={`rounded-lg overflow-hidden transition-colors ${expanded ? "border-2 shadow-sm" : "border border-slate-200"}`}
      style={expanded ? { borderColor: "var(--nt-primary)" } : undefined}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 ${expanded ? "border-b border-blue-100" : ""}`}
        style={expanded ? { backgroundColor: "var(--nt-primary-light)" } : { backgroundColor: "#f8fafc" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Day {dayNumber}
          {!expanded && items.length > 0 && <span className="font-normal text-slate-400">· {items.length} รายการ</span>}
        </span>
        <span className="text-xs font-medium text-slate-500">
          cost ฿{dayCost.toLocaleString()} · sell ฿{daySell.toLocaleString()}
          {paxCount > 0 && ` (฿${Math.round(daySell / paxCount).toLocaleString()}/pax)`}
        </span>
      </button>
      {expanded && (
        <div className="p-3">
          <div className="space-y-2">
            {items.map((item) => (
              <QuoteDayItemRow
                key={item.id}
                item={item}
                roomOptions={roomOptions}
                activities={activities}
                onUpdate={(patch) => onUpdateItem(item.id, patch)}
                onDelete={items.length > 1 ? () => onDeleteItem(item.id) : null}
              />
            ))}
            {items.length === 0 && <p className="text-xs text-slate-400">ยังไม่มีรายการในวันนี้</p>}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={onAddItem} className="text-xs font-medium" style={{ color: "var(--nt-primary)" }}>
              + เพิ่มรายการ
            </button>
            <button onClick={onAddTemplate} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              + เพิ่มรายการมาตรฐาน (Van/Boat/Guide/Hotel/National Park)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuoteDayItemRow({ item, roomOptions, activities, onUpdate, onDelete }) {
  const { scheduleAction } = useUndo();
  const [pendingDelete, setPendingDelete] = useState(false);
  const [place, setPlace] = useState(item.place || "");
  const [sellPrice, setSellPrice] = useState(item.sellPrice || 0);
  const [manualCost, setManualCost] = useState(item.costPrice || 0);
  const [mode, setMode] = useState(item.roomTypeId || item.tourActivityId ? "supplier" : "manual");
  const [seasonPriceId, setSeasonPriceId] = useState("");
  const [supplierId, setSupplierId] = useState(() => {
    if (item.roomTypeId) return roomOptions.find((r) => r.id === item.roomTypeId)?.hotelId || "";
    if (item.tourActivityId) return activities.find((a) => a.id === item.tourActivityId)?.supplierId || "";
    return "";
  });

  function handleCategory(category) {
    setSupplierId("");
    onUpdate({ place, category, sellPrice, roomTypeId: null, tourActivityId: null });
  }
  function handleRoomType(roomTypeId) {
    const rt = roomOptions.find((r) => r.id === roomTypeId);
    const newPlace = rt ? rt.name : place;
    setPlace(newPlace);
    setSeasonPriceId("");
    onUpdate({ place: newPlace, category: "Hotels", roomTypeId, sellPrice, tourActivityId: null });
  }
  function handleSeasonPrice(id) {
    setSeasonPriceId(id);
    onUpdate({ place, category: "Hotels", roomTypeId: item.roomTypeId, sellPrice, tourActivityId: null, seasonPriceId: id });
  }
  function handleActivity(tourActivityId) {
    const activity = activities.find((a) => a.id === tourActivityId);
    const newPlace = activity ? activity.name : place;
    setPlace(newPlace);
    onUpdate({ place: newPlace, category: item.category === "Activities" ? "Activities" : "Tour", tourActivityId, sellPrice, roomTypeId: null });
  }

  function switchToManual() {
    setMode("manual");
    onUpdate({ place, roomTypeId: null, tourActivityId: null, costPrice: manualCost, sellPrice });
  }

  function switchToSupplier() {
    setMode("supplier");
  }

  function handleDelete() {
    setPendingDelete(true);
    scheduleAction(`ลบ "${item.place || "รายการ"}" แล้ว`, {
      onConfirm: () => onDelete(),
      onUndo: () => setPendingDelete(false),
    });
  }

  if (pendingDelete) return null;

  if (mode === "manual") {
    return (
      <div className="bg-slate-50 rounded-lg p-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 bg-transparent focus:outline-none focus:border-blue-500"
            placeholder="รายการ เช่น Van transfer, Guide"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onBlur={() => onUpdate({ place, costPrice: manualCost, sellPrice })}
          />
          <label className="text-[10px] text-slate-400 shrink-0">cost</label>
          <input
            type="number"
            className="w-20 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 text-right bg-transparent focus:outline-none focus:border-blue-500"
            value={manualCost}
            onChange={(e) => setManualCost(e.target.value)}
            onBlur={() => onUpdate({ place, costPrice: manualCost, sellPrice })}
          />
          <label className="text-[10px] text-slate-400 shrink-0">sell</label>
          <input
            type="number"
            className="w-20 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 text-right bg-transparent focus:outline-none focus:border-blue-500"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            onBlur={() => onUpdate({ place, costPrice: manualCost, sellPrice })}
          />
          {onDelete && (
            <button onClick={handleDelete} className="text-red-500 text-xs shrink-0">
              ลบ
            </button>
          )}
        </div>
        <button onClick={switchToSupplier} className="text-xs" style={{ color: "var(--nt-primary)" }}>
          เลือกจาก Supplier แทน
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 bg-transparent focus:outline-none focus:border-blue-500"
          placeholder="สถานที่ / กิจกรรม"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          onBlur={() => onUpdate({ place, sellPrice })}
        />
        <span className="text-xs text-slate-500 shrink-0">cost ฿{Number(item.costPrice).toLocaleString()}</span>
        <input
          type="number"
          className="w-24 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 text-right bg-transparent focus:outline-none focus:border-blue-500"
          placeholder="ราคาขาย"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          onBlur={() => onUpdate({ place, sellPrice })}
        />
        {onDelete && (
          <button onClick={handleDelete} className="text-red-500 text-xs shrink-0">
            ลบ
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Select value={item.category} onChange={(e) => handleCategory(e.target.value)}>
          <option value="Hotels">Hotels</option>
          <option value="Tour">Tour</option>
          <option value="Activities">Activities</option>
          <option value="Place">Place</option>
        </Select>
        {item.category === "Hotels" ? (
          <>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">-- เลือกโรงแรม --</option>
              {[...new Map(roomOptions.map((rt) => [rt.hotelId, rt.hotelName])).entries()]
                .sort((a, b) => a[1].localeCompare(b[1], "th"))
                .map(([hId, hName]) => (
                  <option key={hId} value={hId}>
                    {hName}
                  </option>
                ))}
            </Select>
            <Select className="col-span-2" value={item.roomTypeId || ""} onChange={(e) => handleRoomType(e.target.value)} disabled={!supplierId}>
              <option value="">-- เลือกห้องพัก --</option>
              {roomOptions
                .filter((rt) => rt.hotelId === supplierId)
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "th"))
                .map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
            </Select>
            {(() => {
              const rt = roomOptions.find((r) => r.id === item.roomTypeId);
              if (!rt || !rt.seasonPrices?.length) return null;
              return (
                <Select className="col-span-4 mt-1.5" value={seasonPriceId} onChange={(e) => handleSeasonPrice(e.target.value)}>
                  <option value="">ราคาปกติ · ฿{Number(rt.costPrice).toLocaleString()}</option>
                  {rt.seasonPrices.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {new Date(sp.dateFrom).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}–
                      {new Date(sp.dateTo).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      {daysOfWeekLabel(sp.daysOfWeek) ? ` (${daysOfWeekLabel(sp.daysOfWeek)})` : ""} · ฿
                      {Number(sp.price).toLocaleString()}
                    </option>
                  ))}
                </Select>
              );
            })()}
          </>
        ) : (
          <>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">-- เลือก Supplier --</option>
              {[
                ...new Map(activities.filter((a) => a.category === item.category).map((a) => [a.supplierId, a.supplierName])).entries(),
              ]
                .sort((a, b) => a[1].localeCompare(b[1], "th"))
                .map(([sId, sName]) => (
                  <option key={sId} value={sId}>
                    {sName}
                  </option>
                ))}
            </Select>
            <Select
              className="col-span-2"
              value={item.tourActivityId || ""}
              onChange={(e) => handleActivity(e.target.value)}
              disabled={!supplierId}
            >
              <option value="">-- เลือกรายการ --</option>
              {activities
                .filter((a) => a.category === item.category && a.supplierId === supplierId)
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "th"))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </>
        )}
      </div>
      <button onClick={switchToManual} className="text-xs text-slate-500 hover:text-slate-700">
        กรอกเองแทน
      </button>
    </div>
  );
}
