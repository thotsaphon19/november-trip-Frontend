import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Badge, Select, PageHeader, Pagination, usePagination, Tabs, ImageUploader, AttachmentList } from "../components/ui";
import { Ticket, ArrowLeft } from "lucide-react";
import { ActivityRow } from "./TourSupplierDetailPage";
import { THAI_PROVINCES } from "../lib/provinces";
import { useUndo } from "../lib/undoContext";

const emptySupplier = {
  supplierCode: "",
  name: "",
  phone: "",
  phoneSales: "",
  email: "",
  line: "",
  whatsapp: "",
  province: "",
  contractStart: "",
  contractEnd: "",
};

const emptyActivityForm = {
  name: "",
  activityCode: "",
  category: "Tour",
  imageUrl: "",
  costPrice: "",
  sellPrice: "",
  childCostPrice: "",
  childSellPrice: "",
  conditions: "",
};

function activityPriceRange(activities) {
  if (!activities || activities.length === 0) return null;
  const prices = activities.map((a) => Number(a.sellPrice));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `฿${min.toLocaleString()}` : `฿${min.toLocaleString()} - ฿${max.toLocaleString()}`;
}

const ADD_TABS = [
  { id: "details", label: "รายละเอียด" },
  { id: "products", label: "สินค้า/กิจกรรม" },
  { id: "files", label: "ไฟล์แนบ" },
];

