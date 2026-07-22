import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Modal, Badge, Select } from "../components/ui";
import { ArrowLeft, Compass, ChevronDown, ChevronRight } from "lucide-react";
import { daysOfWeekLabel } from "../lib/dayOfWeek";
import { useUndo } from "../lib/undoContext";

const MONTHS_TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [tourSuppliers, setTourSuppliers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  async function load() {
    const { data } = await api.get(`/products/${id}`);
    setProduct(data);
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

  function productToForm(p) {
    return {
      tourCode: p.tourCode,
      tourName: p.tourName,
      price: p.price,
      adults: p.adults,
      children: p.children,
      startDate: p.startDate ? p.startDate.slice(0, 10) : "",
      supplierType: p.supplierType || "",
      supplierId: p.hotelSupplierId || p.tourSupplierId || "",
    };
  }

  function openEdit() {
    setForm(productToForm(product));
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    await api.put(`/products/${id}`, form);
    setEditing(false);
    load();
  }

  async function pushToOdoo() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/products/${id}/odoo/push`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateDay(dayId, patch) {
    await api.put(`/products/days/${dayId}`, patch);
    load();
  }

  async function addDayItem(dayNumber) {
    await api.post(`/products/${id}/days/${dayNumber}/items`);
    load();
  }

  async function addDayTemplate(dayNumber) {
    await api.post(`/products/${id}/days/${dayNumber}/template`);
    load();
  }

  async function deleteDayItem(dayId) {
    await api.delete(`/products/day-items/${dayId}`);
    load();
  }

  if (!product) {
    return <div className="text-slate-400 text-sm">กำลังโหลด…</div>;
  }

  const allActivities = tourSuppliers.flatMap((s) => s.activities.map((a) => ({ ...a, supplierName: s.name })));
  const totalCost = product.itinerary.reduce((sum, d) => sum + Number(d.costPrice), 0);
  const itineraryByDay = {};
  product.itinerary.forEach((day) => {
    (itineraryByDay[day.dayNumber] ||= []).push(day);
  });

  return (
    <div>
      <button
        onClick={() => navigate("/products")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft size={16} /> กลับไปหน้ารายการทัวร์
      </button>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: "var(--nt-primary)" }}
            >
              <Compass size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">
                {product.tourName} <span className="text-slate-400 font-normal text-sm">({product.tourCode})</span>
              </h2>
              <p className="text-xs text-slate-500">
                {product.days} วัน · ผู้ใหญ่ {product.adults} · เด็ก {product.children} · ราคาขาย ฿{Number(product.price).toLocaleString()}
                {(product.hotelSupplier || product.tourSupplier) && (
                  <> · Supplier: {product.hotelSupplier?.name || product.tourSupplier?.name}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {product.odooId ? <Badge tone="green">Synced #{product.odooId}</Badge> : <Badge>Not synced</Badge>}
            <Button variant="secondary" onClick={openEdit}>
              แก้ไขข้อมูล
            </Button>
            <Button variant="secondary" onClick={pushToOdoo} disabled={busy}>
              ⇅ Push to Odoo
            </Button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <Modal open={editing} onClose={() => setEditing(false)} title="แก้ไขข้อมูลทัวร์">
          {form && (
            <form onSubmit={saveEdit} className="space-y-3">
              <Input label="รหัสทัวร์" required value={form.tourCode} onChange={(e) => setForm({ ...form, tourCode: e.target.value })} />
              <Input label="ชื่อทัวร์" required value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })} />
              <Input label="ราคา" type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Select
                label="Supplier"
                value={form.supplierType ? `${form.supplierType}:${form.supplierId}` : ""}
                onChange={(e) => {
                  const [supplierType, supplierId] = e.target.value.split(":");
                  setForm({ ...form, supplierType: supplierType || "", supplierId: supplierId || "" });
                }}
              >
                <option value="">-- ไม่ระบุ --</option>
                <optgroup label="Hotels">
                  {hotels.map((h) => (
                    <option key={h.id} value={`Hotel:${h.id}`}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tour">
                  {tourSuppliers.map((t) => (
                    <option key={t.id} value={`Tour:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="ผู้ใหญ่" type="number" min={0} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} />
                <Input label="เด็ก" type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} />
              </div>
              <Input
                label="วันเริ่มทัวร์ (ไม่บังคับ — ใส่แล้วราคาห้องพักจะดึงตามฤดูกาลอัตโนมัติ)"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <p className="text-xs text-slate-400">เปลี่ยนจำนวนวันได้จากการเพิ่ม/ลบวันในตารางด้านล่างโดยตรง</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          )}
        </Modal>

        <div className="text-sm bg-slate-50 rounded-lg px-3 py-2 flex justify-between">
          <span className="text-slate-500">ต้นทุนรวมทั้งหมด (auto)</span>
          <span className="font-semibold">฿{totalCost.toLocaleString()}</span>
        </div>

        <div className="space-y-4">
          {Array.from({ length: product.days }, (_, i) => i + 1).map((dayNumber) => (
            <DayGroup
              key={dayNumber}
              dayNumber={dayNumber}
              items={itineraryByDay[dayNumber] || []}
              hotels={hotels}
              activities={allActivities}
              paxCount={Number(product.adults || 0) + Number(product.children || 0)}
              onUpdateItem={updateDay}
              onAddItem={() => addDayItem(dayNumber)}
              onAddTemplate={() => addDayTemplate(dayNumber)}
              onDeleteItem={deleteDayItem}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function DayGroup({ dayNumber, items, hotels, activities, paxCount, onUpdateItem, onAddItem, onAddTemplate, onDeleteItem }) {
  const [expanded, setExpanded] = useState(dayNumber === 1);
  const dayTotal = items.reduce((sum, d) => sum + Number(d.costPrice), 0);

  return (
    <div
      className={`rounded-lg overflow-hidden transition-colors ${
        expanded ? "border-2 shadow-sm" : "border border-slate-200"
      }`}
      style={expanded ? { borderColor: "var(--nt-primary)" } : undefined}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 border-b ${
          expanded ? "border-blue-100" : "border-slate-200"
        }`}
        style={expanded ? { backgroundColor: "var(--nt-primary-light)" } : { backgroundColor: "#f8fafc" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Day {dayNumber}
          {!expanded && items.length > 0 && (
            <span className="font-normal text-slate-400">· {items.length} รายการ</span>
          )}
        </span>
        <span className="text-xs font-medium text-slate-500">
          รวม ฿{dayTotal.toLocaleString()}
          {paxCount > 0 && ` (฿${Math.round(dayTotal / paxCount).toLocaleString()}/pax)`}
        </span>
      </button>
      {expanded && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">รายการ</th>
                  <th className="text-left px-3 py-2 w-32">หมวดหมู่</th>
                  <th className="text-right px-3 py-2 w-28">ราคา</th>
                  <th className="px-3 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <DayItemRow
                    key={item.id}
                    item={item}
                    hotels={hotels}
                    activities={activities}
                    onUpdate={(patch) => onUpdateItem(item.id, patch)}
                    onDelete={items.length > 1 ? () => onDeleteItem(item.id) : null}
                  />
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-xs">
                      ยังไม่มีรายการในวันนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 border-t border-slate-100">
            <button onClick={onAddItem} className="text-xs font-medium" style={{ color: "var(--nt-primary)" }}>
              + เพิ่มรายการ
            </button>
            <button onClick={onAddTemplate} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              + เพิ่มรายการมาตรฐาน (Van/Boat/Guide/Hotel/National Park)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DayItemRow({ item, hotels, activities, onUpdate, onDelete }) {
  const { scheduleAction } = useUndo();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [seasonPriceId, setSeasonPriceId] = useState("");
  const [place, setPlace] = useState(item.place || "");
  const [manualCost, setManualCost] = useState(item.costPrice || 0);
  const [mode, setMode] = useState(item.roomTypeId || item.tourActivityId ? "supplier" : "manual");
  const roomOptions = hotels.flatMap((h) => h.roomTypes.map((rt) => ({ ...rt, hotelId: h.id, hotelName: h.name })));
  const [supplierId, setSupplierId] = useState(() => {
    if (item.roomTypeId) return roomOptions.find((r) => r.id === item.roomTypeId)?.hotelId || "";
    if (item.tourActivityId) return activities.find((a) => a.id === item.tourActivityId)?.supplierId || "";
    return "";
  });

  function handleCategory(category) {
    setSupplierId("");
    onUpdate({ place, category, roomTypeId: null, tourActivityId: null, hotelSupplierIdRef: null });
  }

  function handleRoomType(roomTypeId) {
    const rt = roomOptions.find((r) => r.id === roomTypeId);
    const newPlace = rt ? rt.name : place;
    setPlace(newPlace);
    setSeasonPriceId("");
    onUpdate({ place: newPlace, category: "Hotels", roomTypeId, hotelSupplierIdRef: rt?.hotelId, tourActivityId: null });
  }

  function handleSeasonPrice(id) {
    setSeasonPriceId(id);
    onUpdate({ place, category: "Hotels", roomTypeId: item.roomTypeId, hotelSupplierIdRef: item.hotelSupplierIdRef, tourActivityId: null, seasonPriceId: id });
  }

  function handleActivity(tourActivityId) {
    const activity = activities.find((a) => a.id === tourActivityId);
    const newPlace = activity ? activity.name : place;
    setPlace(newPlace);
    onUpdate({ place: newPlace, category: item.category === "Activities" ? "Activities" : "Tour", tourActivityId, roomTypeId: null, hotelSupplierIdRef: null });
  }

  function switchToManual() {
    setMode("manual");
    onUpdate({ place, roomTypeId: null, tourActivityId: null, hotelSupplierIdRef: null, costPrice: manualCost });
  }

  function switchToSupplier() {
    setMode("supplier");
  }

  if (pendingDelete) return null;

  return (
    <>
      <tr
        onClick={() => setEditing((v) => !v)}
        className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50/60 ${editing ? "bg-blue-50/60" : ""}`}
      >
        <td className="px-3 py-2">{item.place || <span className="text-slate-400">ยังไม่ระบุ</span>}</td>
        <td className="px-3 py-2 text-xs text-slate-500">{item.category || "—"}</td>
        <td className="px-3 py-2 text-right text-slate-500">฿{Number(item.costPrice).toLocaleString()}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing((v) => !v);
            }}
            className="text-blue-600 text-xs mr-2"
          >
            {editing ? "ปิด" : "แก้ไข"}
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPendingDelete(true);
                scheduleAction(`ลบ "${item.place || "รายการ"}" แล้ว`, {
                  onConfirm: () => onDelete(),
                  onUndo: () => setPendingDelete(false),
                });
              }}
              className="text-red-500 text-xs"
            >
              ลบ
            </button>
          )}
        </td>
      </tr>
      {editing && (
        <tr className="bg-blue-50/40">
          <td colSpan={4} className="px-3 pb-3 pt-1">
            <div onClick={(e) => e.stopPropagation()} className="border border-blue-200 bg-white rounded-lg p-2.5 space-y-2">
              {mode === "manual" ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 bg-transparent focus:outline-none focus:border-blue-500"
                      placeholder="รายการ เช่น Van transfer, Guide"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      onBlur={() => onUpdate({ place, costPrice: manualCost })}
                    />
                    <input
                      type="number"
                      className="w-24 border-b border-dashed border-slate-300 text-sm px-1 py-0.5 text-right bg-transparent focus:outline-none focus:border-blue-500"
                      placeholder="ราคา"
                      value={manualCost}
                      onChange={(e) => setManualCost(e.target.value)}
                      onBlur={() => onUpdate({ place, costPrice: manualCost })}
                    />
                  </div>
                  <button onClick={switchToSupplier} className="text-xs" style={{ color: "var(--nt-primary)" }}>
                    เลือกจาก Supplier แทน
                  </button>
                </>
              ) : (
                <>
                  <input
                    className="w-full border-b border-dashed border-slate-300 text-sm px-1 py-0.5 bg-transparent focus:outline-none focus:border-blue-500"
                    placeholder="สถานที่ / กิจกรรม"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    onBlur={() => onUpdate({ place })}
                  />
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
                        <Select
                          className="col-span-2"
                          value={item.roomTypeId || ""}
                          onChange={(e) => handleRoomType(e.target.value)}
                          disabled={!supplierId}
                        >
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
                            <Select
                              className="col-span-4 mt-1.5"
                              value={seasonPriceId}
                              onChange={(e) => handleSeasonPrice(e.target.value)}
                            >
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
                            ...new Map(
                              activities.filter((a) => a.category === item.category).map((a) => [a.supplierId, a.supplierName])
                            ).entries(),
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
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
