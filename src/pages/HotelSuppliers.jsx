import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Card, Button, Input, Badge, Select, PageHeader, Pagination, usePagination, Tabs, ImageUploader, AttachmentList } from "../components/ui";
import { Building2, ArrowLeft, ArrowUpDown } from "lucide-react";
import { RoomTypeRow, MealCostRow, SeasonalPricingBlock, InclusionTagPicker, MultiInputList, HotelConditionsSection, StarRatingInput, StarRatingDisplay } from "./HotelDetailPage";
import { THAI_PROVINCES } from "../lib/provinces";
import { useUndo } from "../lib/undoContext";

function roomPriceRange(roomTypes) {
  if (!roomTypes || roomTypes.length === 0) return null;
  const prices = roomTypes.map((rt) => Number(rt.sellPrice));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `฿${min.toLocaleString()}` : `฿${min.toLocaleString()} - ฿${max.toLocaleString()}`;
}

const emptyHotel = {
  hotelCode: "",
  name: "",
  logoUrl: "",
  contactName: "",
  phones: [],
  emails: [],
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  address: "",
  province: "",
  taxId: "",
  contractStart: "",
  contractEnd: "",
  starRating: null,
};

const ADD_TABS = [
  { id: "details", label: "ข้อมูลโรงแรม" },
  { id: "rooms", label: "ห้องพัก" },
  { id: "seasonal", label: "ราคาตามฤดูกาล" },
  { id: "meals", label: "ราคาอาหาร" },
  { id: "gallery", label: "รูปภาพ" },
];

