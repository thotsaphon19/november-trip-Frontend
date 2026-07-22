import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Select, Modal, ImageUploader, Tabs, AttachmentList } from "../components/ui";
import { ArrowLeft, Building2, ChevronDown, ChevronRight, Settings2, Pencil, Trash2, Check, X, Star, AlertTriangle } from "lucide-react";
import { THAI_PROVINCES } from "../lib/provinces";
import { useUndo } from "../lib/undoContext";
import { DOW_LABELS_TH, daysOfWeekLabel } from "../lib/dayOfWeek";
import { contractAlert, DEFAULT_CONTRACT_WARNING_DAYS } from "../lib/hotelMeta";
import { playAlertBeep } from "../lib/notificationSound";
import { useTheme } from "../lib/themeContext";

const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

// ค.ศ. (Gregorian) year options for the season-pricing date range pickers -
// a wide-enough window either side of "now" to cover past and upcoming seasons.
function yearOptionsCE() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 2; y <= current + 5; y++) years.push(y);
  return years;
}

// Checkbox group for "what's included in the price" (Room With Breakfast,
// Free Airport Transfer, etc.) - the tag catalog is global/shared so once
// someone adds a new option it's available for every room from then on.
export function InclusionTagPicker({ selectedIds, onChange }) {
  const [tags, setTags] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDetails, setEditDetails] = useState("");

  useEffect(() => {
    api.get("/suppliers/hotels/inclusion-tags").then(({ data }) => setTags(data));
  }, []);

  function toggle(tagId) {
    if (selectedIds.includes(tagId)) onChange(selectedIds.filter((id) => id !== tagId));
    else onChange([...selectedIds, tagId]);
  }

  async function addNewTag() {
    const label = newLabel.trim();
    if (!label) return;
    const { data: tag } = await api.post("/suppliers/hotels/inclusion-tags", { label, details: newDetails.trim() });
    setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag].sort((a, b) => a.label.localeCompare(b.label))));
    onChange(selectedIds.includes(tag.id) ? selectedIds : [...selectedIds, tag.id]);
    setNewLabel("");
    setNewDetails("");
    setAdding(false);
  }

  function startEdit(tag) {
    setEditingId(tag.id);
    setEditLabel(tag.label);
    setEditDetails(tag.details || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel("");
    setEditDetails("");
  }

  async function saveEdit(tagId) {
    const label = editLabel.trim();
    if (!label) return;
    const { data: updated } = await api.put(`/suppliers/hotels/inclusion-tags/${tagId}`, {
      label,
      details: editDetails.trim(),
    });
    setTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)).sort((a, b) => a.label.localeCompare(b.label)));
    cancelEdit();
  }

  async function deleteTag(tag) {
    if (!window.confirm(`ลบตัวเลือก "${tag.label}" ออกจากระบบ? จะถูกเอาออกจากทุกห้องพักที่เคยติ๊กเลือกไว้ด้วย`)) return;
    await api.delete(`/suppliers/hotels/inclusion-tags/${tag.id}`);
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    if (selectedIds.includes(tag.id)) onChange(selectedIds.filter((id) => id !== tag.id));
    if (editingId === tag.id) cancelEdit();
  }

  // Tags the person has ticked that also carry pre-filled details (breakfast
  // hours, pool hours, etc.) - shown automatically below so they never have
  // to retype what was already entered once when the option was created.
  const selectedWithDetails = tags.filter((t) => selectedIds.includes(t.id) && t.details);

  return (
    <div>
      <span className="block text-xs text-slate-500 mb-1">สิ่งที่รวมในราคา</span>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(tag.id)}
              className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border ${
                selected ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {/* Fixed-width slot, always rendered (not conditionally mounted) -
                  only its color/opacity toggles, so a button never changes
                  width on select/deselect. A conditionally-mounted "✓" here
                  used to change each button's width, which reflowed the
                  whole flex-wrap row and made every tag after it visibly
                  jump position on every click. */}
              <span aria-hidden="true" className={selected ? "text-blue-700" : "text-transparent"}>
                ✓
              </span>
              {tag.label}
            </button>
          );
        })}
        {tags.length === 0 && <span className="text-xs text-slate-400">ยังไม่มีตัวเลือก — เพิ่มได้ด้านล่าง</span>}
      </div>

      {/* Auto-filled details for whatever is currently ticked - typed once
          when the option was created, reused here without retyping. */}
      {selectedWithDetails.length > 0 && (
        <div className="mb-1.5 space-y-1">
          {selectedWithDetails.map((tag) => (
            <p key={tag.id} className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
              <span className="font-medium text-slate-600">{tag.label}:</span> {tag.details}
            </p>
          ))}
        </div>
      )}
      {adding ? (
        // Plain div, not <form> - this sits inside the "add room type" form,
        // and a <form> nested inside a <form> is invalid HTML that made
        // Enter/submit here fire the OUTER form's submit instead, navigating
        // away before the new tag was actually saved.
        <div className="space-y-1.5 border border-dashed border-slate-300 rounded-lg p-2">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNewTag();
              }
            }}
            placeholder="ชื่อตัวเลือก เช่น รวมอาหารเช้า, สระว่ายน้ำ"
            className="text-xs rounded border border-slate-300 px-2 py-1 w-full"
          />
          <textarea
            value={newDetails}
            onChange={(e) => setNewDetails(e.target.value)}
            placeholder="รายละเอียด (ไม่บังคับ) เช่น เวลา 07:00–10:00 ที่ห้องอาหารชั้น 1 — กรอกครั้งเดียว พอติ๊กเลือกครั้งต่อไปจะดึงมาให้เองไม่ต้องพิมพ์ซ้ำ"
            rows={2}
            className="text-xs rounded border border-slate-300 px-2 py-1 w-full"
          />
          <div className="flex gap-1.5 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={addNewTag}>
              เพิ่ม
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:underline">
            + เพิ่มตัวเลือกใหม่
          </button>
          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => setManaging(true)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:underline"
            >
              <Settings2 size={12} /> จัดการตัวเลือก
            </button>
          )}
        </div>
      )}

      <Modal
        open={managing}
        onClose={() => {
          setManaging(false);
          cancelEdit();
        }}
        title={'จัดการตัวเลือก "สิ่งที่รวมในราคา"'}
      >
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="border border-slate-200 rounded-lg p-2">
              {editingId === tag.id ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="text-xs rounded border border-slate-300 px-2 py-1 w-full"
                  />
                  <textarea
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                    rows={2}
                    placeholder="รายละเอียด (ไม่บังคับ)"
                    className="text-xs rounded border border-slate-300 px-2 py-1 w-full"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button type="button" variant="secondary" onClick={cancelEdit}>
                      <X size={13} /> ยกเลิก
                    </Button>
                    <Button type="button" onClick={() => saveEdit(tag.id)}>
                      <Check size={13} /> บันทึก
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{tag.label}</p>
                    {tag.details && <p className="text-xs text-slate-500 mt-0.5">{tag.details}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => startEdit(tag)} className="text-slate-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => deleteTag(tag)} className="text-slate-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {tags.length === 0 && <p className="text-xs text-slate-400">ยังไม่มีตัวเลือก</p>}
        </div>
      </Modal>
    </div>
  );
}