export default function TourSuppliers() {
  const { scheduleAction } = useUndo();
  const [suppliers, setSuppliers] = useState([]);
  const [q, setQ] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const navigate = useNavigate();
  const { page, setPage, totalPages, total, pageItems, rangeStart, rangeEnd } = usePagination(suppliers, 50);

  // --- Inline "add new supplier" panel state ---------------------------------
  const [adding, setAdding] = useState(false);
  const [addTab, setAddTab] = useState("details");
  const [form, setForm] = useState(emptySupplier);
  const [draftSupplier, setDraftSupplier] = useState(null);
  const [activityForm, setActivityForm] = useState(emptyActivityForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(query = q, province = provinceFilter) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (province) params.set("province", province);
    const { data } = await api.get(`/suppliers/tours?${params.toString()}`);
    setSuppliers(data);
  }

  useEffect(() => {
    load(q, provinceFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, provinceFilter]);

  async function suggestNextActivityCode() {
    try {
      const { data } = await api.get("/suppliers/tours/activities/next-code");
      setActivityForm((f) => ({ ...f, activityCode: data.code }));
    } catch {
      /* auto-code is a convenience only */
    }
  }

  async function openAddPanel() {
    setForm(emptySupplier);
    setDraftSupplier(null);
    setActivityForm(emptyActivityForm);
    setAddTab("details");
    setError("");
    setAdding(true);
    try {
      const { data } = await api.get("/suppliers/tours/next-code");
      setForm((f) => ({ ...f, supplierCode: data.code }));
    } catch {
      /* auto-code is a convenience only */
    }
  }

  function closeAddPanel() {
    setAdding(false);
    setDraftSupplier(null);
    load();
  }

  async function reloadDraft() {
    if (!draftSupplier) return;
    const { data } = await api.get(`/suppliers/tours/${draftSupplier.id}`);
    setDraftSupplier(data);
  }

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!draftSupplier) {
        const { data } = await api.post("/suppliers/tours", form);
        setDraftSupplier(data);
        await load();
        await suggestNextActivityCode();
        setAddTab("products");
      } else {
        await api.put(`/suppliers/tours/${draftSupplier.id}`, form);
        await reloadDraft();
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function deleteSupplier(id) {
    const supplier = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    scheduleAction(`ลบ "${supplier?.name}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/tours/${id}`),
      onUndo: () => load(),
    });
  }

  async function addActivity(e) {
    e.preventDefault();
    await api.post(`/suppliers/tours/${draftSupplier.id}/activities`, activityForm);
    setActivityForm(emptyActivityForm);
    await suggestNextActivityCode();
    reloadDraft();
  }

  function removeActivity(activityId) {
    const activity = draftSupplier.activities?.find((a) => a.id === activityId);
    setDraftSupplier((prev) => ({ ...prev, activities: prev.activities.filter((a) => a.id !== activityId) }));
    scheduleAction(`ลบ "${activity?.name}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/tours/activities/${activityId}`),
      onUndo: () => reloadDraft(),
    });
  }

  function goToTab(tabId) {
    if (tabId !== "details" && !draftSupplier) {
      setError("กรุณาบันทึกข้อมูล Supplier (แท็บ รายละเอียด) ก่อน แล้วแท็บอื่นจะเปิดให้กรอกได้");
      return;
    }
    setError("");
    setAddTab(tabId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <PageHeader icon={Ticket} title="Supplier: Tour" subtitle="ผู้ให้บริการทัวร์และกิจกรรม พร้อมราคา cost/sell" />
        {!adding && <Button onClick={openAddPanel}>+ เพิ่ม Supplier</Button>}
      </div>

      {adding && (
        <Card className="overflow-hidden mb-5">
          <div className="flex items-center justify-between p-5 pb-4">
            <button onClick={closeAddPanel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft size={16} /> กลับไปหน้ารายการ
            </button>
            <h3 className="font-semibold text-slate-800">
              {draftSupplier ? `แก้ไข/เพิ่มข้อมูล: ${draftSupplier.name}` : "เพิ่ม Tour Supplier ใหม่"}
            </h3>
            {draftSupplier ? <Button onClick={closeAddPanel}>เสร็จสิ้น</Button> : <span className="w-[88px]" />}
          </div>

          {error && <div className="text-red-600 text-sm px-5 pb-3">{error}</div>}

          <Tabs tabs={ADD_TABS} active={addTab} onChange={goToTab} />

          <div className="p-5">
            {addTab === "details" && (
              <form onSubmit={saveDetails} className="space-y-3 max-w-2xl">
                <Input label="รหัส Supplier (สร้างให้อัตโนมัติ แก้ไขได้)" required value={form.supplierCode} onChange={(e) => setForm({ ...form, supplierCode: e.target.value })} />
                <Input label="ชื่อ Supplier" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="เบอร์ส่วนกลาง" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input label="เบอร์เซลล์" value={form.phoneSales} onChange={(e) => setForm({ ...form, phoneSales: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="อีเมล" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <Input label="Line" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} />
                </div>
                <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                <Select label="จังหวัด" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                  <option value="">-- เลือกจังหวัด --</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="วันเริ่มสัญญา" type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
                  <Input label="วันสิ้นสุดสัญญา" type="date" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="submit" disabled={busy}>
                    {draftSupplier ? "บันทึกข้อมูล" : "สร้าง Supplier แล้วไปกรอกแท็บถัดไป"}
                  </Button>
                </div>
              </form>
            )}

            {addTab === "products" && draftSupplier && (
              <div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg mb-3">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="text-left px-3 py-2">รูปภาพ</th>
                        <th className="text-left px-3 py-2">ชื่อสินค้า/กิจกรรม</th>
                        <th className="text-left px-3 py-2">รหัส</th>
                        <th className="text-left px-3 py-2">หมวด</th>
                        <th className="text-right px-3 py-2">Cost ผู้ใหญ่</th>
                        <th className="text-right px-3 py-2">Sell ผู้ใหญ่</th>
                        <th className="text-left px-3 py-2">Sync</th>
                        <th className="px-3 py-2 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftSupplier.activities?.map((a) => (
                        <ActivityRow key={a.id} activity={a} onRemove={() => removeActivity(a.id)} onChange={reloadDraft} />
                      ))}
                      {draftSupplier.activities?.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                            ยังไม่มีสินค้า/กิจกรรม
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <form onSubmit={addActivity} className="space-y-2 border border-dashed border-slate-300 rounded-lg p-3">
                  <ImageUploader label="รูปภาพ" value={activityForm.imageUrl} onUploaded={(url) => setActivityForm({ ...activityForm, imageUrl: url })} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                    <Input label="ชื่อกิจกรรม" className="col-span-2" value={activityForm.name} onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })} required />
                    <Input label="รหัสสินค้า (สร้างให้อัตโนมัติ)" value={activityForm.activityCode} onChange={(e) => setActivityForm({ ...activityForm, activityCode: e.target.value })} />
                    <Select label="หมวด" value={activityForm.category} onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}>
                      <option value="Tour">Tour</option>
                      <option value="Activities">Activities</option>
                      <option value="Place">Place</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input label="Cost ผู้ใหญ่" type="number" value={activityForm.costPrice} onChange={(e) => setActivityForm({ ...activityForm, costPrice: e.target.value })} required />
                    <Input label="Sell ผู้ใหญ่" type="number" value={activityForm.sellPrice} onChange={(e) => setActivityForm({ ...activityForm, sellPrice: e.target.value })} required />
                    <Input label="Cost เด็ก" type="number" value={activityForm.childCostPrice} onChange={(e) => setActivityForm({ ...activityForm, childCostPrice: e.target.value })} />
                    <Input label="Sell เด็ก" type="number" value={activityForm.childSellPrice} onChange={(e) => setActivityForm({ ...activityForm, childSellPrice: e.target.value })} />
                  </div>
                  <Input label="เงื่อนไข" value={activityForm.conditions} onChange={(e) => setActivityForm({ ...activityForm, conditions: e.target.value })} placeholder="เช่น ขั้นต่ำ 2 ท่าน, ยกเลิกล่วงหน้า 3 วัน" />
                  <div className="flex justify-end">
                    <Button type="submit">+ เพิ่มกิจกรรม</Button>
                  </div>
                </form>
              </div>
            )}

            {addTab === "files" && draftSupplier && <AttachmentList entityType="TourSupplier" entityId={draftSupplier.id} />}
          </div>
        </Card>
      )}

      {!adding && (
        <>
          <div className="flex gap-3 mb-3">
            <Input placeholder="ค้นหารหัส Supplier / ชื่อ" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className="max-w-xs">
              <option value="">ทุกจังหวัด</option>
              {THAI_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">รูปภาพ</th>
                    <th className="text-left px-4 py-2">รหัส</th>
                    <th className="text-left px-4 py-2">ชื่อ Supplier</th>
                    <th className="text-left px-4 py-2">จังหวัด</th>
                    <th className="text-left px-4 py-2">กิจกรรม/ทัวร์</th>
                    <th className="text-right px-4 py-2">ราคา</th>
                    <th className="text-left px-4 py-2">เบอร์ส่วนกลาง</th>
                    <th className="text-left px-4 py-2">Odoo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((s) => {
                    const range = activityPriceRange(s.activities);
                    return (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/suppliers/tours/${s.id}`)}
                        className="border-t border-slate-100 cursor-pointer hover:bg-blue-50"
                      >
                        <td className="px-4 py-2">
                          {s.activities?.find((a) => a.imageUrl)?.imageUrl ? (
                            <img
                              src={s.activities.find((a) => a.imageUrl).imageUrl}
                              alt=""
                              className="w-10 h-10 rounded object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                              <Ticket size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{s.supplierCode}</td>
                        <td className="px-4 py-2">{s.name}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{s.province || "—"}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{s.activities?.length || 0} รายการ</td>
                        <td className="px-4 py-2 text-right font-medium">{range || <span className="text-slate-400 font-normal">—</span>}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{s.phone || "—"}</td>
                        <td className="px-4 py-2">
                          {s.odooId ? <Badge tone="green">Synced #{s.odooId}</Badge> : <Badge>Not synced</Badge>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSupplier(s.id);
                            }}
                          >
                            ลบ
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                        ยังไม่มีข้อมูล Supplier
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
