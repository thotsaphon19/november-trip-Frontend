import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Badge, Select, PageHeader, Pagination, usePagination } from "../components/ui";
import { Compass, ArrowLeft } from "lucide-react";
import { DayGroup } from "./ProductDetailPage";
import { useUndo } from "../lib/undoContext";

const emptyProduct = { tourCode: "", tourName: "", price: "", days: 3, adults: 2, children: 0, startDate: "", supplierType: "", supplierId: "" };

export default function Products() {
  const { scheduleAction } = useUndo();
  const [products, setProducts] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tourSuppliers, setTourSuppliers] = useState([]);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { page, setPage, totalPages, total, pageItems, rangeStart, rangeEnd } = usePagination(products, 50);

  // --- Inline "add new tour" panel state -------------------------------------
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [draftProduct, setDraftProduct] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(query = q) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const { data } = await api.get(`/products?${params.toString()}`);
    setProducts(data);
  }

  async function loadSuppliers() {
    const [h, t] = await Promise.all([api.get("/suppliers/hotels"), api.get("/suppliers/tours")]);
    setHotels(h.data);
    setTourSuppliers(t.data);
  }

  useEffect(() => {
    load(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function openAddPanel() {
    setForm(emptyProduct);
    setDraftProduct(null);
    setError("");
    setAdding(true);
  }

  function closeAddPanel() {
    setAdding(false);
    setDraftProduct(null);
    load();
  }

  async function reloadDraft() {
    if (!draftProduct) return;
    const { data } = await api.get(`/products/${draftProduct.id}`);
    setDraftProduct(data);
  }

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!draftProduct) {
        const { data } = await api.post("/products", form);
        setDraftProduct(data);
        await load();
      } else {
        await api.put(`/products/${draftProduct.id}`, form);
        await reloadDraft();
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function deleteProduct(id) {
    const p = products.find((x) => x.id === id);
    setProducts((prev) => prev.filter((x) => x.id !== id));
    scheduleAction(`ลบ "${p?.tourName}" แล้ว`, {
      onConfirm: () => api.delete(`/products/${id}`),
      onUndo: () => load(),
    });
  }

  async function updateDay(dayId, patch) {
    await api.put(`/products/days/${dayId}`, patch);
    reloadDraft();
  }

  async function addDayItem(dayNumber) {
    await api.post(`/products/${draftProduct.id}/days/${dayNumber}/items`);
    reloadDraft();
  }

  async function addDayTemplate(dayNumber) {
    await api.post(`/products/${draftProduct.id}/days/${dayNumber}/template`);
    reloadDraft();
  }

  async function deleteDayItem(dayId) {
    await api.delete(`/products/day-items/${dayId}`);
    reloadDraft();
  }

  const allActivities = tourSuppliers.flatMap((s) => s.activities.map((a) => ({ ...a, supplierName: s.name })));
  const itineraryByDay = {};
  if (draftProduct) {
    draftProduct.itinerary.forEach((day) => {
      (itineraryByDay[day.dayNumber] ||= []).push(day);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <PageHeader icon={Compass} title="Product — สร้างทัวร์" subtitle="กำหนดจำนวนวัน แล้วเลือกสถานที่/ซัพพลายเออร์ในแต่ละวัน ราคาต้นทุนคำนวณอัตโนมัติ" />
        {!adding && <Button onClick={openAddPanel}>+ สร้างทัวร์ใหม่</Button>}
      </div>

      {adding && (
        <Card className="p-5 space-y-4 mb-5">
          <div className="flex items-center justify-between">
            <button onClick={closeAddPanel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft size={16} /> กลับไปหน้ารายการ
            </button>
            <h3 className="font-semibold text-slate-800">
              {draftProduct ? `แก้ไข/เพิ่มข้อมูล: ${draftProduct.tourName}` : "สร้างทัวร์ใหม่"}
            </h3>
            {draftProduct ? <Button onClick={closeAddPanel}>เสร็จสิ้น</Button> : <span className="w-[88px]" />}
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <form onSubmit={saveDetails} className="space-y-3 max-w-2xl border border-slate-200 rounded-lg p-4">
            <Input label="รหัสทัวร์" required value={form.tourCode} onChange={(e) => setForm({ ...form, tourCode: e.target.value })} />
            <Input label="ชื่อทัวร์" required value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })} />
            <Input label="ราคา" type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
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
                  {hotels
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "th"))
                    .map((h) => (
                      <option key={h.id} value={`Hotel:${h.id}`}>
                        {h.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Tour">
                  {tourSuppliers
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "th"))
                    .map((t) => (
                      <option key={t.id} value={`Tour:${t.id}`}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              </Select>
              <div />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="จำนวนวัน"
                type="number"
                min={1}
                required
                value={form.days}
                onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
                disabled={!!draftProduct}
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
            {draftProduct && <p className="text-xs text-slate-400">เปลี่ยนจำนวนวันได้จากการเพิ่ม/ลบวันในตารางด้านล่างโดยตรง</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {draftProduct ? "บันทึกข้อมูล" : "สร้างทัวร์ แล้วไปจัดรายการแต่ละวัน"}
              </Button>
            </div>
          </form>

          {draftProduct && (
            <>
              <div className="text-sm bg-slate-50 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-slate-500">ต้นทุนรวมทั้งหมด (auto)</span>
                <span className="font-semibold">
                  ฿{draftProduct.itinerary.reduce((sum, d) => sum + Number(d.costPrice), 0).toLocaleString()}
                </span>
              </div>

              <div className="space-y-4">
                {Array.from({ length: draftProduct.days }, (_, i) => i + 1).map((dayNumber) => (
                  <DayGroup
                    key={dayNumber}
                    dayNumber={dayNumber}
                    items={itineraryByDay[dayNumber] || []}
                    hotels={hotels}
                    activities={allActivities}
                    paxCount={Number(draftProduct.adults || 0) + Number(draftProduct.children || 0)}
                    onUpdateItem={updateDay}
                    onAddItem={() => addDayItem(dayNumber)}
                    onAddTemplate={() => addDayTemplate(dayNumber)}
                    onDeleteItem={deleteDayItem}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {!adding && (
        <>
          <Input
            placeholder="ค้นหารหัสทัวร์ / ชื่อทัวร์ / supplier"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs mb-3"
          />

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">รูปภาพ</th>
                    <th className="text-left px-4 py-2">รหัสทัวร์</th>
                    <th className="text-left px-4 py-2">ชื่อทัวร์</th>
                    <th className="text-left px-4 py-2">จำนวนวัน</th>
                    <th className="text-right px-4 py-2">ราคา</th>
                    <th className="text-left px-4 py-2">Supplier</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p) => {
                    const thumbUrl = p.hotelSupplier?.logoUrl || p.hotelSupplier?.images?.[0]?.url;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="border-t border-slate-100 cursor-pointer hover:bg-blue-50"
                      >
                        <td className="px-4 py-2">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                              <Compass size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{p.tourCode}</td>
                        <td className="px-4 py-2">{p.tourName}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{p.days} วัน</td>
                        <td className="px-4 py-2 text-right font-medium">฿{Number(p.price).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {p.hotelSupplier?.name || p.tourSupplier?.name || "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProduct(p.id);
                            }}
                          >
                            ลบ
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        ยังไม่มีทัวร์
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} rangeStart={rangeStart} rangeEnd={rangeEnd} onPageChange={setPage} />
          </Card>
        </>
      )}
    </div>
  );
}