export default function HotelDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scheduleAction } = useUndo();
  const [hotel, setHotel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [roomForm, setRoomForm] = useState({ name: "", costPrice: "", sellPrice: "", maxPax: 2, imageUrl: "", inclusionIds: [] });
  const [mealForm, setMealForm] = useState({ mealType: "Breakfast", adultPrice: "", childPrice: "" });
  const [editingHotel, setEditingHotel] = useState(false);
  const [hotelForm, setHotelForm] = useState(null);
  const [tab, setTab] = useState("details");
  const { settings: appSettings } = useTheme();
  const contractWarningDays = appSettings?.contractWarningDays ?? DEFAULT_CONTRACT_WARNING_DAYS;

  async function load() {
    const { data } = await api.get(`/suppliers/hotels/${id}`);
    setHotel(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Plays the alert chime once per visit to this hotel's page (not on every
  // reload() after an edit) - a ref rather than state so updating it never
  // triggers a re-render.
  const soundPlayedForRef = useRef(null);
  useEffect(() => {
    if (!hotel || soundPlayedForRef.current === hotel.id) return;
    soundPlayedForRef.current = hotel.id;
    if (contractAlert(hotel, contractWarningDays)) playAlertBeep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel]);

  function hotelToForm(h) {
    return {
      hotelCode: h.hotelCode,
      name: h.name,
      logoUrl: h.logoUrl || "",
      contactName: h.contactName || "",
      phones: h.phones?.length ? h.phones : h.phone ? [h.phone] : [],
      emails: h.emails?.length ? h.emails : h.email ? [h.email] : [],
      bankName: h.bankName || "",
      bankAccountName: h.bankAccountName || "",
      bankAccountNumber: h.bankAccountNumber || "",
      address: h.address || "",
      province: h.province || "",
      taxId: h.taxId || "",
      contractStart: h.contractStart ? h.contractStart.slice(0, 10) : "",
      contractEnd: h.contractEnd ? h.contractEnd.slice(0, 10) : "",
      starRating: h.starRating || null,
    };
  }

  function openEdit() {
    setHotelForm(hotelToForm(hotel));
    setEditingHotel(true);
  }

  async function saveHotel(e) {
    e.preventDefault();
    await api.put(`/suppliers/hotels/${id}`, hotelForm);
    setEditingHotel(false);
    load();
  }

  async function pushToOdoo() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/suppliers/hotels/${id}/odoo/push`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addRoomType(e) {
    e.preventDefault();
    await api.post(`/suppliers/hotels/${id}/room-types`, roomForm);
    setRoomForm({ name: "", costPrice: "", sellPrice: "", maxPax: 2, imageUrl: "", inclusionIds: [] });
    load();
  }

  async function addMealCost(e) {
    e.preventDefault();
    await api.post(`/suppliers/hotels/${id}/meal-costs`, mealForm);
    setMealForm({ mealType: "Breakfast", adultPrice: "", childPrice: "" });
    load();
  }

  function removeRoomType(rtId) {
    const rt = hotel.roomTypes?.find((r) => r.id === rtId);
    setHotel((prev) => ({ ...prev, roomTypes: prev.roomTypes.filter((r) => r.id !== rtId) }));
    scheduleAction(`ลบห้องพัก "${rt?.name}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/hotels/room-types/${rtId}`),
      onUndo: () => load(),
    });
  }

  function removeMealCost(mcId) {
    const mc = hotel.mealCosts?.find((m) => m.id === mcId);
    setHotel((prev) => ({ ...prev, mealCosts: prev.mealCosts.filter((m) => m.id !== mcId) }));
    scheduleAction(`ลบราคาอาหาร "${mc?.mealType}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/hotels/meal-costs/${mcId}`),
      onUndo: () => load(),
    });
  }

  async function addHotelImage(url) {
    await api.post(`/suppliers/hotels/${id}/images`, { url });
    load();
  }

  function removeHotelImage(imageId) {
    setHotel((prev) => ({ ...prev, images: prev.images.filter((img) => img.id !== imageId) }));
    scheduleAction("ลบรูปภาพแล้ว", {
      onConfirm: () => api.delete(`/suppliers/hotels/${id}/images/${imageId}`),
      onUndo: () => load(),
    });
  }

  if (!hotel) {
    return <div className="text-slate-400 text-sm">กำลังโหลด…</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate("/suppliers/hotels")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft size={16} /> กลับไปหน้ารายการโรงแรม
      </button>

      <Card className="overflow-hidden">
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-start gap-3">
            {hotel.logoUrl ? (
              <img src={hotel.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200" />
            ) : (
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: "var(--nt-primary)" }}
              >
                <Building2 size={18} />
              </span>
            )}
            <div>
              <h2 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                {hotel.name}
                <StarRatingDisplay value={hotel.starRating} />
              </h2>
              <p className="text-xs text-slate-500">{hotel.hotelCode}</p>
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

        {(() => {
          const alert = contractAlert(hotel, contractWarningDays);
          if (!alert) return null;
          const tone = alert.level === "expired" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700";
          return (
            <div className={`mx-5 mb-4 flex items-center gap-2 text-sm border rounded-lg px-3 py-2 ${tone}`}>
              <AlertTriangle size={16} className="shrink-0" />
              <span>{alert.text}</span>
            </div>
          );
        })()}

        <Modal open={editingHotel} onClose={() => setEditingHotel(false)} title="แก้ไขข้อมูลโรงแรม">
          {hotelForm && (
            <form onSubmit={saveHotel} className="space-y-3">
              <Input label="รหัสโรงแรม" required value={hotelForm.hotelCode} onChange={(e) => setHotelForm({ ...hotelForm, hotelCode: e.target.value })} />
              <Input label="ชื่อโรงแรม" required value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} />
              <ImageUploader
                label="โลโก้/รูปหน้าปกโรงแรม (ใช้เป็นรูปย่อในหน้ารายการ)"
                value={hotelForm.logoUrl}
                onUploaded={(url) => setHotelForm({ ...hotelForm, logoUrl: url })}
              />
              <Input label="ผู้ติดต่อ" value={hotelForm.contactName} onChange={(e) => setHotelForm({ ...hotelForm, contactName: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <MultiInputList
                  label="เบอร์โทร"
                  values={hotelForm.phones}
                  onChange={(phones) => setHotelForm({ ...hotelForm, phones })}
                  max={6}
                  placeholder="0xx-xxxxxxx"
                  type="tel"
                />
                <MultiInputList
                  label="อีเมล"
                  values={hotelForm.emails}
                  onChange={(emails) => setHotelForm({ ...hotelForm, emails })}
                  max={5}
                  placeholder="name@example.com"
                  type="email"
                />
              </div>
              <Input label="ที่อยู่" value={hotelForm.address} onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })} />
              <Select label="จังหวัด" value={hotelForm.province} onChange={(e) => setHotelForm({ ...hotelForm, province: e.target.value })}>
                <option value="">-- เลือกจังหวัด --</option>
                {THAI_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
              <Input label="เลขประจำตัวผู้เสียภาษี" value={hotelForm.taxId} onChange={(e) => setHotelForm({ ...hotelForm, taxId: e.target.value })} />
              <StarRatingInput value={hotelForm.starRating} onChange={(starRating) => setHotelForm({ ...hotelForm, starRating })} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="ธนาคาร" value={hotelForm.bankName} onChange={(e) => setHotelForm({ ...hotelForm, bankName: e.target.value })} />
                <Input label="ชื่อบัญชี" value={hotelForm.bankAccountName} onChange={(e) => setHotelForm({ ...hotelForm, bankAccountName: e.target.value })} />
                <Input label="เลขบัญชี" value={hotelForm.bankAccountNumber} onChange={(e) => setHotelForm({ ...hotelForm, bankAccountNumber: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="วันเริ่มสัญญา" type="date" value={hotelForm.contractStart} onChange={(e) => setHotelForm({ ...hotelForm, contractStart: e.target.value })} />
                <Input label="วันสิ้นสุดสัญญา" type="date" value={hotelForm.contractEnd} onChange={(e) => setHotelForm({ ...hotelForm, contractEnd: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditingHotel(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          )}
        </Modal>

        <Tabs
          tabs={[
            { id: "details", label: "ข้อมูลโรงแรม" },
            { id: "rooms", label: "ห้องพัก" },
            { id: "seasonal", label: "ราคาตามฤดูกาล" },
            { id: "meals", label: "ราคาอาหาร" },
            { id: "gallery", label: "รูปภาพ" },
          ]}
          active={tab}
          onChange={setTab}
        />

        <div className="p-5">
          {tab === "details" && (
            <div>
              <div className="text-sm text-slate-600 space-y-1.5">
                {hotel.starRating && (
                  <div className="flex items-center gap-1.5">
                    ระดับดาว: <StarRatingDisplay value={hotel.starRating} />
                  </div>
                )}
                {hotel.contactName && <div>ผู้ติดต่อ: {hotel.contactName}</div>}
                {hotel.phones?.length > 0 && <div>เบอร์โทร: {hotel.phones.join(", ")}</div>}
                {hotel.emails?.length > 0 && <div>อีเมล: {hotel.emails.join(", ")}</div>}
                {hotel.address && <div>ที่อยู่: {hotel.address}</div>}
                {hotel.province && <div>จังหวัด: {hotel.province}</div>}
                {hotel.taxId && <div>เลขประจำตัวผู้เสียภาษี: {hotel.taxId}</div>}
                {(hotel.bankName || hotel.bankAccountName || hotel.bankAccountNumber) && (
                  <div>
                    บัญชีธนาคาร: {[hotel.bankName, hotel.bankAccountName, hotel.bankAccountNumber].filter(Boolean).join(" · ")}
                  </div>
                )}
                {(hotel.contractStart || hotel.contractEnd) && (
                  <div>
                    สัญญา: {hotel.contractStart ? new Date(hotel.contractStart).toLocaleDateString("th-TH") : "—"} –{" "}
                    {hotel.contractEnd ? new Date(hotel.contractEnd).toLocaleDateString("th-TH") : "—"}
                  </div>
                )}
                {!hotel.contactName &&
                  !hotel.phones?.length &&
                  !hotel.emails?.length &&
                  !hotel.address &&
                  !hotel.taxId &&
                  !hotel.bankName && <p className="text-slate-400">ยังไม่มีข้อมูล — กด "แก้ไขข้อมูล" เพื่อเพิ่ม</p>}
              </div>
              <HotelConditionsSection hotelId={id} conditions={hotel.conditions} onChange={load} />
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">ไฟล์เอกสารแนบ</p>
                <AttachmentList entityType="HotelSupplier" entityId={id} />
              </div>
            </div>
          )}

          {tab === "rooms" && (
            <div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg mb-3">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-3 py-2 w-16">รูปภาพ</th>
                      <th className="text-left px-3 py-2">ชื่อห้องพัก</th>
                      <th className="text-left px-3 py-2">Max pax</th>
                      <th className="text-right px-3 py-2">ราคาต้นทุน</th>
                      <th className="text-right px-3 py-2">ราคาขาย</th>
                      <th className="px-3 py-2 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotel.roomTypes?.map((rt) => (
                      <RoomTypeRow key={rt.id} roomType={rt} onRemove={() => removeRoomType(rt.id)} onChange={load} />
                    ))}
                    {hotel.roomTypes?.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                          ยังไม่มีประเภทห้องพัก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <form onSubmit={addRoomType} className="space-y-2 border border-dashed border-slate-300 rounded-lg p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <Input label="ชื่อ" className="col-span-2" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required />
                  <Input label="Max pax" type="number" min={1} value={roomForm.maxPax} onChange={(e) => setRoomForm({ ...roomForm, maxPax: Number(e.target.value) })} />
                  <Button type="submit">+ เพิ่มห้องพัก</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Cost" type="number" value={roomForm.costPrice} onChange={(e) => setRoomForm({ ...roomForm, costPrice: e.target.value })} required />
                  <Input label="Sell" type="number" value={roomForm.sellPrice} onChange={(e) => setRoomForm({ ...roomForm, sellPrice: e.target.value })} required />
                </div>
                <ImageUploader label="รูปห้องพัก" value={roomForm.imageUrl} onUploaded={(url) => setRoomForm({ ...roomForm, imageUrl: url })} />
                <InclusionTagPicker
                  selectedIds={roomForm.inclusionIds}
                  onChange={(inclusionIds) => setRoomForm({ ...roomForm, inclusionIds })}
                />
              </form>
            </div>
          )}

          {tab === "seasonal" && (
            <div className="space-y-4">
              {hotel.roomTypes?.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีประเภทห้องพัก — เพิ่มที่แท็บ "ห้องพัก" ก่อน</p>}
              {hotel.roomTypes?.map((rt, i) => (
                <SeasonalPricingBlock key={rt.id} roomType={rt} defaultExpanded={i === 0} onChange={load} />
              ))}
            </div>
          )}

          {tab === "meals" && (
            <div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg mb-3">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">ประเภทอาหาร</th>
                      <th className="text-right px-3 py-2">ราคาผู้ใหญ่</th>
                      <th className="text-right px-3 py-2">ราคาเด็ก</th>
                      <th className="px-3 py-2 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotel.mealCosts?.map((m) => (
                      <MealCostRow key={m.id} mealCost={m} onRemove={() => removeMealCost(m.id)} onChange={load} />
                    ))}
                    {hotel.mealCosts?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                          ยังไม่มีราคาอาหาร
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <form onSubmit={addMealCost} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                <Input label="ประเภท" value={mealForm.mealType} onChange={(e) => setMealForm({ ...mealForm, mealType: e.target.value })} />
                <Input label="ผู้ใหญ่" type="number" value={mealForm.adultPrice} onChange={(e) => setMealForm({ ...mealForm, adultPrice: e.target.value })} required />
                <Input label="เด็ก" type="number" value={mealForm.childPrice} onChange={(e) => setMealForm({ ...mealForm, childPrice: e.target.value })} required />
                <Button type="submit">+</Button>
              </form>
            </div>
          )}

          {tab === "gallery" && (
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {hotel.images?.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.url} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                    <button
                      onClick={() => removeHotelImage(img.id)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-5 opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {hotel.images?.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีรูปภาพ</p>}
              </div>
              <ImageUploader onUploaded={addHotelImage} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Free-pick checkboxes for which days of week a season price row applies to
// (Mon..Sun order for readability, though values are stored/sent using JS
// Date.getDay() numbering, 0=Sun..6=Sat). All ticked (or none ticked) both
// mean "every day" - kept equivalent so an untouched form still behaves
// like the old always-applies rows.
function DaysOfWeekPicker({ value, onChange }) {
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun for display
  function toggle(d) {
    if (value.includes(d)) onChange(value.filter((x) => x !== d));
    else onChange([...value, d]);
  }
  return (
    <div>
      <span className="block text-xs text-slate-500 mb-1">วันที่ใช้ราคานี้ (ไม่ติ๊ก = ทุกวัน)</span>
      <div className="flex flex-wrap gap-1.5">
        {order.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`text-xs rounded-full px-2.5 py-1 border ${
                on ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {DOW_LABELS_TH[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Clickable 1-5 star picker for the hotel edit/add forms. Clicking the
// currently-set star again clears the rating back to "unrated" (null) -
// otherwise there'd be no way to un-rate a hotel once rated.
export function StarRatingInput({ value, onChange }) {
  return (
    <div>
      <span className="block text-xs text-slate-500 mb-1">ระดับดาว</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className="text-amber-400 hover:scale-110 transition-transform"
            aria-label={`${n} ดาว`}
          >
            <Star size={20} fill={value >= n ? "currentColor" : "none"} strokeWidth={1.5} />
          </button>
        ))}
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-slate-400 hover:underline ml-1.5">
            ล้างค่า
          </button>
        )}
      </div>
    </div>
  );
}

// Read-only star row for list/detail views. Renders nothing when unrated,
// so it doesn't clutter hotels that haven't been rated yet.
export function StarRatingDisplay({ value, size = 14 }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={value >= n ? "currentColor" : "none"} strokeWidth={1.5} className={value >= n ? "" : "text-slate-300"} />
      ))}
    </div>
  );
}

export function SeasonalPricingBlock({ roomType, defaultExpanded = false, onChange }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [seasonForm, setSeasonForm] = useState({ dateFrom: "", dateTo: "", price: "", imageUrl: "", daysOfWeek: [] });

  async function addSeasonPrice(e) {
    e.preventDefault();
    await api.post(`/suppliers/hotels/room-types/${roomType.id}/season-prices`, seasonForm);
    setSeasonForm({ dateFrom: "", dateTo: "", price: "", imageUrl: "", daysOfWeek: [] });
    onChange();
  }

  async function removeSeasonPrice(spId) {
    await api.delete(`/suppliers/hotels/season-prices/${spId}`);
    onChange();
  }

  const count = roomType.seasonPrices?.length || 0;

  return (
    <div
      className={`rounded-lg overflow-hidden transition-colors ${expanded ? "border-2 shadow-sm" : "border border-slate-200"}`}
      style={expanded ? { borderColor: "var(--nt-primary)" } : undefined}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 ${expanded ? "border-b border-blue-100" : ""}`}
        style={expanded ? { backgroundColor: "var(--nt-primary-light)" } : { backgroundColor: "#f8fafc" }}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {roomType.name}
          <span className="text-slate-400 font-normal">(ปกติ ฿{Number(roomType.sellPrice).toLocaleString()})</span>
        </span>
        <span className="text-xs font-medium text-slate-500">{count} ช่วงราคา</span>
      </button>

      {expanded && (
        <div className="p-3">
          <div className="overflow-x-auto border border-slate-200 rounded-lg mb-2">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2 w-14">รูปภาพ</th>
                  <th className="text-left px-3 py-2">ช่วงเวลา</th>
                  <th className="text-right px-3 py-2">ราคา</th>
                  <th className="px-3 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {roomType.seasonPrices?.map((sp) => (
                  <SeasonPriceRow key={sp.id} seasonPrice={sp} onRemove={() => removeSeasonPrice(sp.id)} onChange={onChange} />
                ))}
                {roomType.seasonPrices?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                      ยังไม่มีราคาตามฤดูกาล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <form onSubmit={addSeasonPrice} className="space-y-2 bg-slate-50 rounded-lg p-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="ตั้งแต่วันที่"
                type="date"
                value={seasonForm.dateFrom}
                onChange={(e) => setSeasonForm({ ...seasonForm, dateFrom: e.target.value })}
                required
              />
              <Input
                label="ถึงวันที่"
                type="date"
                value={seasonForm.dateTo}
                onChange={(e) => setSeasonForm({ ...seasonForm, dateTo: e.target.value })}
                required
              />
              <Input
                label="ราคา"
                type="number"
                className="col-span-2"
                value={seasonForm.price}
                onChange={(e) => setSeasonForm({ ...seasonForm, price: e.target.value })}
                required
              />
            </div>
            <DaysOfWeekPicker
              value={seasonForm.daysOfWeek}
              onChange={(daysOfWeek) => setSeasonForm({ ...seasonForm, daysOfWeek })}
            />
            <div className="flex items-end justify-between gap-2">
              <ImageUploader
                label="รูป (อย่างน้อย 1 รูป)"
                value={seasonForm.imageUrl}
                onUploaded={(url) => setSeasonForm({ ...seasonForm, imageUrl: url })}
              />
              <Button type="submit">+ เพิ่มราคาฤดูกาล</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Editable list of up to `max` text inputs (used for hotel phones/emails).
export function MultiInputList({ label, values, onChange, max, placeholder, type = "text" }) {
  function updateAt(i, val) {
    const next = [...values];
    next[i] = val;
    onChange(next);
  }
  function removeAt(i) {
    onChange(values.filter((_, idx) => idx !== i));
  }
  function add() {
    if (values.length >= max) return;
    onChange([...values, ""]);
  }
  return (
    <div>
      <span className="block text-xs text-slate-500 mb-1">
        {label} ({values.length}/{max})
      </span>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              type={type}
              value={v}
              onChange={(e) => updateAt(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-sm rounded border border-slate-300 px-2.5 py-1.5"
            />
            <button type="button" onClick={() => removeAt(i)} className="text-red-500 text-xs px-1.5">
              ลบ
            </button>
          </div>
        ))}
        {values.length === 0 && <p className="text-xs text-slate-400">ยังไม่มี — กด "+ เพิ่ม{label}" ด้านล่าง</p>}
      </div>
      {values.length < max && (
        <button type="button" onClick={add} className="text-xs text-blue-600 hover:underline mt-1.5">
          + เพิ่ม{label}
        </button>
      )}
    </div>
  );
}

// Dropdown of condition types (Cancellation Policy, Check-in/Check-out, etc.)
// with the same "create a new one inline" pattern as InclusionTagPicker - the
// catalog is global/shared so new types are reusable across every hotel.
export function ConditionTypeSelect({ value, onChange }) {
  const [types, setTypes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    api.get("/suppliers/hotels/condition-types").then(({ data }) => setTypes(data));
  }, []);

  async function addNewType() {
    const label = newLabel.trim();
    if (!label) return;
    const { data: type } = await api.post("/suppliers/hotels/condition-types", { label });
    setTypes((prev) => (prev.some((t) => t.id === type.id) ? prev : [...prev, type].sort((a, b) => a.label.localeCompare(b.label))));
    onChange(type.id);
    setNewLabel("");
    setAdding(false);
  }

  if (adding) {
    return (
      // Plain div, not <form> - this sits inside another form (the "add
      // condition" form), and a <form> nested inside a <form> is invalid
      // HTML that made Enter/submit here fire the OUTER form's submit
      // instead, which navigated the page away before anything was saved.
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNewType();
            }
          }}
          placeholder="เช่น เงื่อนไขการยกเลิก, เด็ก"
          className="flex-1 text-xs rounded border border-slate-300 px-2.5 py-1.5"
        />
        <Button type="button" onClick={addNewType}>
          เพิ่ม
        </Button>
        <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
          ยกเลิก
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <select
        className="flex-1 text-sm rounded border border-slate-300 px-2.5 py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="">-- เลือกประเภทเงื่อนไข --</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => setAdding(true)} className="text-xs text-blue-600 whitespace-nowrap">
        + ประเภทใหม่
      </button>
    </div>
  );
}

// Per-hotel list of free-text conditions, each tagged with a (user-extensible) type.
export function HotelConditionsSection({ hotelId, conditions, onChange }) {
  const { scheduleAction } = useUndo();
  const [form, setForm] = useState({ conditionTypeId: "", content: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ conditionTypeId: "", content: "" });
  const [hiddenIds, setHiddenIds] = useState([]);

  async function addCondition(e) {
    e.preventDefault();
    if (!form.conditionTypeId || !form.content.trim()) return;
    await api.post(`/suppliers/hotels/${hotelId}/conditions`, form);
    setForm({ conditionTypeId: "", content: "" });
    onChange();
  }

  async function saveEdit(conditionId) {
    await api.put(`/suppliers/hotels/conditions/${conditionId}`, editForm);
    setEditingId(null);
    onChange();
  }

  function removeCondition(condition) {
    setHiddenIds((prev) => [...prev, condition.id]);
    scheduleAction(`ลบเงื่อนไข "${condition.conditionType.label}" แล้ว`, {
      onConfirm: async () => {
        await api.delete(`/suppliers/hotels/conditions/${condition.id}`);
        onChange();
      },
      onUndo: () => setHiddenIds((prev) => prev.filter((id) => id !== condition.id)),
    });
  }

  const visibleConditions = conditions?.filter((c) => !hiddenIds.includes(c.id));

  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase">เงื่อนไข</p>
      <div className="space-y-2">
        {visibleConditions?.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="border border-blue-200 bg-blue-50/40 rounded-lg p-2.5 space-y-1.5">
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
                <Button type="button" onClick={() => saveEdit(c.id)}>
                  บันทึก
                </Button>
              </div>
            </div>
          ) : (
            <div key={c.id} className="border border-slate-200 rounded-lg p-2.5 flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  {c.conditionType.label}
                </span>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{c.content}</p>
              </div>
              <div className="flex gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditForm({ conditionTypeId: c.conditionTypeId, content: c.content });
                  }}
                  className="text-blue-600"
                >
                  แก้ไข
                </button>
                <button type="button" onClick={() => removeCondition(c)} className="text-red-500">
                  ลบ
                </button>
              </div>
            </div>
          )
        )}
        {(!visibleConditions || visibleConditions.length === 0) && <p className="text-sm text-slate-400">ยังไม่มีเงื่อนไข</p>}
      </div>
      <form onSubmit={addCondition} className="border border-dashed border-slate-300 rounded-lg p-2.5 space-y-1.5">
        <ConditionTypeSelect value={form.conditionTypeId} onChange={(id) => setForm({ ...form, conditionTypeId: id })} />
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="รายละเอียดเงื่อนไข"
          className="w-full text-sm rounded border border-slate-300 px-2.5 py-1.5"
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit">+ เพิ่มเงื่อนไข</Button>
        </div>
      </form>
    </div>
  );
}

