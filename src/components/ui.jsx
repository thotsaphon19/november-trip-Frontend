import { useState, useEffect } from "react";
import api from "../lib/api";
import { useUndo } from "../lib/undoContext";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** Slices `items` into pages of `pageSize` (default 50). Resets to page 1
 *  whenever the input list reference/length changes (e.g. after a new search). */
export function usePagination(items, pageSize = 50) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items]);

  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    page: safePage,
    setPage,
    totalPages,
    total,
    pageItems,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}

/** "x - y จาก z รายการ" footer with prev/next buttons, matching the
 *  pagination bar style from the reference screenshot. */
export function Pagination({ page, totalPages, total, rangeStart, rangeEnd, onPageChange }) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
      <span>
        {rangeStart} - {rangeEnd} จาก {total} รายการ
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          ก่อนหน้า
        </button>
        <span className="px-2 text-slate-400">
          หน้า {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}

/** Bordered section with an icon + title header - the building block for
 *  the "clear sections, icon per topic" layout used across the app. */
export function SectionCard({ icon: Icon, title, subtitle, action, children, className = "" }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-[var(--nt-primary-light)] to-white">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="shrink-0 w-8 h-8 rounded-lg bg-[var(--nt-primary)] text-white flex items-center justify-center">
              <Icon size={16} strokeWidth={2.25} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function Button({ children, variant = "primary", className = "", style, ...props }) {
  const styles = {
    primary: "text-white",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  const primaryStyle =
    variant === "primary"
      ? {
          backgroundColor: "var(--nt-primary)",
          ...style,
        }
      : style;
  return (
    <button
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${
        variant === "primary" ? "hover:brightness-90" : ""
      } ${className}`}
      style={primaryStyle}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="block text-slate-600 mb-1">{label}</span>}
      <input
        className={`w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--nt-primary)]/40 focus:border-[var(--nt-primary)] transition-colors ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, className = "", children, ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="block text-slate-600 mb-1">{label}</span>}
      <select
        className={`w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--nt-primary)]/40 focus:border-[var(--nt-primary)] transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "text-[var(--nt-primary)]",
  };
  const style = tone === "blue" ? { backgroundColor: "var(--nt-primary-soft)" } : undefined;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`} style={style}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function statusTone(status) {
  return (
    {
      QUOTED: "blue",
      AWAITING_PAYMENT: "amber",
      PARTIALLY_PAID: "amber",
      PAID: "green",
      CANCELLED: "red",
    }[status] || "slate"
  );
}

/** Icon badge + title used at the top of every page for a consistent look. */
export function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: "var(--nt-primary)" }}
          >
            <Icon size={18} strokeWidth={2.25} />
          </span>
        )}
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      </div>
      {subtitle && <p className="text-slate-500 text-sm mt-1 ml-11.5">{subtitle}</p>}
    </div>
  );
}

/** Underline tab bar for switching between sections within one record's
 *  detail page (Hotel Details / Rooms / Cost / Gallery, etc.). Purely
 *  presentational - the caller owns which tab is active and what renders. */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-slate-200 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === tab.id
                ? "border-current text-[var(--nt-primary)]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const statusLabelTH = {
  QUOTED: "เสนอราคา",
  AWAITING_PAYMENT: "รอเก็บเงิน",
  PARTIALLY_PAID: "เก็บเงินแล้วครึ่งหนึ่ง",
  PAID: "เก็บเงินครบแล้ว",
  CANCELLED: "ยกเลิก",
};

/** File-picker that uploads immediately on selection and calls onUploaded
 *  with the resulting { url }. Shows a thumbnail preview once a value is
 *  set. Handles its own busy/error state so callers can drop it in as-is. */
export function ImageUploader({ label, value, onUploaded, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { uploadImage } = await import("../lib/upload");
      const result = await uploadImage(file);
      onUploaded(result.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className={className}>
      {label && <span className="block text-sm text-slate-600 mb-1">{label}</span>}
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
        ) : (
          <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-xs">
            no img
          </div>
        )}
        <label className="text-sm hover:underline cursor-pointer" style={{ color: "var(--nt-primary)" }}>
          {busy ? "กำลังอัปโหลด…" : value ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
        </label>
      </div>
      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
    </div>
  );
}

/** File attachment list for a detail page (contracts, price sheets, any
 *  document beyond a simple image) - reusable on any entity by passing its
 *  entityType/entityId. Handles its own fetch/upload/delete. */
export function AttachmentList({ entityType, entityId }) {
  const { scheduleAction } = useUndo();
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await api.get(`/attachments?entityType=${entityType}&entityId=${entityId}`);
      setFiles(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  async function handleUpload(e) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const token = localStorage.getItem("nt_token");
      const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", entityType);
        formData.append("entityId", entityId);
        const res = await fetch(`${baseURL}/attachments`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `อัปโหลด "${file.name}" ไม่สำเร็จ`);
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function handleDelete(file) {
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    scheduleAction(`ลบไฟล์ "${file.fileName}" แล้ว`, {
      onConfirm: () => api.delete(`/attachments/${file.id}`),
      onUndo: () => load(),
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div>
      <div className="space-y-1 mb-2">
        {files.map((f) => (
          <div key={f.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="hover:underline truncate" style={{ color: "var(--nt-primary)" }}>
              {f.fileName}
            </a>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 text-xs">{formatSize(f.fileSize)}</span>
              <button onClick={() => handleDelete(f)} className="text-red-500 text-xs">
                ลบ
              </button>
            </span>
          </div>
        ))}
        {files.length === 0 && <p className="text-xs text-slate-400">ยังไม่มีไฟล์แนบ</p>}
      </div>
      <label className="text-sm hover:underline cursor-pointer" style={{ color: "var(--nt-primary)" }}>
        {busy ? "กำลังอัปโหลด…" : "+ เพิ่มไฟล์ (เลือกได้หลายไฟล์)"}
        <input type="file" multiple className="hidden" onChange={handleUpload} disabled={busy} />
      </label>
      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
    </div>
  );
}
