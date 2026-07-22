import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Modal, Badge, Select, AttachmentList, Tabs, ImageUploader } from "../components/ui";
import { ArrowLeft, Ticket } from "lucide-react";
import { THAI_PROVINCES } from "../lib/provinces";
import { useUndo } from "../lib/undoContext";

export default function TourSupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scheduleAction } = useUndo();
  const [supplier, setSupplier] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingSupplier, setEditingSupplier] = useState(false);
  const [tab, setTab] = useState("details");
  const [supplierForm, setSupplierForm] = useState(null);

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
  const [form, setForm] = useState(emptyActivityForm);

  async function load() {
    const { data } = await api.get(`/suppliers/tours/${id}`);
    setSupplier(data);
  }

  useEffect(() => {
    load();
    suggestNextActivityCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function suggestNextActivityCode() {
    try {
      const { data } = await api.get("/suppliers/tours/activities/next-code");
      setForm((f) => ({ ...f, activityCode: data.code }));
    } catch {
      /* auto-code is a convenience only - the field stays editable either way */
    }
  }

  function supplierToForm(s) {
    return {
      supplierCode: s.supplierCode,
      name: s.name,
      phone: s.phone || "",
      phoneSales: s.phoneSales || "",
      email: s.email || "",
      line: s.line || "",
      whatsapp: s.whatsapp || "",
      province: s.province || "",
      contractStart: s.contractStart ? s.contractStart.slice(0, 10) : "",
      contractEnd: s.contractEnd ? s.contractEnd.slice(0, 10) : "",
    };
  }

  function openEdit() {
    setSupplierForm(supplierToForm(supplier));
    setEditingSupplier(true);
  }

  async function saveSupplier(e) {
    e.preventDefault();
    await api.put(`/suppliers/tours/${id}`, supplierForm);
    setEditingSupplier(false);
    load();
  }

  async function pushToOdoo() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/suppliers/tours/${id}/odoo/push`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addActivity(e) {
    e.preventDefault();
    await api.post(`/suppliers/tours/${id}/activities`, form);
    setForm(emptyActivityForm);
    await suggestNextActivityCode();
    load();
  }

  function removeActivity(activityId) {
    const activity = supplier.activities?.find((a) => a.id === activityId);
    setSupplier((prev) => ({ ...prev, activities: prev.activities.filter((a) => a.id !== activityId) }));
    scheduleAction(`ลบ "${activity?.name}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/tours/activities/${activityId}`),
      onUndo: () => load(),
    });
  }

  if (!supplier) {
    return <div className="text-slate-400 text-sm">กำลังโหลด…</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate("/suppliers/tours")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft size={16} /> กลับไปหน้ารายการ Supplier
      </button>

      <Card className="overflow-hidden">
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-start gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: "var(--nt-primary)" }}
            >
              <Ticket size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">{supplier.name}</h2>
              <p className="text-xs text-slate-500">
                {supplier.supplierCode} · {supplier.activities?.length || 0} สินค้า/กิจกรรม
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={openEdit}>
              แก้ไขข้อมูล
            </Button>
            <Button variant="secondary" onClick={pushToOdoo} disabled={busy}>
              ⇅ Push to Odoo
            </Button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm px-5 pb-3">{error}</div>}

        <Modal open={editingSupplier} onClose={() => setEditingSupplier(false)} title="แก้ไขข้อมูล Supplier">
          {supplierForm && (
            <form onSubmit={saveSupplier} className="space-y-3">
              <Input label="รหัส Supplier" required value={supplierForm.supplierCode} onChange={(e) => setSupplierForm({ ...supplierForm, supplierCode: e.target.value })} />
              <Input label="ชื่อ Supplier" required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="เบอร์ส่วนกลาง" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                <Input label="เบอร์เซลล์" value={supplierForm.phoneSales} onChange={(e) => setSupplierForm({ ...supplierForm, phoneSales: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="อีเมล" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                <Input label="Line" value={supplierForm.line} onChange={(e) => setSupplierForm({ ...supplierForm, line: e.target.value })} />
              </div>
              <Input label="WhatsApp" value={supplierForm.whatsapp} onChange={(e) => setSupplierForm({ ...supplierForm, whatsapp: e.target.value })} />
              <Select label="จังหวัด" value={supplierForm.province} onChange={(e) => setSupplierForm({ ...supplierForm, province: e.target.value })}>
                <option value="">-- เลือกจังหวัด --</option>
                {THAI_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="วันเริ่มสัญญา" type="date" value={supplierForm.contractStart} onChange={(e) => setSupplierForm({ ...supplierForm, contractStart: e.target.value })} />
                <Input label="วันสิ้นสุดสัญญา" type="date" value={supplierForm.contractEnd} onChange={(e) => setSupplierForm({ ...supplierForm, contractEnd: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditingSupplier(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          )}
        </Modal>

        <Tabs
          tabs={[
            { id: "details", label: "รายละเอียด" },
            { id: "products", label: "สินค้า/กิจกรรม" },
            { id: "files", label: "ไฟล์แนบ" },
          ]}
          active={tab}
          onChange={setTab}
        />

        <div className="p-5">
          {tab === "details" && (
            <div className="text-sm text-slate-600 space-y-1.5">
              {supplier.phone && <div>เบอร์ส่วนกลาง: {supplier.phone}</div>}
              {supplier.phoneSales && <div>เบอร์เซลล์: {supplier.phoneSales}</div>}
              {supplier.email && <div>อีเมล: {supplier.email}</div>}
              {supplier.line && <div>Line: {supplier.line}</div>}
              {supplier.whatsapp && <div>WhatsApp: {supplier.whatsapp}</div>}
              {supplier.province && <div>จังหวัด: {supplier.province}</div>}
              {(supplier.contractStart || supplier.contractEnd) && (
                <div>
                  สัญญา: {supplier.contractStart ? new Date(supplier.contractStart).toLocaleDateString("th-TH") : "—"} –{" "}
                  {supplier.contractEnd ? new Date(supplier.contractEnd).toLocaleDateString("th-TH") : "—"}
                </div>
              )}
              {!supplier.phone &&
                !supplier.phoneSales &&
                !supplier.email &&
                !supplier.line &&
                !supplier.whatsapp &&
                !supplier.contractStart && <p className="text-slate-400">ยังไม่มีข้อมูล — กด "แก้ไขข้อมูล" เพื่อเพิ่ม</p>}
            </div>
          )}

          {tab === "products" && (
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
                    {supplier.activities?.map((a) => (
                      <ActivityRow key={a.id} activity={a} onRemove={() => removeActivity(a.id)} onChange={load} />
                    ))}
                    {supplier.activities?.length === 0 && (
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
                <ImageUploader label="รูปภาพ" value={form.imageUrl} onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <Input label="ชื่อกิจกรรม" className="col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  <Input label="รหัสสินค้า (สร้างให้อัตโนมัติ)" value={form.activityCode} onChange={(e) => setForm({ ...form, activityCode: e.target.value })} />
                  <Select label="หมวด" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="Tour">Tour</option>
                    <option value="Activities">Activities</option>
                    <option value="Place">Place</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input label="Cost ผู้ใหญ่" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
                  <Input label="Sell ผู้ใหญ่" type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} required />
                  <Input label="Cost เด็ก" type="number" value={form.childCostPrice} onChange={(e) => setForm({ ...form, childCostPrice: e.target.value })} />
                  <Input label="Sell เด็ก" type="number" value={form.childSellPrice} onChange={(e) => setForm({ ...form, childSellPrice: e.target.value })} />
                </div>
                <Input label="เงื่อนไข" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="เช่น ขั้นต่ำ 2 ท่าน, ยกเลิกล่วงหน้า 3 วัน" />
                <div className="flex justify-end">
                  <Button type="submit">+ เพิ่มกิจกรรม</Button>
                </div>
              </form>
            </div>
          )}

          {tab === "files" && <AttachmentList entityType="TourSupplier" entityId={supplier.id} />}
        </div>
      </Card>
    </div>
  );
}

export function ActivityRow({ activity, onRemove, onChange }) {
  const [editing, setEditing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [form, setForm] = useState({
    name: activity.name,
    activityCode: activity.activityCode || "",
    category: activity.category,
    imageUrl: activity.imageUrl || "",
    costPrice: activity.costPrice,
    sellPrice: activity.sellPrice,
    childCostPrice: activity.childCostPrice ?? "",
    childSellPrice: activity.childSellPrice ?? "",
    conditions: activity.conditions || "",
  });

  async function saveEdit(e) {
    e.preventDefault();
    await api.put(`/suppliers/tours/activities/${activity.id}`, form);
    setEditing(false);
    onChange();
  }

  async function pushToOdoo(e) {
    e.stopPropagation();
    setPushing(true);
    setPushResult(null);
    try {
      await api.post(`/suppliers/tours/activities/${activity.id}/odoo/push`);
      setPushResult({ success: true, message: "ซิงค์สำเร็จ" });
      onChange();
    } catch (e) {
      setPushResult({ success: false, message: e.message });
    } finally {
      setPushing(false);
    }
  }

  return (
    <>
      <tr
        onClick={() => setEditing((v) => !v)}
        className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50/60 ${editing ? "bg-blue-50/60" : ""}`}
      >
        <td className="px-3 py-2">
          {activity.imageUrl ? (
            <img src={activity.imageUrl} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" />
          ) : (
            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200" />
          )}
        </td>
        <td className="px-3 py-2">{activity.name}</td>
        <td className="px-3 py-2 text-xs text-slate-400 font-mono">{activity.activityCode || "—"}</td>
        <td className="px-3 py-2">
          <Badge>{activity.category}</Badge>
        </td>
        <td className="px-3 py-2 text-right text-slate-500">฿{Number(activity.costPrice).toLocaleString()}</td>
        <td className="px-3 py-2 text-right font-medium text-slate-700">฿{Number(activity.sellPrice).toLocaleString()}</td>
        <td className="px-3 py-2">
          {activity.odooProductId ? <Badge tone="green">Synced #{activity.odooProductId}</Badge> : <Badge>Not synced</Badge>}
        </td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <button onClick={pushToOdoo} disabled={pushing} className="text-blue-600 text-xs mr-2">
            ⇅ Push
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing((v) => !v);
            }}
            className="text-blue-600 text-xs mr-2"
          >
            {editing ? "ปิด" : "แก้ไข"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-500 text-xs"
          >
            ลบ
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="bg-blue-50/40">
          <td colSpan={8} className="px-3 pb-3 pt-1">
            <form
              onSubmit={saveEdit}
              onClick={(e) => e.stopPropagation()}
              className="border border-blue-200 bg-white rounded-lg p-2.5 space-y-2 text-sm"
            >
              <ImageUploader label="รูปภาพ" value={form.imageUrl} onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                <Input label="ชื่อกิจกรรม" className="col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="รหัสสินค้า" value={form.activityCode} onChange={(e) => setForm({ ...form, activityCode: e.target.value })} />
                <Select label="หมวด" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="Tour">Tour</option>
                  <option value="Activities">Activities</option>
                  <option value="Place">Place</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input label="Cost ผู้ใหญ่" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
                <Input label="Sell ผู้ใหญ่" type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} required />
                <Input label="Cost เด็ก" type="number" value={form.childCostPrice} onChange={(e) => setForm({ ...form, childCostPrice: e.target.value })} />
                <Input label="Sell เด็ก" type="number" value={form.childSellPrice} onChange={(e) => setForm({ ...form, childSellPrice: e.target.value })} />
              </div>
              <Input label="เงื่อนไข" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="เช่น ขั้นต่ำ 2 ท่าน, ยกเลิกล่วงหน้า 3 วัน" />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">แก้ราคาแล้วจะอัปเดตทุกวันในทัวร์/ใบเสนอราคาที่ใช้กิจกรรมนี้อยู่ให้อัตโนมัติ</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">บันทึก</Button>
                </div>
              </div>
              {pushResult && (
                <div className={`text-xs ${pushResult.success ? "text-green-600" : "text-red-600"}`}>
                  {pushResult.success ? "✅ " : "❌ "}
                  {pushResult.message}
                </div>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