export function RoomTypeRow({ roomType, onRemove, onChange }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: roomType.name,
    costPrice: roomType.costPrice,
    sellPrice: roomType.sellPrice,
    maxPax: roomType.maxPax,
    imageUrl: roomType.imageUrl || "",
    inclusionIds: roomType.inclusions?.map((t) => t.id) || [],
  });

  async function saveEdit(e) {
    e.preventDefault();
    await api.put(`/suppliers/hotels/room-types/${roomType.id}`, editForm);
    setEditing(false);
    onChange();
  }

  return (
    <>
      <tr
        onClick={() => setEditing((v) => !v)}
        className={`border-t border-slate-100 text-sm cursor-pointer hover:bg-blue-50/60 ${editing ? "bg-blue-50/60" : ""}`}
      >
        <td className="px-3 py-2">
          {roomType.imageUrl ? (
            <img src={roomType.imageUrl} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" />
          ) : (
            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200" />
          )}
        </td>
        <td className="px-3 py-2">
          {roomType.name}
          {roomType.inclusions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {roomType.inclusions.map((tag) => (
                <span
                  key={tag.id}
                  title={tag.details || undefined}
                  className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-1.5 py-0.5"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-slate-500">{roomType.maxPax}</td>
        <td className="px-3 py-2 text-right text-slate-500">฿{Number(roomType.costPrice).toLocaleString()}</td>
        <td className="px-3 py-2 text-right font-medium text-slate-700">฿{Number(roomType.sellPrice).toLocaleString()}</td>
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
          <td colSpan={6} className="px-3 pb-3 pt-1">
            <form onSubmit={saveEdit} className="border border-blue-200 bg-white rounded-lg p-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input label="ชื่อ" className="col-span-2" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                <Input label="Max pax" type="number" min={1} value={editForm.maxPax} onChange={(e) => setEditForm({ ...editForm, maxPax: Number(e.target.value) })} />
                <Input label="Cost" type="number" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <Input label="Sell" type="number" value={editForm.sellPrice} onChange={(e) => setEditForm({ ...editForm, sellPrice: e.target.value })} required />
                <ImageUploader label="รูป" value={editForm.imageUrl} onUploaded={(url) => setEditForm({ ...editForm, imageUrl: url })} />
              </div>
              <InclusionTagPicker
                selectedIds={editForm.inclusionIds}
                onChange={(inclusionIds) => setEditForm({ ...editForm, inclusionIds })}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  แก้ราคาแล้วจะอัปเดตทุกวันในทัวร์/ใบเสนอราคาที่ใช้ห้องนี้อยู่ให้อัตโนมัติ
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">บันทึก</Button>
                </div>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

export function MealCostRow({ mealCost, onRemove, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    mealType: mealCost.mealType,
    adultPrice: mealCost.adultPrice,
    childPrice: mealCost.childPrice,
  });

  async function saveEdit(e) {
    e.preventDefault();
    await api.put(`/suppliers/hotels/meal-costs/${mealCost.id}`, form);
    setEditing(false);
    onChange();
  }

  return (
    <>
      <tr
        onClick={() => setEditing((v) => !v)}
        className={`border-t border-slate-100 text-sm cursor-pointer hover:bg-blue-50/60 ${editing ? "bg-blue-50/60" : ""}`}
      >
        <td className="px-3 py-2">{mealCost.mealType}</td>
        <td className="px-3 py-2 text-right text-slate-500">฿{Number(mealCost.adultPrice).toLocaleString()}</td>
        <td className="px-3 py-2 text-right text-slate-500">฿{Number(mealCost.childPrice).toLocaleString()}</td>
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
          <td colSpan={4} className="px-3 pb-3 pt-1">
            <form
              onSubmit={saveEdit}
              onClick={(e) => e.stopPropagation()}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end bg-white border border-blue-200 rounded-lg px-3 py-2"
            >
              <Input label="ประเภท" value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })} />
              <Input label="ผู้ใหญ่" type="number" value={form.adultPrice} onChange={(e) => setForm({ ...form, adultPrice: e.target.value })} required />
              <Input label="เด็ก" type="number" value={form.childPrice} onChange={(e) => setForm({ ...form, childPrice: e.target.value })} required />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

export function SeasonPriceRow({ seasonPrice, onRemove, onChange }) {
  const { scheduleAction } = useUndo();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [form, setForm] = useState({
    dateFrom: seasonPrice.dateFrom.slice(0, 10),
    dateTo: seasonPrice.dateTo.slice(0, 10),
    price: seasonPrice.price,
    imageUrl: seasonPrice.imageUrl || "",
    daysOfWeek: seasonPrice.daysOfWeek || [],
  });

  async function saveEdit(e) {
    e.preventDefault();
    await api.put(`/suppliers/hotels/season-prices/${seasonPrice.id}`, form);
    setEditing(false);
    onChange();
  }

  function formatDateRangeTH(fromISO, toISO) {
    const opts = { day: "numeric", month: "short", year: "numeric" };
    const from = new Date(fromISO).toLocaleDateString("th-TH", opts);
    const to = new Date(toISO).toLocaleDateString("th-TH", opts);
    return `${from} – ${to}`;
  }

  function handleRemove() {
    setPendingDelete(true);
    scheduleAction(`ลบราคาฤดูกาล "${formatDateRangeTH(seasonPrice.dateFrom, seasonPrice.dateTo)}" แล้ว`, {
      onConfirm: () => onRemove(),
      onUndo: () => setPendingDelete(false),
    });
  }

  if (pendingDelete) return null;

  return (
    <>
      <tr
        onClick={() => setEditing((v) => !v)}
        className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50/60 ${editing ? "bg-blue-50/60" : ""}`}
      >
        <td className="px-3 py-2">
          {seasonPrice.imageUrl ? (
            <img src={seasonPrice.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
          ) : (
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200" />
          )}
        </td>
        <td className="px-3 py-2">
          {formatDateRangeTH(seasonPrice.dateFrom, seasonPrice.dateTo)}
          {daysOfWeekLabel(seasonPrice.daysOfWeek) && (
            <span className="ml-1.5 text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
              {daysOfWeekLabel(seasonPrice.daysOfWeek)}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right text-slate-500">฿{Number(seasonPrice.price).toLocaleString()}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing((v) => !v);
            }}
            className="text-blue-600 mr-2"
          >
            {editing ? "ปิด" : "แก้ไข"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="text-red-500"
          >
            ลบ
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="bg-blue-50/40">
          <td colSpan={4} className="px-3 pb-3 pt-1">
            <form onSubmit={saveEdit} onClick={(e) => e.stopPropagation()} className="space-y-2 bg-white border border-blue-200 rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="ตั้งแต่วันที่"
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
                  required
                />
                <Input
                  label="ถึงวันที่"
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                  required
                />
                <Input
                  label="ราคา"
                  type="number"
                  className="col-span-2"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <DaysOfWeekPicker value={form.daysOfWeek} onChange={(daysOfWeek) => setForm({ ...form, daysOfWeek })} />
              <div className="flex items-end justify-between gap-2">
                <ImageUploader label="รูป" value={form.imageUrl} onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">บันทึก</Button>
                </div>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