export default function HotelSuppliers() {
  const { scheduleAction } = useUndo();
  const [hotels, setHotels] = useState([]);
  const [q, setQ] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [starFilter, setStarFilter] = useState("");
  const [amenityFilter, setAmenityFilter] = useState("");
  const [amenityOptions, setAmenityOptions] = useState([]);
  // null = no sort (default list order); "asc"/"desc" sorts by contractEnd,
  // with hotels that have no contract date pushed to the bottom either way.
  const [contractSort, setContractSort] = useState(null);
  const navigate = useNavigate();
  const sortedHotels =
    contractSort === null
      ? hotels
      : [...hotels].sort((a, b) => {
          if (!a.contractEnd && !b.contractEnd) return 0;
          if (!a.contractEnd) return 1;
          if (!b.contractEnd) return -1;
          const diff = new Date(a.contractEnd) - new Date(b.contractEnd);
          return contractSort === "asc" ? diff : -diff;
        });
  const { page, setPage, totalPages, total, pageItems, rangeStart, rangeEnd } = usePagination(sortedHotels, 50);

  // --- Inline "add new hotel" panel state -----------------------------------
  const [adding, setAdding] = useState(false);
  const [addTab, setAddTab] = useState("details");
  const [form, setForm] = useState(emptyHotel);
  const [draftHotel, setDraftHotel] = useState(null); // set once the hotel record has been created
  const [roomForm, setRoomForm] = useState({ name: "", costPrice: "", sellPrice: "", maxPax: 2, imageUrl: "", inclusionIds: [] });
  const [mealForm, setMealForm] = useState({ mealType: "Breakfast", adultPrice: "", childPrice: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(query = q, province = provinceFilter, starRating = starFilter, inclusionTagId = amenityFilter) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (province) params.set("province", province);
    if (starRating) params.set("starRating", starRating);
    if (inclusionTagId) params.set("inclusionTagId", inclusionTagId);
    const { data } = await api.get(`/suppliers/hotels?${params.toString()}`);
    setHotels(data);
  }

  useEffect(() => {
    load(q, provinceFilter, starFilter, amenityFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, provinceFilter, starFilter, amenityFilter]);

  useEffect(() => {
    api.get("/suppliers/hotels/inclusion-tags").then(({ data }) => setAmenityOptions(data));
  }, []);

  async function openAddPanel() {
    setForm(emptyHotel);
    setDraftHotel(null);
    setAddTab("details");
    setError("");
    setAdding(true);
    try {
      const { data } = await api.get("/suppliers/hotels/next-code");
      setForm((f) => ({ ...f, hotelCode: data.code }));
    } catch {
      /* auto-code is a convenience only - the field stays editable either way */
    }
  }

  function closeAddPanel() {
    setAdding(false);
    setDraftHotel(null);
    load();
  }

  async function reloadDraft() {
    if (!draftHotel) return;
    const { data } = await api.get(`/suppliers/hotels/${draftHotel.id}`);
    setDraftHotel(data);
  }

  // ข้อมูลโรงแรม tab: creates the hotel on first save, updates it after that
  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!draftHotel) {
        const { data } = await api.post("/suppliers/hotels", form);
        setDraftHotel(data);
        await load();
        setAddTab("rooms");
      } else {
        await api.put(`/suppliers/hotels/${draftHotel.id}`, form);
        await reloadDraft();
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function deleteHotel(id) {
    const hotel = hotels.find((h) => h.id === id);
    setHotels((prev) => prev.filter((h) => h.id !== id));
    scheduleAction(`ลบ "${hotel?.name}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/hotels/${id}`),
      onUndo: () => load(),
    });
  }

  // --- Actions for the rooms / seasonal / meals / gallery tabs (need draftHotel.id) ---
  async function addRoomType(e) {
    e.preventDefault();
    await api.post(`/suppliers/hotels/${draftHotel.id}/room-types`, roomForm);
    setRoomForm({ name: "", costPrice: "", sellPrice: "", maxPax: 2, imageUrl: "", inclusionIds: [] });
    reloadDraft();
  }

  function removeRoomType(rtId) {
    const rt = draftHotel.roomTypes?.find((r) => r.id === rtId);
    setDraftHotel((prev) => ({ ...prev, roomTypes: prev.roomTypes.filter((r) => r.id !== rtId) }));
    scheduleAction(`ลบห้องพัก "${rt?.name}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/hotels/room-types/${rtId}`),
      onUndo: () => reloadDraft(),
    });
  }

  async function addMealCost(e) {
    e.preventDefault();
    await api.post(`/suppliers/hotels/${draftHotel.id}/meal-costs`, mealForm);
    setMealForm({ mealType: "Breakfast", adultPrice: "", childPrice: "" });
    reloadDraft();
  }

  function removeMealCost(mcId) {
    const mc = draftHotel.mealCosts?.find((m) => m.id === mcId);
    setDraftHotel((prev) => ({ ...prev, mealCosts: prev.mealCosts.filter((m) => m.id !== mcId) }));
    scheduleAction(`ลบราคาอาหาร "${mc?.mealType}" แล้ว`, {
      onConfirm: () => api.delete(`/suppliers/hotels/meal-costs/${mcId}`),
      onUndo: () => reloadDraft(),
    });
  }

  async function addHotelImage(url) {
    await api.post(`/suppliers/hotels/${draftHotel.id}/images`, { url });
    reloadDraft();
  }

  function removeHotelImage(imageId) {
    setDraftHotel((prev) => ({ ...prev, images: prev.images.filter((img) => img.id !== imageId) }));
    scheduleAction("ลบรูปภาพแล้ว", {
      onConfirm: () => api.delete(`/suppliers/hotels/${draftHotel.id}/images/${imageId}`),
      onUndo: () => reloadDraft(),
    });
  }

  function goToTab(tabId) {
    if (tabId !== "details" && !draftHotel) {
      setError("กรุณาบันทึกข้อมูลโรงแรม (แท็บ ข้อมูลโรงแรม) ก่อน แล้วแท็บอื่นจะเปิดให้กรอกได้");
      return;
    }
    setError("");
    setAddTab(tabId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <PageHeader icon={Building2} title="Supplier: Hotels" subtitle="ข้อมูลโรงแรม ห้องพัก ราคาอาหาร และราคาตามฤดูกาล" />
        {!adding && <Button onClick={openAddPanel}>+ เพิ่มโรงแรม</Button>}
      </div>

      {adding && (
        <Card className="overflow-hidden mb-5">
          <div className="flex items-center justify-between p-5 pb-4">
            <button onClick={closeAddPanel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft size={16} /> กลับไปหน้ารายการ
            </button>
            <h3 className="font-semibold text-slate-800">
              {draftHotel ? `แก้ไข/เพิ่มข้อมูล: ${draftHotel.name}` : "เพิ่มโรงแรมใหม่"}
            </h3>
            {draftHotel ? (
              <Button onClick={closeAddPanel}>เสร็จสิ้น</Button>
            ) : (
              <span className="w-[88px]" />
            )}
          </div>

          {error && <div className="text-red-600 text-sm px-5 pb-3">{error}</div>}

          <Tabs tabs={ADD_TABS} active={addTab} onChange={goToTab} />

          <div className="p-5">
            {addTab === "details" && (
              <>
              <form onSubmit={saveDetails} className="space-y-3 max-w-2xl">
                <Input label="รหัสโรงแรม (สร้างให้อัตโนมัติ แก้ไขได้)" required value={form.hotelCode} onChange={(e) => setForm({ ...form, hotelCode: e.target.value })} />
                <Input label="ชื่อโรงแรม" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <ImageUploader
                  label="โลโก้/รูปหน้าปกโรงแรม (ใช้เป็นรูปย่อในหน้ารายการ)"
                  value={form.logoUrl}
                  onUploaded={(url) => setForm({ ...form, logoUrl: url })}
                />
                <Input label="ผู้ติดต่อ" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <MultiInputList
                    label="เบอร์โทร"
                    values={form.phones}
                    onChange={(phones) => setForm({ ...form, phones })}
                    max={6}
                    placeholder="0xx-xxxxxxx"
                    type="tel"
                  />
                  <MultiInputList
                    label="อีเมล"
                    values={form.emails}
                    onChange={(emails) => setForm({ ...form, emails })}
                    max={5}
                    placeholder="name@example.com"
                    type="email"
                  />
                </div>
                <Input label="ที่อยู่" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Select label="จังหวัด" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                  <option value="">-- เลือกจังหวัด --</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
                <Input label="เลขประจำตัวผู้เสียภาษี" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
                <StarRatingInput value={form.starRating} onChange={(starRating) => setForm({ ...form, starRating })} />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="ธนาคาร" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                  <Input label="ชื่อบัญชี" value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} />
                  <Input label="เลขบัญชี" value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="วันเริ่มสัญญา" type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
                  <Input label="วันสิ้นสุดสัญญา" type="date" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="submit" disabled={busy}>
                    {draftHotel ? "บันทึกข้อมูล" : "สร้างโรงแรม แล้วไปกรอกแท็บถัดไป"}
                  </Button>
                </div>
              </form>
              {draftHotel && (
                <div className="max-w-2xl">
                  <HotelConditionsSection hotelId={draftHotel.id} conditions={draftHotel.conditions} onChange={reloadDraft} />
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">ไฟล์เอกสารแนบ</p>
                    <AttachmentList entityType="HotelSupplier" entityId={draftHotel.id} />
                  </div>
                </div>
              )}
              </>
            )}

            {addTab === "rooms" && draftHotel && (
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
                      {draftHotel.roomTypes?.map((rt) => (
                        <RoomTypeRow key={rt.id} roomType={rt} onRemove={() => removeRoomType(rt.id)} onChange={reloadDraft} />
                      ))}
                      {draftHotel.roomTypes?.length === 0 && (
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

            {addTab === "seasonal" && draftHotel && (
              <div className="space-y-4">
                {draftHotel.roomTypes?.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีประเภทห้องพัก — เพิ่มที่แท็บ "ห้องพัก" ก่อน</p>}
                {draftHotel.roomTypes?.map((rt, i) => (
                  <SeasonalPricingBlock key={rt.id} roomType={rt} defaultExpanded={i === 0} onChange={reloadDraft} />
                ))}
              </div>
            )}

            {addTab === "meals" && draftHotel && (
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
                      {draftHotel.mealCosts?.map((m) => (
                        <MealCostRow key={m.id} mealCost={m} onRemove={() => removeMealCost(m.id)} onChange={reloadDraft} />
                      ))}
                      {draftHotel.mealCosts?.length === 0 && (
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

            {addTab === "gallery" && draftHotel && (
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {draftHotel.images?.map((img) => (
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
                  {draftHotel.images?.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีรูปภาพ</p>}
                </div>
                <ImageUploader onUploaded={addHotelImage} />
              </div>
            )}
          </div>
        </Card>
      )}

      {!adding && (
        <>
          <div className="flex gap-3 mb-3 flex-wrap">
            <Input placeholder="ค้นหารหัสโรงแรม / ชื่อโรงแรม" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className="max-w-xs">
              <option value="">ทุกจังหวัด</option>
              {THAI_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select value={starFilter} onChange={(e) => setStarFilter(e.target.value)} className="max-w-xs">
              <option value="">ทุกระดับดาว</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ดาว
                </option>
              ))}
            </Select>
            <Select value={amenityFilter} onChange={(e) => setAmenityFilter(e.target.value)} className="max-w-xs">
              <option value="">ทุกสิ่งอำนวยความสะดวก</option>
              {amenityOptions.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.label}
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
                    <th className="text-left px-4 py-2">ชื่อโรงแรม</th>
                    <th className="text-left px-4 py-2">ดาว</th>
                    <th className="text-left px-4 py-2">จังหวัด</th>
                    <th className="text-left px-4 py-2">ห้องพัก</th>
                    <th className="text-right px-4 py-2">ราคา</th>
                    <th className="text-left px-4 py-2">ผู้ติดต่อ</th>
                    <th className="text-left px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setContractSort(contractSort === "asc" ? "desc" : "asc")}
                        className="inline-flex items-center gap-1 hover:text-slate-700"
                        title="เรียงตามวันหมดสัญญา"
                      >
                        สัญญา
                        <ArrowUpDown size={12} className={contractSort ? "text-slate-700" : "text-slate-400"} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">Odoo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((h) => {
                    const thumbUrl = h.logoUrl || h.images?.[0]?.url;
                    const range = roomPriceRange(h.roomTypes);
                    return (
                      <tr
                        key={h.id}
                        onClick={() => navigate(`/suppliers/hotels/${h.id}`)}
                        className="border-t border-slate-100 cursor-pointer hover:bg-blue-50"
                      >
                        <td className="px-4 py-2">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                              <Building2 size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{h.hotelCode}</td>
                        <td className="px-4 py-2">{h.name}</td>
                        <td className="px-4 py-2">
                          <StarRatingDisplay value={h.starRating} size={12} />
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">{h.province || "—"}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{h.roomTypes?.length || 0} ประเภท</td>
                        <td className="px-4 py-2 text-right font-medium">{range || <span className="text-slate-400 font-normal">—</span>}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{h.contactName || "—"}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {h.contractEnd ? (
                            new Date(h.contractEnd).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
                          ) : (
                            <span className="text-slate-300">ยังไม่ตั้งวันหมดสัญญา</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {h.odooId ? <Badge tone="green">Synced #{h.odooId}</Badge> : <Badge>Not synced</Badge>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHotel(h.id);
                            }}
                          >
                            ลบ
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {hotels.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-6 text-center text-slate-400">
                        ยังไม่มีข้อมูลโรงแรม
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
